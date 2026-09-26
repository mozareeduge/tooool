# PDF Stamp & Sign

**▶ Use it online: https://mozareeduge.github.io/tooool/** — runs entirely in your browser; files never leave your device.

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
