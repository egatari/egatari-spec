# Egatari annotations (draft, informative)

**Status:** draft note, moved out of Egatari Player 1.0 P5 on 2026-11-05. Not normative. It records how applications that open Egatari files (Egatari Viewer, learning platforms) anchor and exchange a learner's annotations, so that they agree. It is not a player requirement.

Annotations are learner data: they never enter the file (format §9.1B).

- **Anchors.** Each annotation is anchored to a position that survives revisions of the lesson: a slide key and step key, or an article section id, optionally with a point or range inside it. An annotation made on a stage pane carries a point in stage coordinates (1280×720); an annotation made on a text pane carries a text range (a quote of the selected text with a little context before and after, as in the W3C Web Annotation text-quote selector), so that it survives reflow and small edits. Because slide ids are stable (format §8.1), annotations stay attached when the lesson is revised; an annotation whose anchor no longer exists is kept and shown as detached, never discarded silently.
- **Kinds.** Highlights (with a colour), comments (typed text), and ink (pen strokes with pressure, in stage or page coordinates). A recall mask is a view of highlights (they are hidden and revealed one by one), not a separate kind.
- **Anchors in the file.** Annotations point at a lesson by `docId` and the version they were made on; a text range is given by a section id and a quote, so that it can be re-attached after the lesson is revised.
- **Export.** Applications SHOULD let the learner export annotations: as PDF (each slide's final state or each page of the text, with the learner's annotations drawn over or beside it), and as Markdown with the anchors. An exchange file that can be imported again on another device (working name `.ega-notes`) is to be defined here.


## Highlight record (as Egatari Viewer stores it)

Egatari Viewer keeps highlights on the learner's device, one record per lesson, keyed by `docId`. Other applications that want to agree with it can use the same shape.

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

- `madeOn` names the version the highlights were made on. `sourceSha256` is copied from `deck-meta` when the file is portable; a play-only file has none (format §3.7), so `fileSha256` (SHA-256 of the file's bytes, as for signatures) is always recorded as well. A change in either only tells the application that the lesson was revised; it does not invalidate the highlights.
- `color` is one of `"y"`, `"p"`, `"b"` (yellow, pink, blue). The colour values are the application's; names a learner gives to colours belong to the application's preferences, not to the record.
- `target.section` is the `data-section-id` of the article section (format §9C.6), or `""` for text outside any section (before the first level-2 heading, the reference list). `quote` follows the W3C Web Annotation `TextQuoteSelector`: `exact` is the selected text, `prefix` and `suffix` at most 32 characters each, all taken from the rendered text content.
- **Ruby.** A ruby segment (a run of base text and the `rt` that follows it: the whole `<ruby>` when one reading is written over a word, each character when readings are written per character) is one unit. A range never starts or ends inside the base text of a segment: before storing a highlight, the application widens it to the edges of the segments it touches, and paints and hides (暗記) the base and its reading together. A record made before this rule, whose `exact` ends inside a segment, is widened the same way after it is re-attached, and MAY be rewritten with the widened quote, keeping its `id`, `color` and `created`.
- **Re-attaching.** Search for `exact` within the section; if it occurs more than once, choose the occurrence whose surrounding text best matches `prefix` and `suffix`; if it is not found in the section, search the whole article the same way. A highlight that is still not found is kept and listed as not found, never deleted.
- A recall mask (暗記) hides the text of the chosen colours and reveals one highlight at a time; it is a view and is not stored.
