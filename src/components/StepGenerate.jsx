import { DPI_OPTIONS } from '../lib/card'

export default function StepGenerate({
  students,
  photoCount,
  signatureCount,
  missingPhotos,
  missingSignatures,
  duplicates,
  dpi,
  onDpiChange,
  onGenerate,
  onCancel,
  progress,
  isGenerating,
}) {
  const ready = students.length > 0 && missingPhotos.length === 0 && !isGenerating

  return (
    <div className='space-y-5'>
      <dl className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {[
          ['Students', students.length],
          ['Photos', `${photoCount} / ${students.length}`],
          ['Signatures', `${signatureCount} / ${students.length}`],
          ['Pages', students.length],
        ].map(([label, value]) => (
          <div key={label} className='rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3'>
            <dt className='text-[11px] uppercase tracking-wide text-slate-500'>{label}</dt>
            <dd className='mt-1 text-lg font-semibold text-slate-100'>{value}</dd>
          </div>
        ))}
      </dl>

      {missingPhotos.length ? (
        <div className='rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3'>
          <p className='text-sm font-semibold text-red-200'>
            {missingPhotos.length} photo{missingPhotos.length > 1 ? 's are' : ' is'} missing — generation
            is blocked.
          </p>
          <p className='mt-1 text-xs text-red-200/70'>
            Go back to step 2 and assign an image to each of these enrollment numbers.
          </p>
          <ul className='mt-3 max-h-40 space-y-1 overflow-auto text-xs text-red-100/90'>
            {missingPhotos.map((s) => (
              <li key={s.key} className='font-mono'>
                {s.enrollmentNo}
                <span className='ml-2 font-sans text-red-200/60'>{s.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200'>
          Every student has a photo. Ready to generate.
        </div>
      )}

      {missingSignatures.length ? (
        <div className='rounded-xl border border-slate-600 bg-slate-800/40 px-4 py-3 text-xs text-slate-300'>
          <span className='font-semibold text-slate-200'>
            {missingSignatures.length} signature{missingSignatures.length > 1 ? 's' : ''} missing.
          </span>{' '}
          Signatures are optional — those cards will print with an empty signature slot.
        </div>
      ) : null}

      {duplicates.length ? (
        <div className='rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90'>
          {duplicates.length} enrollment number(s) had more than one image assigned. The first image
          in the ZIP wins: {duplicates.slice(0, 6).join(', ')}
          {duplicates.length > 6 ? '…' : ''}
        </div>
      ) : null}

      <div className='rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-4'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='text-sm font-semibold text-slate-100'>Output</p>
            <p className='text-xs text-slate-400'>
              A4 landscape (297 × 210 mm) · one ID card per page · print quality
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-slate-400'>Resolution</span>
            <select
              value={dpi}
              onChange={(e) => onDpiChange(Number(e.target.value))}
              disabled={isGenerating}
              className='rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-100 outline-none focus:border-indigo-400'
            >
              {DPI_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} DPI
                </option>
              ))}
            </select>
          </div>
        </div>

        {progress ? (
          <div className='mt-4'>
            <div className='flex justify-between text-xs text-slate-400'>
              <span>
                Printing card {progress.done} of {progress.total}
              </span>
              <span>{Math.round((progress.done / progress.total) * 100)}%</span>
            </div>
            <div className='mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800'>
              <div
                className='h-full rounded-full bg-indigo-500 transition-[width] duration-150'
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className='mt-4 flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={onGenerate}
            disabled={!ready}
            className='rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500'
          >
            {isGenerating ? 'Generating…' : 'Generate PDF'}
          </button>
          {isGenerating ? (
            <button
              type='button'
              onClick={onCancel}
              className='rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-500/60 hover:text-red-300'
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
