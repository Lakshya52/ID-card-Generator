// Physical card geometry, kept in sync with the arbitrary Tailwind values used in
// `src/components/IdCard.jsx`. These are the pixel equivalents the layout maths
// (A4 landscape page, PDF stage) needs.
//
//   width  87mm  -> 328.8188976377953px @ 96dpi
//   height 57mm  -> 215.43307086614175px @ 96dpi
export const CARD_WIDTH_MM = 87
export const CARD_HEIGHT_MM = 57

export const CARD_WIDTH_PX = 328.8188976377953
export const CARD_HEIGHT_PX = 215.43307086614175

// A4 landscape expressed in CSS pixels at 96dpi, used as the html2canvas stage.
export const PAGE_WIDTH_PX = 1122.5196850393702 // 297mm
export const PAGE_HEIGHT_PX = 793.7007874015748 // 210mm

export const PAGE_WIDTH_MM = 297
export const PAGE_HEIGHT_MM = 210

export const DPI_OPTIONS = [150, 200, 300]
export const DEFAULT_DPI = 300
