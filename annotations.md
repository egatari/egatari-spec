# Egatari annotations (draft, informative)

**Status:** draft note, moved out of Egatari Player 1.0 P5 on 2026-11-05. Not normative. It records how applications that open Egatari files (Egatari Viewer, learning platforms) anchor and exchange a learner's annotations, so that they agree. It is not a player requirement.

Annotations are learner data: they never enter the file (format §9.1B).

- **Anchors.** Each annotation is anchored to a position that survives revisions of the lesson: a slide key and step key, or an article section id, optionally with a point or range inside it. An annotation made on a stage pane carries a point in stage coordinates (1280×720); an annotation made on a text pane carries a text range (a quote of the selected text with a little context before and after, as in the W3C Web Annotation text-quote selector), so that it survives reflow and small edits. Because slide ids are stable (format §8.1), annotations stay attached when the lesson is revised; an annotation whose anchor no longer exists is kept and shown as detached, never discarded silently.
- **Kinds.** Highlights (with a colour), comments (typed text), and ink (pen strokes with pressure, in stage or page coordinates). A recall mask is a view of highlights (they are hidden and revealed one by one), not a separate kind.
- **Anchors in the file.** Annotations point at a lesson by `docId` and the version they were made on; a text range is given by a section id and a quote, so that it can be re-attached after the lesson is revised.
- **Export.** Applications SHOULD let the learner export annotations: as PDF (each slide's final state or each page of the text, with the learner's annotations drawn over or beside it), and as Markdown with the anchors. An exchange file that can be imported again on another device (working name `.ega-notes`) is to be defined here.

