# PDF Stamp & Sign

**▶ Use it online: https://mozareeduge.github.io/tooool/** — runs entirely in your browser; files never leave your device.

## How to use (phone or computer)

1. **Add your stamp and signatures once**: tap **+ Add image** and pick your SVG/PNG files (you can select several at once). They are kept on this device, so next time they are already there. The small **Stamp / Sign** badge on each image only sets its default size; tap it to switch. If an image has a background (a photo of a signature on paper, a stamp scan, an SVG with a white box), it is removed automatically and the image is trimmed; **Undo BG** brings the original back, **Remove BG** does it on demand. To add a photo, logo or any other picture exactly as it is (background kept), use **Add picture** instead.
2. **Open the document**: a PDF, or a photo/scan of it (JPEG, PNG, WebP, HEIC on iPhone…). Several images at once become a multi-page PDF, in the order picked.
3. Go to the page you need, scroll to where it should go, and **tap an image**: it lands in the middle of what you are looking at.
4. **Drag** to move; pull a **blue corner** to resize (proportions are kept). With an item selected you can **Add to all pages**, **Delete**, or tap **Done**.
5. Optional: turn on **Black & white** (**B&W** on phones) to get a grayscale copy, e.g. for printers or offices that only accept black & white. It works with or without anything placed, so it is also a plain converter. Pages are stored as crisp 200 dpi grayscale images, so text in that copy is no longer selectable.
6. **Save** downloads the finished PDF. On phones, **Share** sends it straight to Files, WhatsApp, mail, and so on.

Transparent SVG or PNG works best. WebP, GIF, JPEG and AVIF are also accepted (JPEG has no transparency). Nothing is ever uploaded: the PDF and the images stay in your browser.

A static, client-side React application for visually placing stamp/signature images on multi-page PDFs and exporting the result.

**Agent activation:** run `AGENT_ONE_CLICK_WINDOWS.cmd` or `./AGENT_ONE_CLICK_UNIX.sh` first. See `README_FIRST.md`.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- `react-pdf` / PDF.js for rendering
- exact matching `pdfjs-dist` support assets (CMaps, WASM, standard fonts)
- `react-rnd` for drag + resize
- `pdf-lib` for image embedding/export

No backend is required. Uploaded files stay in the browser session.

## Human local start

Windows: double-click `START_WINDOWS.cmd`.

macOS/Linux:

```bash
./START_UNIX.sh
```

Manual npm path after dependencies exist:

```bash
npm run verify
npm run start:local
```

Node >=22.13.0 is required.

## Core design

### Normalized placements

Each overlay is stored as `x`, `y`, `width`, `height` in `0..1` coordinates relative to the visible rendered page. Responsive viewer resizing therefore does not change logical placement.

### Rotation/CropBox-aware export

`src/utils/geometry.ts` translates browser top-left visible-page rectangles into PDF points while accounting for CropBox offsets and `/Rotate` 0/90/180/270°. Overlay rotation is counterbalanced so the image remains upright to the viewer.

### Image handling

PNG inputs are signature-checked. SVGs are parsed locally, reject DOCTYPE/script/`foreignObject`/event handlers/external active resources, understand common absolute SVG units, and are rasterized to transparent high-resolution PNG before app state/export. Replacing an image already used by placements recomputes those placements for the new aspect ratio instead of stretching them.

### PDF.js compatibility assets

The build/start flow copies CMaps, WASM codecs, and standard fonts from the installed `pdfjs-dist` into generated `public/pdfjs/`, improving compatibility with non-Latin text, JPEG-2000 content, and PDFs that rely on standard fonts.

## Scope note

This adds **visual image overlays**. It does not create a certificate-backed PAdES/digital signature. Re-saving an already cryptographically signed PDF can invalidate its prior digital signature.
