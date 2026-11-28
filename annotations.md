# Egatari annotations (draft, informative)

**Status:** draft note, moved out of Egatari Player 1.0 P5 on 2026-11-05. Not normative. It records how applications that open Egatari files (Egatari Viewer, learning platforms) anchor and exchange a learner's annotations, so that they agree. It is not a player requirement.

Annotations are learner data: they never enter the file (format §9.1B).

- **Anchors.** Each annotation is anchored to a position that survives revisions of the file: a slide key and step key, or an article section id, optionally with a point or range inside it. An annotation made on a stage pane carries a point in stage coordinates (1280×720); an annotation made on a text pane carries a text range (a quote of the selected text with a little context before and after, as in the W3C Web Annotation text-quote selector), so that it survives reflow and small edits. Because slide ids are stable (format §8.1), annotations stay attached when the file is revised; an annotation whose anchor no longer exists is kept and shown as detached, never discarded silently.
- **Kinds.** Highlights (with a colour), comments (typed text), and ink (pen strokes with pressure, in stage or page coordinates). A recall mask is a view of highlights (they are hidden and revealed one by one), not a separate kind.
- **Anchors in the file.** Annotations point at a document by `docId` and the version they were made on; a text range is given by a section id and a quote, so that it can be re-attached after the file is revised.
- **Export.** Applications SHOULD let the learner export annotations: as PDF (each slide's final state or each page of the text, with the learner's annotations drawn over or beside it), and as Markdown with the anchors. An exchange file that can be imported again on another device is defined below (Exchange file).

- **Ink (as Egatari Viewer draws it, 2026-11-18).** Ink is written only on a slide and in the notes area under it, never over the text of an article (text reflows and strokes would move off what they marked). Strokes are kept on the device, per `docId` (or, for a file without one, the file's SHA-256) and slide key; they are not written into the file. The slide and its notes area form one surface in stage units: x 0–1280, y 0–720 is the slide and y 720–1200 the notes area, so that one stroke may cross from the slide into the notes. Pen colours are a fixed set (black, red, blue), drawn lighter on a dark slide, and each stroke keeps the name of its colour. On a shared device nothing is kept. Ink is never written into the Egatari file; it is written into the exchange file (below).

## Highlight record (as Egatari Viewer stores it)

Egatari Viewer keeps highlights on the learner's device, one record per file, keyed by `docId`. Other applications that want to agree with it can use the same shape.

```json
{
  "docId": "…",
  "madeOn": {"sourceSha256": "…", "fileSha256": "…"},
  "highlights": [
    {
      "id": "…",
      "color": "y",
      "target": {
        "section": "sec-k2m4q7",
        "quote": {"exact": "…", "prefix": "…", "suffix": "…"}
      },
      "created": "2026-11-08T09:00:00Z",
      "modified": "2026-11-08T09:00:00Z"
    }
  ]
}
```

- `madeOn` names the version the highlights were made on. `sourceSha256` is copied from `deck-meta` when the file is portable; a play-only file has none (format §3.7), so `fileSha256` (SHA-256 of the file's bytes, as for signatures) is always recorded as well. A change in either only tells the application that the file was revised; it does not invalidate the highlights.
- `color` is one of `"y"`, `"p"`, `"b"` (yellow, pink, blue). The colour values are the application's; names a learner gives to colours belong to the application's preferences, not to the record.
- `target` names either an article section or a slide. `target.section` is the `data-section-id` of the article section (format §9C.6), or `""` for text outside any section (before the first level-2 heading, the reference list). `target.slide` (2026-11-25) is the slide key (format §8.1) for text on a slide; the quote is taken from the slide's rendered text with every step shown. A target has exactly one of `section` and `slide`. `quote` follows the W3C Web Annotation `TextQuoteSelector`: `exact` is the selected text, `prefix` and `suffix` at most 32 characters each, all taken from the rendered text content.
- **Ruby.** A ruby segment (a run of base text and the `rt` that follows it: the whole `<ruby>` when one reading is written over a word, each character when readings are written per character) is one unit. A range never starts or ends inside the base text of a segment: before storing a highlight, the application widens it to the edges of the segments it touches, and paints and hides (暗記) the base and its reading together. A record made before this rule, whose `exact` ends inside a segment, is widened the same way after it is re-attached, and MAY be rewritten with the widened quote, keeping its `id`, `color` and `created`.
- **Re-attaching.** Search for `exact` within the section; if it occurs more than once, choose the occurrence whose surrounding text best matches `prefix` and `suffix`; if it is not found in the section, search the whole article the same way. For `target.slide`, search that slide, then no further. A highlight that is still not found is kept and listed as not found, never deleted.
- A recall mask (暗記) hides the text of the chosen colours and reveals one highlight at a time; it is a view and is not stored.

## Note record (as Egatari Viewer stores it, 2026-11-25)

A learner's typed notes: one note per slide and one per article section, kept on the device beside the highlights, in the same record (a `notes` member next to `highlights`). Notes are never written into the Egatari file, and an application that opens the file SHOULD NOT pass the text of notes into the file's frame, where the file's own scripts could read it. This holds for printing too: Egatari Viewer draws the notes and the ink in its own page and prints the page; a frame of the file used to lay out the slides for printing never receives them (2026-11-27).

```json
{
  "notes": [
    {
      "id": "…",
      "at": {"slide": "s-k2m4"},
      "blocks": [
        {"text": "In my own words: …"},
        {"quote": {"highlight": "…", "exact": "…", "target": {"slide": "s-k2m4", "quote": {"exact": "…", "prefix": "…", "suffix": "…"}}}},
        {"text": "…"}
      ],
      "created": "2026-11-25T09:00:00Z",
      "modified": "2026-11-25T09:00:00Z"
    }
  ]
}
```

- `at` is `{"slide": key}` or `{"section": id}` (`""` for text outside any section), like `target` without a quote. There is at most one note per `at`.
- `blocks` is in reading order. A `text` block is plain text, without markup. A `quote` block copies the quoted text (`exact`) and keeps its `target` and, when one exists, the `id` of the highlight it was taken from, so that the quote survives when the highlight is deleted or the file is revised. A quote is not edited; it is removed as a whole.
- A note whose `at` no longer exists in the file is kept and listed as detached, never deleted.

## Exchange file (2026-11-25)

To move annotations to another device, an application exports one file per Egatari file, named with the suffix `.ega-notes.json` (a JSON file, so that it opens on any device). It holds `"format": "egatari-notes"` and `"version": 1`, the record above (`docId`, `madeOn`, `highlights`, `notes`) and the ink, as `ink`: an array of `{"slide": key, "strokes": […]}` in the stage units of the Ink paragraph. Importing joins it to the open file by `docId` (or, for a file without one, `fileSha256`) and refuses a file for another document; for an `id` present on both sides the later `modified` wins; a note with another `id` for a place that already has a note adds its blocks that are not there yet to the end of the note kept (nothing is lost); and anything whose anchor is not found is kept as detached.
