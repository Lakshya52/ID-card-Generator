import { useCallback, useMemo, useRef, useState } from 'react'

import CardStage from './components/CardStage'
import IdCard from './components/IdCard'
import StepExcel from './components/StepExcel'
import StepGenerate from './components/StepGenerate'
import StepImages from './components/StepImages'
import { DEFAULT_DPI } from './lib/card'
import { LOGO_SRC } from './lib/assets'
import { buildEnrollmentIndex, resolveEnrollment } from './lib/enrollment'
import { downloadTemplate, readWorkbook } from './lib/excel'
import { generateIdCardsPdf } from './lib/pdf'
import { readImageZip } from './lib/zipImages'

const STEPS = [
  { id: 1, label: 'Spreadsheet' },
  { id: 2, label: 'Photos' },
  { id: 3, label: 'Signatures' },
  { id: 4, label: 'Generate' },
]

const emptyZipInfo = { file: null, error: '', failed: [] }

/** enrollment (upper-cased) -> first image assigned to it */
function buildLookup(images, assignments, enrollmentIndex) {
  const map = new Map()
  for (const image of images) {
    const resolved = resolveEnrollment(enrollmentIndex, assignments[image.id])
    if (resolved && !map.has(resolved.toUpperCase())) map.set(resolved.toUpperCase(), image.src)
  }
  return map
}

