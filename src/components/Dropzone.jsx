import { useRef, useState } from 'react'

export default function Dropzone({
  id,
  accept,
  file,
  onFile,
  title,
  hint,
  action,
  busy,
  busyLabel,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (fileList) => {
    const picked = fileList?.[0]
    if (picked) onFile(picked)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        role='button'
        tabIndex={0}
        aria-label={title}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-slate-600 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          type='file'
          accept={accept}
          className='hidden'
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <p className='text-sm font-semibold text-slate-100'>{title}</p>
        <p className='mt-1 text-xs text-slate-400'>{hint}</p>
        {file && !busy ? (
          <p className='mt-3 inline-block rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200'>
            {file.name}
            <span className='ml-2 text-slate-500'>{(file.size / 1024).toFixed(0)} KB</span>
          </p>
        ) : null}
        {busy ? <p className='mt-3 text-xs text-indigo-300'>{busyLabel}</p> : null}
      </div>
      {action ? <div className='mt-3 flex flex-wrap items-center gap-2'>{action}</div> : null}
    </div>
  )
}
