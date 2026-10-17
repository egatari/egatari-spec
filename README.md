# Etoki specification

Etoki (絵解き) is a file format for narrated, animated lessons: one HTML file that plays offline as a self-narrating lesson and carries its own source so it can be reopened, edited one step at a time, and saved again.

| File | Content |
|---|---|
| [etoki-1.0.md](etoki-1.0.md) | The specification (Editor's Draft) |
| [schema/](schema/) | JSON Schemas (draft 2020-12) for the index, audio records, metadata and `deck-meta` |
| [bindings/scorm12.md](bindings/scorm12.md) | Packaging an Etoki lesson as a SCORM 1.2 package |
| [extensions.md](extensions.md) | Registry of extension names (platform-specific data, §9A) |
| [fixtures/](fixtures/) | Conformance fixtures and test vectors |

The format is named separately from its reference implementation, [motion-academic-slides](https://github.com/moiku/motion-academic-slides) (producer, editor, player). The name is always written *Etoki*, never abbreviated.

Status: **Editor's Draft** — anything may change before 1.0. Feedback is welcome in Issues.

Check the schemas against the fixtures with `npm ci && npm test`.

 The specification text is licensed under [CC BY 4.0](LICENSE.md); schemas and fixtures under the repository's MIT license.
