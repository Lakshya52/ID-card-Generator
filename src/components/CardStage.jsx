import IdCard from './IdCard'
import { PAGE_HEIGHT_PX, PAGE_WIDTH_PX } from '../lib/card'

/**
 * Fixed at the viewport origin and painted behind the app shell (z-index -1), so
 * html2canvas sees a clean 0,0 origin instead of negative bounds. Never shown to
 * the user, only used as the html2canvas capture surface.
 */
export default function CardStage({ stageRef, student, photoSrc, signatureSrc }) {
  return (
    <div
      aria-hidden='true'
      className='pointer-events-none fixed top-0 left-0 z-[-1] overflow-hidden bg-white'
      style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}
    >
      <div
        ref={stageRef}
        data-enrollment={student?.enrollmentNo || ''}
        className='flex w-full items-center justify-center bg-white'
        style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}
      >
        {student ? (
          <IdCard student={student} photoSrc={photoSrc} signatureSrc={signatureSrc} />
        ) : null}
      </div>
    </div>
  )
}
