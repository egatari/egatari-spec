# Changes

Egatari 1.0 is an Editor's Draft: `main` is the live draft and may change at any time. Dated snapshots are tagged `wd-YYYY-MM-DD` (Working Draft); a second snapshot on the same day adds a letter (`wd-YYYY-MM-DDb`). Implementations say which snapshot they follow (for example, "Egatari Studio 0.4.6 follows Egatari 1.0 WD 2026-10-24"). Nothing is stable before 1.0 is frozen; snapshots exist so that implementations and lessons can name the draft they were built against.

## Since WD 2026-10-24b

Changes on `main` after the snapshot; they will be in the next Working Draft.

**Components (§8.4)**
- Presentation variants and the lesson seed: `data-egatari-seed` on the source root (absent = 0), `seed` and `variant` on a component; the variant is a pure function of these; variants never change steps, durations, cues, final content or colors, and never move more than seed 0; editors write a seed once when creating a lesson and preserve it.

**Article layer (`article-v1`, draft, §9C)**
- Source: `article.md` at the archive root in Egatari Text 1, a subset of MyST Markdown written into this specification and versioned with it (CommonMark core, `$…$`/`$$…$$` math with labels, `:::{figure}`/`:::{table}` with `:label:`, pipe tables, `[](#id)` cross-references, `[@key]` citations against CSL-JSON `references.json`, and one role `` {step}`<slideKey>:<stepKey>` ``); a table of constructs with their AST node types; everything else is rejected or converted.
- Placement: `index.article = {path, references?}`; the dependency closure includes the references file and article images.
- Section ids `sec-` + 6 base32 characters, assigned by tools, never by AI authors; each section is wrapped in `<section data-section-id>` inside `<article id="egatari-article">`, nested as the last child of the readable layer.
- Step links carry `data-egatari-step` and `href="#<slideKey>:<stepKey>"`; slides name sections with `data-article`.
- Staleness: `index.articleLinks[slideKey][sectionId] = {article, slide}`, hashed over source text, not rendered text; also carried in `egatari.json`.
- Validation errors (missing step, citation key, cross-reference target, section); text pane shows the article; pagination never splits figures, tables or display math.
- `article-v1` is not listed in `requires`; players without it play the lesson; editors without it are limited to tier A edits on lessons with an article (§7.2).
- Informative: print/PDF as output, a JATS mapping, authoring guidance for AI.

## WD 2026-10-24b

Second snapshot of the day, for Egatari Studio 0.4.8. It adds four changes to WD 2026-10-24; the article layer (§9C) stays on `main` as a draft and is not part of this snapshot.

**Archive and index**
- `egatari.json`: a producer may keep its own state under one producer-named member, which others preserve.
- `egatari.json` may pin themes with the same rules as components; `index.themes[].version` is the theme's own version.
- A theme's identity hash covers the files a build reads, not documentation.

**Runtime**
- `deck-narration`: optional `ttsParts` per turn, so that device read-aloud says what the audio would say.

## WD 2026-10-24

First dated snapshot. It covers the draft from 2026-10-17 to 2026-10-24.

**Principles**
- Self-contained by design: a lesson loads nothing by address; network access only through an opt-in extension whose definition allows it (today `live`). Extensions are optional layers; players, editors and hosts conform without implementing any. Reference implementation: Egatari Studio.
- One source, many views (§1.0); layouts as panes, detached panes, learner notes; offered modes (the author's intent for modes and where to open).

**Archive and index**
- Attachments (§3.8): what may be attached, PDF actions, script extensions, text limits, learner copies, player filtering.
- `exportedFrom`: marks a copy exported from an authoring folder; dropped when saved as a new lesson.
- Components: line endings normalized before identity hashes; the export writes the version pin into `egatari.json`; a registry may withdraw a release, and editors offer a rebuild and never substitute silently.
- Themes may declare their frame geometry for authoring tools and checks; required for bundled and official library themes, recommended for user themes; players render from CSS only.

**Audio and timing**
- Cues for recorded takes may be placed by the user or measured; TTS made elsewhere keeps its cues when its `inputHash` matches.
- `deck-audio` carries `kind`; players mark synthesized narration.
- Audio watermarks (draft).
- §5.6 Reading with the device voice: a player may read a step without audio with an on-device voice, never as audio of the lesson.

**Components and embedding**
- Component contract: mount after layout and fonts; viewer interaction is not part of *(i, k, t)* and is reset on entering a step.
- Embedding (§9.4): optional position events between step changes, text-pane scrolling as seek and skip, per-step turn index; `openLink` event (with an optional `download` flag) for links a sandboxed lesson cannot open itself.
- Camera (`camera-v1`, draft): zoom and pan in time with the narration.

**Security (§11)**
- Links that leave the lesson show their destination and are confirmed when suspicious (scheme, host mismatch, internationalized hosts, user information, downloads); player-generated links are exempt when the player shows their host; platforms that need a fresh tap.

**Extensions**
- `live` (draft v1): join a live session from the distributed lesson (questions anchored to a step and region, "I don't follow", polls with labels, host replies); one-tap join; window and endpoint limits; a join page; a host acting for a sandboxed lesson (with an endpoint allow-list); one-way setup from the editor with a setup secret no lesson carries; results readers ignore unknown members, and the service records only declared activities.
- `embed` (draft v1): click-to-load third-party video and maps with a required placeholder.

**Open issues added or extended**
- 2 public component registry (direction); 7 citations (CSL-JSON, `[@key]`, presentation chosen by the author); 9A multilingual lessons and right-to-left scripts; 12 extension governance; 13 encrypted lessons.

**Other**
- Logo recoloured to konai #4A488E and hiiro #D3381C.
