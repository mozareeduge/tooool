# Frozen Architecture

## Data flow

```text
PDF File
  -> Uint8Array retained in state
  -> Blob URL only for react-pdf viewer

PNG Stamp / Signature
  -> decoded -> data URL -> asset state

SVG Stamp / Signature
  -> DOMParser
  -> reject DOCTYPE/script/foreignObject/event handlers/external or active resource references
  -> off-screen Canvas at high resolution
  -> PNG data URL -> asset state

Placement action
  -> react-rnd DOM rectangle
  -> normalized x/y/w/h relative to rendered page
  -> stored with pageIndex + asset kind

Export
  -> pdf-lib loads a copy of original bytes
  -> each used PNG embedded once
  -> normalized placement + CropBox + /Rotate -> PDF draw rectangle
  -> image drawn on matching page
  -> PDF saved -> browser download
```

## Why normalized geometry is mandatory

Raw DOM pixels depend on browser width and rendered PDF scale. Persisting them would make export fragile after resize or page changes. Stored placement geometry therefore uses fractions of the visible page dimensions. DOM pixels are derived only for rendering, and PDF points are derived only for export.

## Geometry invariants

- DOM/viewer origin: top-left.
- PDF content origin: bottom-left.
- `CropBox` may be offset from `(0,0)`.
- `/Rotate` may be 0, 90, 180, or 270 degrees.
- The overlay must remain upright to the viewer after the page's display rotation.
- `npm run test:geometry` is the regression gate for these invariants.

## Security/locality boundary

No uploaded document/image is intentionally sent to a server. PNG inputs are signature-checked. SVG inputs reject DOCTYPE, script, `foreignObject`, event-handler attributes, CSS imports, and non-local/non-embedded resource references before rasterization.

## Out of scope

This is visual stamping/signing. It does not produce PAdES or any certificate-backed cryptographic digital signature. Re-saving a PDF that already contains a cryptographic signature may invalidate that signature.
