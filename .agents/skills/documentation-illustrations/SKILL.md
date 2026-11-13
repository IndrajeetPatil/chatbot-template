---
name: documentation-illustrations
description: Create, revise, or audit raster illustrations used in project documentation, including diagrams with exact technical labels and product marks.
---

# Documentation illustrations

Create documentation artwork that makes the subject easier to understand while
keeping technical details accurate and searchable in the surrounding Markdown.

## Workflow

1. Read the relevant documentation and `DESIGN.md`. List every referenced raster
   illustration in the requested scope, then verify each depicted fact against
   the current source or documentation.
2. Use the built-in `image_gen` tool for original decorative artwork. Treat
   generated text and brand marks as unreliable: use it for scenes, textures,
   and visual accents, then compose facts, flow arrows, and labels with SVG or
   other editable vector elements.
3. Use genuine logo or icon artwork from project assets, an installed icon set,
   or the brand's official media source. Preserve its shape and proportions; do
   not ask a generator to redraw a wordmark or product logo. Record any external
   asset source and applicable license in the illustration manifest.
4. Export each final illustration to the format and path already referenced by
   the documentation. Inspect the vector source and exported image at its
   displayed size; confirm that each logo or icon sits directly with its name,
   labels and arrows are legible, and every claim is correct in light and dark
   viewing contexts where applicable.
5. Keep useful alt text beside each use. Record the final prompts, alt text,
   content summary, and any logo/icon sources in `docs/illustrations.md`.
   Describe the whole visual in alt text without repeating nearby explanatory
   text verbatim.

Prefer a clear, restrained composition with a small number of meaningful visual
groups. Keep detailed explanations and caveats in Markdown, where readers can
search, copy, and access them without relying on the image.
