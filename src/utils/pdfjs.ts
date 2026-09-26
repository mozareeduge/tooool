import { pdfjs } from 'react-pdf'
import pdfWorkerUrl from '../pdf-worker.ts?worker&url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const pdfjsAssetBase = `${import.meta.env.BASE_URL}pdfjs/`

/** Shared by the on-screen viewer and the black & white converter. */
export const documentOptions = {
  cMapUrl: `${pdfjsAssetBase}cmaps/`,
  wasmUrl: `${pdfjsAssetBase}wasm/`,
  standardFontDataUrl: `${pdfjsAssetBase}standard_fonts/`,
}

export { pdfjs }
