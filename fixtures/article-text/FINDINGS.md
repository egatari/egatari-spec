# Findings: myst-parser 1.7.5 against the node types of §9C.2

First pass (raw `mystParse` output) against the §9C.2 table, and how each point was settled.

1. **Reference links.** The parser resolves a reference link into a plain `link` (`url`, `title`), and the definition line leaves no node. → §9C.2 now lists `link` only.
2. **Figure.** Raw output wraps the `container` in a `mystDirective` and keeps the body as plain paragraphs. → Settled by running the structural transforms (`liftMystDirectivesAndRolesTransform`, `containerChildrenTransform`, `captionParagraphTransform`): the tree then has `container` with `image`, `caption`, `legend`, as the table says.
3. **Wrapped table.** Same `mystDirective` wrapper. → Settled by the same transforms.
4. **Display math and targets.** With a `(label)=` line, raw output keeps a separate `mystTarget`. → `mystTargetsTransform` attaches `label` and `identifier` to the next node and removes the target; §9C.2 now says so. `enumerated` is not set by the parser (numbering is the producer's, §9C.6) and was removed from the table. `html_id` is dropped from the trees.
5. **Lists.** In tight lists every `listItem` has `spread: true` while the `list` has `spread: false`. Left as the parser gives it; §9C.2 does not constrain `spread`.
6. **Minor.** Indented code gives `lang: ""`; `cite` nodes carry `kind`; given the whole file, the front matter comes back as a `code` node (`lang: "yaml"`), so it is read off first.

Not flagged by the parser (validators need their own checks): bare URLs and `~~strike~~` come out as plain text, `@key` outside brackets comes out as a `cite` with `kind: "narrative"`, and a key such as `doe..1948` parses as a normal `cite`.
