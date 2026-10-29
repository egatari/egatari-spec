# Egatari extension registry

Extensions carry platform-specific information without changing Egatari (spec §9A). A player that ignores an extension renders and times the lesson exactly the same; anything a lesson cannot be played without is a feature in `requires` (spec §3.5) and comes with a version of the specification instead.

| Name | Status | Owner | Purpose | Definition |
|---|---|---|---|---|
| `tutor` | draft | Egatari editors | comprehension checkpoints, AI answer scope, branch lessons generated in answer to questions | [extensions/tutor.md](extensions/tutor.md) |
| `live` | draft | Egatari Studio | joining a live room (questions, polls) from the distributed lesson within a time window; the only network access in Egatari, opt-in | [extensions/live.md](extensions/live.md) |
| `embed` | draft | Egatari Studio | third-party video and maps inside a slide, loaded only when the viewer asks, from listed destinations; placeholder and link otherwise | [extensions/embed.md](extensions/embed.md) |

## Statuses

| Status | Meaning | Who may rely on it |
|---|---|---|
| `draft` | Registered; the definition may change without a new `v`. | Experiments. Producers SHOULD tell authors that the extension is a draft when they write it into a lesson. |
| `candidate` | The definition is complete (all sections of the template below), it has a JSON Schema and fixtures, and at least one implementation passes them. Any change after this is a new `v` or an addition allowed within a `v` (spec §9A), recorded in [CHANGES.md](CHANGES.md). | Producers and players that want to ship it. |
| `stable` | A candidate that has been in a released implementation for at least 60 days with no change other than additions allowed within its `v`, and that the editors have marked stable. | Everyone; the `v` is kept readable for as long as the specification version it was marked under. |
| `withdrawn` | No longer to be written. Readers keep ignoring and preserving it as for any extension they do not implement (spec §9A). The name is never reused. | Nobody, for new lessons. |

The editors change a status by a pull request that updates this table and CHANGES.md. An extension MAY skip `candidate` only if it was `candidate`-complete when registered.

## Proposing an extension

1. Check that it really is an extension: a player that ignores it must still render and time the lesson correctly (spec §9A). If not, open an issue proposing a feature instead.
2. Open an issue titled `extension: <name>` with a few lines: what it adds, who consumes it (players, editors, hosts), and the answers to **Network** and **Data leaving the device** below. This is where the name is discussed.
3. Open a pull request that adds `extensions/<name>.md` written from the template below and a row in the table with status `draft`.
4. Review:
   - **Ordinary extensions** (no network, no data leaving the device): names are first-come. The editors check that the name is free and not misleading, that the definition says what happens when the extension is ignored, and that it does not put learner data into the file (spec §9.1B). They merge without judging whether the idea is good.
   - **Extensions that connect or send data off the device:** the editors review the definition before registration against spec §4.2 (network policy), §9.1B (learner data) and §11 (security): one declared destination per purpose, visible to the viewer while connected, opt-in by the author, nothing sent before a viewer action, nothing sent from inside frames or in video and print, and no use by minors without the safeguards the definition states. They may ask for changes or decline.
5. Moving to `candidate` and `stable` follows the table above; the owner asks for it in a pull request.

Owners maintain their definitions. The editors may mark an extension `withdrawn` if it turns out to break spec §9A (it changes how an ignoring player renders), or to leak data its definition did not declare; they say why in CHANGES.md.

## Definition template

Copy into `extensions/<name>.md`. Every section is required for `candidate`; "None." is a valid answer, and is the expected answer for most extensions under **Network** and **Data leaving the device**.

```markdown
# Egatari extension `<name>` — <Draft|Candidate|Stable> v<n>

**Status:** <status>, <date>. Registered in [../extensions.md](../extensions.md). Owner: <who>.

## 1. Purpose
What it adds, for whom, and which conformance classes consume it (players, editors, hosts; spec §10).

## 2. Data
The shape of `extensions.<name>` (always with `v`), each member and its meaning; which data is addressed by step keys; the JSON Schema at `schema/extensions/<name>.schema.json`. The versions defined so far and which are compatible with which (spec §9A).

## 3. Authoring source
`data-x-<name>-<field>` attributes and `@x-<name>-<field>` narration lines, if any (spec §8.2, §9A), and how producers fold them into the index. Or "none".

## 4. Play-only derivatives
Whether the data is copied into the runtime block `deck-extensions` (spec §3.7, §4), and what must be withheld from learners (spec §3.7, §10.1).

## 5. Network
Whether a consumer connects; if so: to which destinations (declared in the data), when (viewer action, time window), how the viewer sees it while connected, and which content-security-policy directive the extension extends (spec §4.2). Or "None. A consumer makes no requests."

## 6. Data leaving the device
What leaves the device, to whom, for how long it is kept and by whom; whether it can identify a learner; the safeguards for minors. Learner data never goes into the file (spec §9.1B). Or "None."

## 7. When ignored
What a player, editor and host that do not implement it show and do. It must be the same rendering and timing as without the extension (spec §9A); describe any placeholder.

## 8. Security and privacy
What is public to anyone who holds the file (spec §3.7), attacks considered, and limits (sizes, counts, string lengths) consumers enforce.

## 9. Tests
Fixtures under `fixtures/extensions/<name>/`: valid and invalid data (against the schema), a lesson with the extension and the same lesson without it that an ignoring player renders identically, and behaviour cases (e.g. no request outside the window).

## 10. Changes
Dated list of changes to this definition.
```
