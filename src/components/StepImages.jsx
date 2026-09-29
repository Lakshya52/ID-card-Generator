import { useMemo, useState } from 'react'

import Dropzone from './Dropzone'
import { buildEnrollmentIndex, resolveEnrollment } from '../lib/enrollment'

function StatusPill({ status }) {
  if (status === 'matched') {
    return (
      <span className='rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300'>
        matched
      </span>
    )
  }
  if (status === 'duplicate') {
    return (
      <span className='rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300'>
        duplicate
      </span>
    )
  }
  if (status === 'unknown') {
    return (
      <span className='rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300'>
        not in sheet
      </span>
    )
  }
  return (
    <span className='rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300'>
      unassigned
    </span>
  )
}

/** matched / unassigned / duplicate / not-in-sheet, for one tile */
function statusOf(image, assignment, enrollmentIndex, firstByKey) {
  if (!String(assignment || '').trim()) return 'unassigned'
  const resolved = resolveEnrollment(enrollmentIndex, assignment)
  if (!resolved) return 'unknown'
  if (firstByKey.get(resolved.toUpperCase()) !== image.id) return 'duplicate'
  return 'matched'
}

function Tile({ image, assignment, status, onAssign, onPreview, listId }) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-slate-900/60 transition ${
        {
          matched: 'border-emerald-500/50',
          unassigned: 'border-slate-700',
          duplicate: 'border-amber-500/50',
          unknown: 'border-rose-500/50',
        }[status]
      }`}
    >
      <button
        type='button'
        onClick={onPreview}
        title={image.path}
        className='group relative block h-32 w-full overflow-hidden bg-slate-800'
      >
        <img src={image.src} alt={image.name} loading='lazy' className='h-full w-full object-cover' />
      </button>

      <div className='space-y-2 p-2'>
        <p className='truncate font-mono text-[10px] text-slate-400' title={image.name}>
          {image.name}
        </p>
        <input
          list={listId}
          value={assignment}
          spellCheck={false}
          autoComplete='off'
          placeholder='Enrollment No.'
          onChange={(e) => onAssign(e.target.value)}
          className={`w-full rounded-md border bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:ring-1 ${
            status === 'matched'
              ? 'border-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-400/50'
              : status === 'unassigned'
                ? 'border-slate-600 focus:border-indigo-400 focus:ring-indigo-400/50'
                : 'border-amber-500/60 focus:border-amber-400 focus:ring-amber-400/50'
          }`}
        />
        <StatusPill status={status} />
      </div>
    </div>
  )
}

const LIST_ID = 'enrollment-number-list'

/**
 * One "upload a ZIP and map every image to an enrollment number" step. Used
 * twice: once for the portraits and once for the signatures.
 */
export default function StepImages({
  heading,
  dropTitle,
  dropHint,
  images,
  assignments,
  info,
  busy,
  progress,
  students,
  onZip,
  onClearZip,
  onAssign,
  onAutoMatch,
  onClearAssignments,
  onResetToFilenames,
  onSelectStudent,
  footnote,
}) {
  const [filter, setFilter] = useState('all')

  const enrollmentIndex = useMemo(() => buildEnrollmentIndex(students), [students])

  const firstByKey = useMemo(() => {
    const first = new Map()
    for (const image of images) {
      const resolved = resolveEnrollment(enrollmentIndex, assignments[image.id])
      if (resolved) {
        const key = resolved.toUpperCase()
        if (!first.has(key)) first.set(key, image.id)
      }
    }
    return first
  }, [images, assignments, enrollmentIndex])

  const withStatus = useMemo(
    () =>
      images.map((image) => ({
        image,
        status: statusOf(image, assignments[image.id], enrollmentIndex, firstByKey),
      })),
    [images, assignments, enrollmentIndex, firstByKey],
  )

  const counts = useMemo(() => {
    const c = { matched: 0, duplicate: 0, unknown: 0, unassigned: 0 }
    for (const item of withStatus) c[item.status] += 1
    return c
  }, [withStatus])

  const visible = useMemo(() => {
    if (filter === 'all') return withStatus
    if (filter === 'matched') return withStatus.filter((i) => i.status === 'matched')
    if (filter === 'problems') return withStatus.filter((i) => i.status === 'duplicate' || i.status === 'unknown')
    return withStatus.filter((i) => i.status === 'unassigned')
  }, [withStatus, filter])

  return (
    <div className='space-y-5'>
      <div>
        <h2 className='text-sm font-semibold text-slate-100'>{heading}</h2>
      </div>

      <Dropzone
        id={`${dropTitle}-zip`}
        accept='.zip,application/zip,application/x-zip-compressed'
        file={info?.file}
        onFile={onZip}
        busy={busy}
        busyLabel={`Reading images… ${progress.done} / ${progress.total}`}
        title={dropTitle}
        hint={dropHint}
        action={
          info ? (
            <button
              type='button'
              onClick={onClearZip}
              className='rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-red-500/60 hover:text-red-300'
            >
              Remove ZIP
            </button>
          ) : null
        }
      />

      {info?.error ? (
        <div className='rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
          {info.error}
        </div>
      ) : null}

      {info?.failed?.length ? (
        <div className='rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90'>
          {info.failed.length} file(s) could not be read and were skipped:{' '}
          {info.failed.slice(0, 5).join(', ')}
          {info.failed.length > 5 ? '…' : ''}
        </div>
      ) : null}

      {images.length ? (
        <>
          <datalist id={LIST_ID}>
            {students.map((s) => (
              <option key={s.key} value={s.enrollmentNo}>
                {s.name}
              </option>
            ))}
          </datalist>

          <div className='rounded-2xl border border-slate-700 bg-slate-900/50'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3'>
              <div>
                <p className='text-sm font-semibold text-slate-100'>
                  {images.length} image{images.length > 1 ? 's' : ''} · {counts.matched} matched
                </p>
                <p className='text-xs text-slate-400'>
                  {counts.matched === images.length && images.length > 0 ? (
                    <span className='text-emerald-400'>
                      Every file is named after a student. Correct anything that needs it.
                    </span>
                  ) : (
                    <>
                      {counts.unassigned} unassigned · {counts.duplicate} duplicate · {counts.unknown}{' '}
                      not in the spreadsheet
                    </>
                  )}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={onAutoMatch}
                  title='Reads each file name and assigns the matching enrollment number'
                  className='rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400'
                >
                  Auto-match by filename
                </button>
                <button
                  type='button'
                  onClick={onResetToFilenames}
                  title='Put each file name back in its field'
                  className='rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500'
                >
                  Reset to file names
                </button>
                <button
                  type='button'
                  onClick={onClearAssignments}
                  className='rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500'
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className='flex flex-wrap gap-1.5 border-b border-slate-800 px-4 py-2'>
              {[
                ['all', `All (${images.length})`],
                ['unassigned', `Unassigned (${counts.unassigned})`],
                ['matched', `Matched (${counts.matched})`],
                ['problems', `Problems (${counts.duplicate + counts.unknown})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    filter === key
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className='grid max-h-[30rem] grid-cols-2 gap-3 overflow-auto p-4 sm:grid-cols-3 lg:grid-cols-4'>
              {visible.map(({ image, status }) => (
                <Tile
                  key={image.id}
                  image={image}
                  listId={LIST_ID}
                  status={status}
                  assignment={assignments[image.id] || ''}
                  onAssign={(value) => onAssign(image.id, value)}
                  onPreview={() => {
                    const resolved = resolveEnrollment(enrollmentIndex, assignments[image.id])
                    if (!resolved) return
                    const match = students.find(
                      (s) => s.enrollmentNo.toUpperCase() === resolved.toUpperCase(),
                    )
                    if (match) onSelectStudent(match)
                  }}
                />
              ))}
            </div>
          </div>

          {footnote ? <p className='text-xs leading-relaxed text-slate-500'>{footnote}</p> : null}
        </>
      ) : null}
    </div>
  )
}
