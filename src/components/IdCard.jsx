import { DIRECTOR_SIGN_SRC, LOGO_SRC, TRANSPARENT_PIXEL } from '../lib/assets'

/**
 * The ID card itself. The class names and pixel dimensions are a 1:1 copy of the
 * original design in App.jsx - do not change the sizing utilities here without
 * also updating CARD_WIDTH_PX / CARD_HEIGHT_PX in `src/lib/card.js`.
 */
export default function IdCard({ student, photoSrc = '', signatureSrc = '' }) {
  const { name, dob, course, enrollmentNo, address, batch } = student

  return (
    <div className='text-black max-h-[215.43307086614175px] h-[215.43307086614175px] max-w-[328.8188976377953px] w-[328.8188976377953px] border border-black bg-white flex flex-col mx-auto my-auto'>
      {/* top */}
      <div className="h-1/3 border-b-2 border-red-500 w-full flex items-center justify-between px-[4px]">
        {/* The logo is 57.6x46.8 but the header slot is 64.2x71.8. h-full would
            stretch it to fill the box and squash it on the x axis, so pin the
            width and let the height follow the logo's own ratio. */}
        <img src={LOGO_SRC} alt='' className='w-1/5 h-auto max-h-full object-contain' />
        <div className='flex flex-col items-center justify-center h-full w-4/5'>
          {/* arial black */}
          <h1 className='text-center text-[#2e3092] text-[10px] font-arial-black'>
            BANARSIDAS CHANDIWALA <br /> INSTITUTE OF INFORMATION TECHNOLOGY
          </h1>
          {/* arial bold */}
          <p className='text-center font-bold text-red-500 text-[8px] font-arial-bold'>
            Affilated to the GGS Indraprastha University, Delhi <br /> (Approved by AICET, Ministry of
            HRD, Govt. of India)
          </p>
        </div>
      </div>

      <div className="h-2/3 flex flex-col gap-[10px]">
        <div className='flex flex-1 min-h-0 gap-[8px] px-[6px] pt-[4px]'>
          {photoSrc ? (
            <img src={photoSrc} alt='' className='w-[80px] h-full object-cover border border-black' />
          ) : (
            <div className='w-[80px] h-full border border-black bg-neutral-200' />
          )}
          {/* arial bold */}
          <table className='font-arial flex-1 text-[9px] gap-0 -leading-[0.95]'>
            <tbody>
              <tr>
                <td className=''>Name</td>
                <td className='w-[10px]'>:</td>
                <td className=''>{name}</td>
              </tr>
              <tr>
                <td className=''>Date of Birth</td>
                <td className=''>:</td>
                <td className=''>{dob}</td>
              </tr>
              <tr>
                <td className=''>Course</td>
                <td className=''>:</td>
                <td className=''>
                  <div className='flex justify-between'>
                    <span>{course}</span>
                    <span className='whitespace-nowrap'>
                      Batch<span className='mx-[3px]'>:</span>
                      {batch}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className=''>Enrollment No.</td>
                <td className=''>:</td>
                <td className=''>{enrollmentNo}</td>
              </tr>
              <tr>
                <td className=''>Res. Address</td>
                <td className=''>:</td>
                <td className=''>{address}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-[6px] pt-[2px] pb-[3px]">
          {/* BeaufortforLOL-Bold */}
          <div className='font-beaufort-bold flex flex-col items-center w-[80px]'>
            <img
              src={signatureSrc || TRANSPARENT_PIXEL}
              alt=''
              className='h-[20px] w-full object-contain'
            />
            <p className='text-[9px] leading-none'>Student</p>
          </div>
          {/* CIA Code 39 Medium Text */}
          <div className='font-cia-code-39 text-[9px]'>{enrollmentNo}</div>
          {/* BeaufortforLOL-Bold */}
          <div className='font-beaufort-bold flex flex-col items-center w-[88px]'>
            <img src={DIRECTOR_SIGN_SRC} alt='' className='h-[20px] w-full object-contain' />
            <p className='text-[9px] leading-none'>Director</p>
          </div>
        </div>
      </div>
    </div>
  )
}
