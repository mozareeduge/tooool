# Visual Acceptance — only after one-click activation succeeds

The automated suite already covers dependency consistency, geometry, all four PDF rotations mathematically, real PDF image embedding/save/reload, invalid export-state guards, PDF.js support assets, TypeScript, and production build.

Only two visual/UI flows remain.

## A1 — normal end-to-end interaction

Use `fixtures/sample-multipage.pdf`, `fixtures/signature.png`, and `fixtures/stamp.svg`.

1. Upload the PDF. Confirm 3 pages; Previous/Next/jump work.
2. Upload the PNG as Signature and SVG as Stamp. Add both on page 1; drag/resize them. Move to page 2 and back: positions/sizes must persist and remain page-specific.
3. Select one item and delete it. Replace the **Stamp** image by uploading `fixtures/signature.png` into the Stamp uploader; any existing stamp placement must change aspect without visible stretching and stay inside the page.
4. Add/place items on at least two pages, export, and open the downloaded PDF. Page count/content must remain present and overlays must visually match their app positions/sizes.

**A1 PASS** only if all four checks pass without a console-breaking error.

## A2 — rotated-page visual regression

Use `fixtures/rotation-test.pdf` (four labeled pages with `/Rotate` 0°, 90°, 180°, 270°).

On each page place one item near visible top-left and one near visible bottom-right. Export and open the result.

**A2 PASS** only if on all four pages both overlays are upright and remain in the same visible corners/relative sizes chosen in the app.

## Stop rule

If A1+A2 pass, stop. Do not expand testing or refactor.

If A2 fails, record the exact rotation and whether the error is **position**, **orientation**, or **scale** before touching geometry.