/** enrollment numbers that more than one image is pointing at */
function findDuplicates(images, assignments, enrollmentIndex) {
  const counts = new Map()
  for (const image of images) {
    const resolved = resolveEnrollment(enrollmentIndex, assignments[image.id])
    if (resolved) {
      const key = resolved.toUpperCase()
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key)
}

function useZipImages() {
  const [images, setImages] = useState([])
  const [assignments, setAssignments] = useState({})
  const [info, setInfo] = useState(emptyZipInfo)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const load = useCallback(async (file) => {
    setBusy(true)
    setInfo({ file, error: '', failed: [] })
    setProgress({ done: 0, total: 0 })
    try {
      const result = await readImageZip(file, (done, total) => setProgress({ done, total }))
      setImages(result.images)
      setInfo({ file, error: '', failed: result.failed })
      // pre-fill every field with the file's own name, so a correctly named
      // ZIP is already mapped and only the odd files need editing
      setAssignments(Object.fromEntries(result.images.map((img) => [img.id, img.suggestedEnrollmentNo])))
    } catch (error) {
      setImages([])
      setInfo({
        file,
        error: error instanceof Error ? error.message : 'Could not read that ZIP file.',
        failed: [],
      })
    } finally {
      setBusy(false)
    }
  }, [])

  const clear = useCallback(() => {
    setImages([])
    setAssignments({})
    setInfo(emptyZipInfo)
    setProgress({ done: 0, total: 0 })
  }, [])

  const assign = useCallback((imageId, value) => {
    setAssignments((prev) => ({ ...prev, [imageId]: value }))
  }, [])

  const autoMatch = useCallback(
    (enrollmentIndex) => {
      setAssignments((prev) => {
        const next = { ...prev }
        // claim any enrollment number a previous image already holds
        const taken = new Set()
        for (const value of Object.values(next)) {
          const resolved = resolveEnrollment(enrollmentIndex, value)
          if (resolved) taken.add(resolved.toUpperCase())
        }

        for (const image of images) {
          // never overwrite a value the user typed by hand
          if (String(next[image.id] || '').trim()) continue

          const resolved = resolveEnrollment(enrollmentIndex, image.suggestedEnrollmentNo)
          if (!resolved) continue

          const key = resolved.toUpperCase()
          if (taken.has(key)) continue

          next[image.id] = resolved
          taken.add(key)
        }
        return next
      })
    },
    [images],
  )

  const clearAssignments = useCallback(() => setAssignments({}), [])

  const resetToFilenames = useCallback(() => {
    setAssignments(Object.fromEntries(images.map((img) => [img.id, img.suggestedEnrollmentNo])))
  }, [images])

  return {
    images,
    assignments,
    info,
    busy,
    progress,
    load,
    clear,
    assign,
    autoMatch,
    clearAssignments,
    resetToFilenames,
  }
}

export default function App() {
  const [step, setStep] = useState(1)

  const [excelFile, setExcelFile] = useState(null)
  const [students, setStudents] = useState([])
  const [excelInfo, setExcelInfo] = useState({ sheetName: '', warnings: [], missingColumns: [], error: '' })

  const photos = useZipImages()
  const signatures = useZipImages()

  const [selectedKey, setSelectedKey] = useState(null)
  const [dpi, setDpi] = useState(DEFAULT_DPI)
  const [progress, setProgress] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfError, setPdfError] = useState('')

  // the card currently mounted in the off-screen html2canvas stage
  const [stageStudent, setStageStudent] = useState(null)
  const stageRef = useRef(null)
  const cancelRef = useRef(false)

  /* ---------------------------------------------------------------- */
  /* Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const enrollmentIndex = useMemo(() => buildEnrollmentIndex(students), [students])

  const photosByEnrollment = useMemo(
    () => buildLookup(photos.images, photos.assignments, enrollmentIndex),
    [photos.images, photos.assignments, enrollmentIndex],
  )

  const signaturesByEnrollment = useMemo(
    () => buildLookup(signatures.images, signatures.assignments, enrollmentIndex),
    [signatures.images, signatures.assignments, enrollmentIndex],
  )

  const missingPhotos = useMemo(
    () => students.filter((s) => !photosByEnrollment.has(s.enrollmentNo.toUpperCase())),
    [students, photosByEnrollment],
  )

  const missingSignatures = useMemo(
    () => students.filter((s) => !signaturesByEnrollment.has(s.enrollmentNo.toUpperCase())),
    [students, signaturesByEnrollment],
  )

  const duplicatePhotos = useMemo(
    () => findDuplicates(photos.images, photos.assignments, enrollmentIndex),
    [photos.images, photos.assignments, enrollmentIndex],
  )

  const duplicateSignatures = useMemo(
    () => findDuplicates(signatures.images, signatures.assignments, enrollmentIndex),
    [signatures.images, signatures.assignments, enrollmentIndex],
  )

  const selectedStudent = useMemo(() => {
    if (students.length === 0) return null
    return students.find((s) => s.key === selectedKey) || students[0]
  }, [students, selectedKey])

  /* ---------------------------------------------------------------- */
  /* Step 1 - spreadsheet                                             */
  /* ---------------------------------------------------------------- */

  const handleExcel = useCallback(async (file) => {
    setExcelFile(file)
    setPdfError('')
    try {
      const buffer = await file.arrayBuffer()
      const result = readWorkbook(buffer)
      setStudents(result.students)
      setExcelInfo({
        sheetName: result.sheetName,
        warnings: result.warnings,
        missingColumns: result.missingColumns,
        error:
          !result.missingColumns.length && result.students.length === 0
            ? 'No student rows were found below the header. Fill in the rows and upload again.'
            : '',
      })
    } catch (error) {
      setStudents([])
      setExcelInfo({
        sheetName: '',
        warnings: [],
        missingColumns: [],
        error: error instanceof Error ? error.message : 'Could not read that file.',
      })
    }
  }, [])

  const removeStudent = useCallback((key) => {
    if (key === undefined) {
      setStudents([])
      setExcelFile(null)
      setExcelInfo({ sheetName: '', warnings: [], missingColumns: [], error: '' })
      return
    }
    setStudents((prev) => prev.filter((s) => s.key !== key))
  }, [])

  /* ---------------------------------------------------------------- */
  /* Step 4 - PDF                                                     */
  /* ---------------------------------------------------------------- */

  const renderStudentIntoStage = useCallback(
    (index) =>
      new Promise((resolve, reject) => {
        const target = students[index]
        if (!target) {
          reject(new Error('Out of range'))
          return
        }
        setStageStudent(target)

        const started = performance.now()
        const tick = () => {
          if (cancelRef.current) {
            reject(new Error('cancelled'))
            return
          }
          if (stageRef.current?.dataset.enrollment === target.enrollmentNo) {
            resolve()
            return
          }
          if (performance.now() - started > 15000) {
            reject(new Error('Timed out while rendering the card.'))
            return
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    [students],
  )

  const handleGenerate = useCallback(async () => {
    if (!students.length) return
    cancelRef.current = false
    setIsGenerating(true)
    setPdfError('')
    setProgress({ done: 0, total: students.length })

    try {
      await generateIdCardsPdf({
        students,
        stage: stageRef.current,
        renderStudent: renderStudentIntoStage,
        dpi,
        fileName: 'student-id-cards.pdf',
        onProgress: (done, total) => setProgress({ done, total }),
        shouldCancel: () => cancelRef.current,
      })
    } catch (error) {
      setPdfError(
        cancelRef.current
          ? 'Generation cancelled.'
          : error instanceof Error
            ? error.message
            : 'PDF generation failed.',
      )
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }, [students, dpi, renderStudentIntoStage])

  const cancelGenerate = useCallback(() => {
    cancelRef.current = true
  }, [])

  /* ---------------------------------------------------------------- */
  /* Navigation                                                       */
  /* ---------------------------------------------------------------- */

  const canLeaveExcel = students.length > 0 && excelInfo.missingColumns.length === 0 && !excelInfo.error

  const photoStepProps = {
    students,
    onSelectStudent: (s) => setSelectedKey(s.key),
    ...photos,
    onZip: photos.load,
    onClearZip: photos.clear,
    onAssign: photos.assign,
    onClearAssignments: photos.clearAssignments,
    onResetToFilenames: photos.resetToFilenames,
  }

  const signatureStepProps = {
    students,
    onSelectStudent: (s) => setSelectedKey(s.key),
    ...signatures,
    onZip: signatures.load,
    onClearZip: signatures.clear,
    onAssign: signatures.assign,
    onClearAssignments: signatures.clearAssignments,
    onResetToFilenames: signatures.resetToFilenames,
  }

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100'>
      <CardStage
        stageRef={stageRef}
        student={stageStudent}
        photoSrc={stageStudent ? photosByEnrollment.get(stageStudent.enrollmentNo.toUpperCase()) : ''}
        signatureSrc={stageStudent ? signaturesByEnrollment.get(stageStudent.enrollmentNo.toUpperCase()) : ''}
      />

      <div className='mx-auto max-w-6xl px-4 py-8 sm:px-6'>
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <img src={LOGO_SRC} alt='' className='h-12 w-auto' />
            <div>
              <h1 className='text-xl font-bold text-white'>Student ID Card Generator</h1>
              <p className='text-sm text-slate-400'>
                Banarsidas Chandiwala Institute of Information Technology
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={downloadTemplate}
            className='rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20'
          >
            Download Excel template
          </button>
        </header>

        <nav className='mt-8 flex flex-wrap items-center gap-2' aria-label='Progress'>
          {STEPS.map((s) => {
            const active = step === s.id
            const done = step > s.id
            return (
              <button
                key={s.id}
                type='button'
                onClick={() => s.id < step && setStep(s.id)}
                disabled={s.id > step}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-indigo-500 text-white'
                    : done
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-900 text-slate-500'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    active ? 'bg-white/20' : done ? 'bg-emerald-500 text-white' : 'bg-slate-800'
                  }`}
                >
                  {done ? '✓' : s.id}
                </span>
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className='mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]'>
          <div className='min-w-0'>
            {step === 1 ? (
              <StepExcel
                state={{ excelFile, students, excelInfo }}
                onParsed={handleExcel}
                onClear={removeStudent}
              />
            ) : null}

            {step === 2 ? (
              <StepImages
                heading='Step 2 of 4 — student photographs'
                dropTitle='Upload a ZIP of student photos'
                dropHint='Any .zip — sub-folders and non-image files are ignored'
                footnote={
                  <>
                    Type (or pick) the enrollment number for each photo. If a photo is named after
                    the enrollment number, <span className='text-slate-300'>Auto-match by filename</span>{' '}
                    fills it in. Every student needs a photo or the PDF cannot be generated.
                  </>
                }
                onAutoMatch={() => photos.autoMatch(enrollmentIndex)}
                {...photoStepProps}
              />
            ) : null}

            {step === 3 ? (
              <StepImages
                heading='Step 3 of 4 — student signatures'
                dropTitle='Upload a ZIP of student signatures'
                dropHint='Any .zip — name each file after the student’s enrollment number'
                footnote={
                  <>
                    Same mapping as the photos: name each file after the enrollment number, or type
                    it in. <span className='text-slate-300'>Signatures are optional</span> — any
                    student without one still gets a card, just with an empty signature slot.
                  </>
                }
                onAutoMatch={() => signatures.autoMatch(enrollmentIndex)}
                {...signatureStepProps}
              />
            ) : null}

            {step === 4 ? (
              <StepGenerate
                students={students}
                photoCount={photosByEnrollment.size}
                signatureCount={signaturesByEnrollment.size}
                missingPhotos={missingPhotos}
                missingSignatures={missingSignatures}
                duplicates={[...duplicatePhotos, ...duplicateSignatures]}
                dpi={dpi}
                onDpiChange={setDpi}
                onGenerate={handleGenerate}
                onCancel={cancelGenerate}
                progress={progress}
                isGenerating={isGenerating}
              />
            ) : null}

            {pdfError ? (
              <div className='mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
                {pdfError}
              </div>
            ) : null}

            <div className='mt-6 flex items-center gap-2'>
              {step > 1 ? (
                <button
                  type='button'
                  onClick={() => setStep((s) => s - 1)}
                  disabled={isGenerating}
                  className='rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 disabled:opacity-40'
                >
                  Back
                </button>
              ) : null}
              {step < STEPS.length ? (
                <button
                  type='button'
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 1 && !canLeaveExcel}
                  className='rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500'
                >
                  Continue
                </button>
              ) : null}
              {step === 1 && !canLeaveExcel ? (
                <span className='text-xs text-slate-500'>Upload a valid spreadsheet to continue.</span>
              ) : null}
            </div>
          </div>

          <aside className='lg:w-[23rem]'>
            <div className='lg:sticky lg:top-6'>
              <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'>
                Live preview
              </p>
              <div className='overflow-hidden rounded-2xl border border-slate-700 bg-white p-4'>
                {selectedStudent ? (
                  <IdCard
                    student={selectedStudent}
                    photoSrc={photosByEnrollment.get(selectedStudent.enrollmentNo.toUpperCase()) || ''}
                    signatureSrc={signaturesByEnrollment.get(selectedStudent.enrollmentNo.toUpperCase()) || ''}
                  />
                ) : (
                  <div
                    className='flex items-center justify-center text-xs text-slate-400'
                    style={{ width: 328.8188976377953, height: 215.43307086614175 }}
                  >
                    Upload a spreadsheet to preview cards
                  </div>
                )}
              </div>

              {students.length > 1 && selectedStudent ? (
                <div className='mt-3 flex items-center gap-2'>
                  <select
                    value={selectedStudent.key}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className='min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-400'
                  >
                    {students.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.enrollmentNo} — {s.name}
                      </option>
                    ))}
                  </select>
                  <span className='shrink-0 text-xs text-slate-500'>
                    {students.indexOf(selectedStudent) + 1}/{students.length}
                  </span>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
