import {
  concatTransformationMatrix,
  drawObject,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
} from 'pdf-lib'
import { documentOptions, pdfjs } from './pdfjs'

/** Print-quality resolution: crisp text, sensible file size. */
const DPI = 200
const MAX_PIXELS = 5000 * 5000

/**
 * Makes a black & white (grayscale) copy of a PDF, the way "print to
 * grayscale" does: every page (with any stamps/signatures already on it) is
 * rendered and stored as a single-channel DeviceGray image, so no colour can
 * survive anywhere. Page sizes and on-screen orientation are kept.
 */
export async function convertToGrayscale(
  pdfBytes: Uint8Array,
  onProgress?: (page: number, total: number) => void,
): Promise<Uint8Array> {
  const loading = pdfjs.getDocument({ ...documentOptions, data: pdfBytes.slice() })
  try {
    const source = await loading.promise
    const output = await PDFDocument.create()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas 2D is unavailable in this browser.')

    for (let number = 1; number <= source.numPages; number += 1) {
      onProgress?.(number, source.numPages)
      const page = await source.getPage(number)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(DPI / 72, Math.sqrt(MAX_PIXELS / (base.width * base.height)))
      const viewport = page.getViewport({ scale })
      const width = Math.max(1, Math.floor(viewport.width))
      const height = Math.max(1, Math.floor(viewport.height))

      canvas.width = width
      canvas.height = height
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      await page.render({
        canvas,
        canvasContext: context,
        viewport,
        intent: 'print',
        annotationMode: pdfjs.AnnotationMode.ENABLE_STORAGE,
      }).promise
      page.cleanup()

      const rgba = context.getImageData(0, 0, width, height).data
      const gray = new Uint8Array(width * height)
      for (let i = 0, j = 0; j < gray.length; i += 4, j += 1) {
        // ITU-R BT.601 luma, the usual colour-to-gray weighting.
        gray[j] = Math.round(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114)
      }

      const image = output.context.flateStream(gray, {
        Type: 'XObject',
        Subtype: 'Image',
        Width: width,
        Height: height,
        ColorSpace: 'DeviceGray',
        BitsPerComponent: 8,
      })
      const imageRef = output.context.register(image)

      // Output page = the page as it is seen (rotation already applied).
      const pageWidth = base.width
      const pageHeight = base.height
      const outPage = output.addPage([pageWidth, pageHeight])
      const name = outPage.node.newXObject('Page', imageRef)
      outPage.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(pageWidth, 0, 0, pageHeight, 0, 0),
        drawObject(name),
        popGraphicsState(),
      )
    }

    return await output.save()
  } finally {
    void loading.destroy()
  }
}
