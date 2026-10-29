# Egatari Text 1 fixtures (§9C.2)

Conformance fixtures for **Egatari Text 1**, the frozen MyST subset in which article files are written (§9C.2–§9C.4). All content is fictional.

## Layout

```
valid/<case>/input.md         an Egatari Text document (front matter optional)
valid/<case>/expected.json    the parser's mdast tree for input.md
invalid/<case>/input.md       a document that breaks Egatari Text 1
invalid/<case>/expect.json    {"error": "<short reason>", "spec": "§9C.x"}
FINDINGS.md                   where the parser's tree differs from the node types in §9C.2
```

## How the expected trees were made

- Tools: `myst-parser` **1.7.5**, function `mystParse` with its default options, then four transforms of `myst-transforms` **1.3.52** in this order: `liftMystDirectivesAndRolesTransform`, `mystTargetsTransform`, `containerChildrenTransform`, `captionParagraphTransform` (exact versions pinned in `package.json`). These are the structural steps of §9C.2; numbering and resolution are not run.
- The YAML front matter block (`---` … `---` at the start of the file) is read off before parsing; only the rest of the file is passed to `mystParse`. (Given the whole file, myst-parser 1.7.5 returns the front matter as a `code` node with `lang: "yaml"`.) The front matter is therefore not part of `expected.json`; its members are checked by validators against §9C.2.
- Every `position`, `key` and `html_id` key is removed. Nothing else is changed; no tree was written by hand.
- `npm test` (`tools/test-fixtures.mjs`) re-parses every `valid/*/input.md` the same way and deep-compares the result with `expected.json`. After a deliberate change to an input, regenerate with `node tools/test-fixtures.mjs --update-article-text` and review the diff.

## Trees are before resolution

`expected.json` is the tree after the four structural transforms above, before resolution and numbering. Where §9C.2 says a node is "resolved to" something, the fixture shows the unresolved node:

- a link whose URL starts with `#` stays a `link` (it becomes `crossReference` only when a producer resolves it);
- a step link stays `mystRole` with `name: "step"` and the raw `value` (it becomes `egatariStep` with `slideKey`, `stepKey` and children only when resolved);
- no numbers are present (§9C.6: numbering is the producer's).

A `(label)=` line has already been attached to the next node (`label`, `identifier`), and figures and wrapped tables are `container` nodes with `caption` (and `legend`), as §9C.2 lists.

A conforming parser written without MyST's tools should produce these trees; resolution (§9C.6) is checked separately. The differences between these trees and the node types listed in §9C.2 are recorded in [FINDINGS.md](FINDINGS.md).

## Valid cases

| Case | Construct (§9C.2 row) |
|---|---|
| `paragraph-breaks` | paragraphs, soft breaks, hard breaks (backslash and two spaces) |
| `heading-atx` | ATX headings, levels 2–4, with a section target |
| `heading-setext` | setext level-2 heading after a target |
| `target-heading-level3` | target before a level-3 heading |
| `emphasis-strong-code` | emphasis, strong, code span |
| `list-ordered-start` | ordered list starting at 3 |
| `list-bullet` | bullet list with a blank line between items |
| `blockquote` | block quote (Japanese) |
| `thematic-break` | `***` and `---` |
| `code-fenced`, `code-tilde`, `code-indented` | code blocks |
| `link-inline` | inline link with title; `<url>` autolink |
| `link-reference` | reference link and definition |
| `image-inline` | inline image with an archive path |
| `math-inline` | inline math |
| `math-display-label-closing` | display math with `(eq-…)` on the closing line |
| `math-display-target` | display math after a `(eq-…)=` line |
| `figure` | `:::{figure}` with `:label:`, `:alt:`, caption and legend |
| `table-plain` | GFM pipe table with alignment |
| `table-wrapped` | pipe table in `:::{table}` with caption and `:label:` (Japanese) |
| `crossref-empty`, `crossref-text` | cross-references with empty and given text |
| `cite-single` | `[@key]` |
| `cite-grouped-locator` | `[@a; @b, p. 3]` |
| `cite-locator-japanese` | `[@key, 3 頁]` |
| `step-link-bare`, `step-link-text` | both step link forms |
| `escapes` | `\$`, `\@`, `\%` (including at the start of a line), `\[` |
| `frontmatter-chapter` | front matter `chapter: 4`, a figure and a cross-reference (Japanese) |
| `frontmatter-numbering-false` | front matter `numbering: false` |
| `japanese-vertical` | front matter `writing-mode: vertical-rl`, Japanese text |

## Invalid cases

These are for producers' validators (§9C.2: a producer MUST reject a construct outside the subset, or convert it and tell the author). They are listed, not parsed: `npm test` checks only that each folder has `input.md` and a well-formed `expect.json`. Note that myst-parser 1.7.5 with default options does not itself flag them; some (`bare-url-autolink`, `strikethrough`) come out as plain text, and `bare-citation` comes out as a `cite` node, so a validator needs its own checks.

| Case | Reason | Spec |
|---|---|---|
| `raw-html-block`, `raw-html-inline` | raw HTML | §9C.2 |
| `admonition` | admonition directive | §9C.2 |
| `role-numref` | `{numref}` role | §9C.2 |
| `list-table` | `{list-table}` directive | §9C.2 |
| `footnote` | footnote | §9C.2 |
| `comment` | `%` comment | §9C.2 |
| `block-break` | `+++` | §9C.2 |
| `substitution` | `{{ … }}` | §9C.2 |
| `bare-citation` | `@key` outside brackets | §9C.2 |
| `bare-url-autolink` | bare URL | §9C.2 |
| `strikethrough` | `~~…~~` | §9C.2 |
| `task-list` | `- [ ]` | §9C.2 |
| `definition-list` | definition list | §9C.2 |
| `heading-level-1`, `heading-level-5` | heading level outside 2–4 | §9C.2 |
| `frontmatter-unknown-member` | front matter member `author` | §9C.2 |
| `figure-label-sec-prefix` | figure label starting with `sec-` | §9C.3 |
| `citation-key-pattern` | key `doe..1948` breaks the key pattern | §9C.4 |
| `image-http-url` | image path is an `https:` URL | §9C.1 |
