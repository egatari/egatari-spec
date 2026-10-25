<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo/mark-dark.svg">
    <img src="logo/mark-light.svg" width="128" height="128" alt="Egatari logo: the hiragana え (e, picture) in Japanese corner brackets, its first stroke drawn as a sun">
  </picture>
</p>

# Egatari specification

Egatari (絵語り, "narrating with pictures") is a file format for narrated, animated lessons: one HTML file that plays offline as a self-narrating lesson and carries its own source so it can be reopened, edited one step at a time, and saved again.

| File | Content |
|---|---|
| [egatari-1.0.md](egatari-1.0.md) | The format: what a lesson is and how it is stored in one file (Editor's Draft) |
| [egatari-player-1.0.md](egatari-player-1.0.md) | Players: display modes, layouts, playback, links, learner data, tracking, embedding (Editor's Draft, versioned separately) |
| [CHANGES.md](CHANGES.md) | Dated snapshots (`wd-YYYY-MM-DD`) and what changed in each |
| [schema/](schema/) | JSON Schemas (draft 2020-12) for the index, audio records, metadata and `deck-meta` |
| [bindings/scorm12.md](bindings/scorm12.md) | Packaging an Egatari lesson as a SCORM 1.2 package |
| [extensions.md](extensions.md) | Registry of extension names (platform-specific data, §9A) |
| [fixtures/](fixtures/) | Conformance fixtures and test vectors |

The format is named separately from its reference implementation, [Egatari Studio](https://github.com/egatari/egatari-studio) (authoring and quality check, at [studio.egatari.org](https://studio.egatari.org/)), which bundles Egatari Player in the files it writes. The name is written *Egatari* (絵語り). Files use the extension `.ega.html`.

Status: **Editor's Draft** (a working draft by the specification's editors, as in W3C usage) — anything may change before 1.0. Feedback is welcome in [Issues](https://github.com/egatari/egatari-spec/issues).

Check the schemas against the fixtures with `npm ci && npm test`.

 The specification text is licensed under [CC BY 4.0](LICENSE.md); schemas and fixtures under the repository's MIT license.

The logo files are in [logo/](logo/). They are not covered by the CC BY or MIT licenses: you may use them unmodified to refer to Egatari or to software that reads or writes Egatari files.
