import Dropzone from './Dropzone'
import { downloadTemplate } from '../lib/excel'

function WarningList({ warnings }) {
  if (!warnings.length) return null
  return (
    <details className='rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3'>
      <summary className='cursor-pointer text-sm font-medium text-amber-300'>
        {warnings.length} row{warnings.length > 1 ? 's' : ''} were skipped
      </summary>
      <ul className='mt-2 max-h-40 space-y-1 overflow-auto text-xs text-amber-200/80'>
        {warnings.map((w, i) => (
          <li key={i}>{w.message}</li>
        ))}
      </ul>
    </details>
  )
}

export default function StepExcel({ state, onParsed, onClear }) {
  const { excelFile, students, excelInfo } = state

  return (
    <div className='space-y-5'>
      <Dropzone
        id='excel-input'
        accept='.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        file={excelFile}
        onFile={onParsed}
        title={excelFile ? 'Replace the spreadsheet' : 'Upload the student spreadsheet'}
        hint='.xlsx, .xls or .csv - one student per row'
        action={
          <button
            type='button'
            onClick={downloadTemplate}
            className='rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20'
          >
            Download Excel template
          </button>
        }
      />

      {excelInfo?.error ? (
        <div className='rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
          {excelInfo.error}
        </div>
      ) : null}

      {excelInfo?.missingColumns?.length ? (
        <div className='rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
          <p className='font-semibold'>Required column(s) not found:</p>
          <p className='mt-1 text-red-200/80'>{excelInfo.missingColumns.join(', ')}</p>
        </div>
      ) : null}

      {students.length ? (
        <div className='rounded-2xl border border-slate-700 bg-slate-900/50'>
          <div className='flex items-center justify-between border-b border-slate-700 px-4 py-3'>
            <div>
              <p className='text-sm font-semibold text-slate-100'>
                {students.length} student{students.length > 1 ? 's' : ''} ready
              </p>
              <p className='text-xs text-slate-400'>
                Sheet: {excelInfo.sheetName} · file: {excelFile?.name}
              </p>
            </div>
            <button
              type='button'
              onClick={onClear}
              className='rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-red-500/60 hover:text-red-300'
            >
              Clear
            </button>
          </div>
          <div className='max-h-80 overflow-auto'>
            <table className='w-full text-left text-xs'>
              <thead className='sticky top-0 bg-slate-800 text-slate-300'>
                <tr>
                  <th className='px-3 py-2 font-medium'>#</th>
                  <th className='px-3 py-2 font-medium'>Name</th>
                  <th className='px-3 py-2 font-medium'>Enrollment No.</th>
                  <th className='px-3 py-2 font-medium'>DOB</th>
                  <th className='px-3 py-2 font-medium'>Course</th>
                  <th className='px-3 py-2 font-medium'>Batch</th>
                  <th className='px-3 py-2' />
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.key} className='border-t border-slate-800 text-slate-200'>
                    <td className='px-3 py-1.5 text-slate-500'>{i + 1}</td>
                    <td className='px-3 py-1.5'>{s.name}</td>
                    <td className='px-3 py-1.5 font-mono text-[11px]'>{s.enrollmentNo}</td>
                    <td className='px-3 py-1.5'>{s.dob}</td>
                    <td className='px-3 py-1.5'>{s.course}</td>
                    <td className='px-3 py-1.5'>{s.batch}</td>
                    <td className='px-3 py-1.5 text-right'>
                      <button
                        type='button'
                        onClick={() => onClear(s.key)}
                        className='text-slate-500 transition hover:text-red-400'
                        aria-label={`Remove ${s.name}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <WarningList warnings={excelInfo?.warnings || []} />
    </div>
  )
}
