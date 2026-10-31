# Findings: myst-parser 1.7.5 against the node types of §9C.2

First pass (raw `mystParse` output) against the §9C.2 table, and how each point was settled.

1. **Reference links.** The parser resolves a reference link into a plain `link` (`url`, `title`), and the definition line leaves no node. → §9C.2 now lists `link` only.
2. **Figure.** Raw output wraps the `container` in a `mystDirective` and keeps the body as plain paragraphs. → Settled by running the structural transforms (`liftMystDirectivesAndRolesTransform`, `containerChildrenTransform`, `captionParagraphTransform`): the tree then has `container` with `image`, `caption`, `legend`, as the table says.
3. **Wrapped table.** Same `mystDirective` wrapper. → Settled by the same transforms.
4. **Display math and targets.** With a `(label)=` line, raw output keeps a separate `mystTarget`. → `mystTargetsTransform` attaches `label` and `identifier` to the next node and removes the target; §9C.2 now says so. `enumerated` is not set by the parser (numbering is the producer's, §9C.6) and was removed from the table. `html_id` is dropped from the trees.
5. **Lists.** In tight lists every `listItem` has `spread: true` while the `list` has `spread: false`. Left as the parser gives it; §9C.2 does not constrain `spread`.
6. **Minor.** Indented code gives `lang: ""`; `cite` nodes carry `kind`; given the whole file, the front matter comes back as a `code` node (`lang: "yaml"`), so it is read off first.

Not flagged by the parser (validators need their own checks): bare URLs and `~~strike~~` come out as plain text, `@key` outside brackets comes out as a `cite` with `kind: "narrative"`, and a key such as `doe..1948` parses as a normal `cite`.

## Book constructs (2026-10-31)

7. **Theorem-like blocks.** myst-parser alone leaves `:::{prf:theorem}` as a `mystDirective`; mystmd reads it with its proof extension. → The fixtures add `proofDirective` from `myst-ext-proof` 1.0.13, which gives `proof` (`kind`, `enumerated`, `label`, `identifier`) with the title as `admonitionTitle`. `enumerated` is `true` for `kind: "proof"` too; §9C.1A leaves proofs unnumbered.
8. **HTML tables.** Without the HTML transforms, an HTML table in `:::{table}` comes out as an `html` node, and `captionParagraphTransform` then files it under `legend`. → `reconstructHtmlTransform` and `htmlTransform` run before the container transforms; the table then becomes `table` / `tableRow` / `tableCell` with `colspan` and `rowspan`, and the legend is only the paragraphs after it. `thead` and `tbody` leave no trace except `header` on `th` cells, so §9C.2 defines header rows as the leading rows of `th` cells.
9. **Cells of HTML tables.** `em`, `strong`, `code`, `sub`, `sup` and `br` become `emphasis`, `strong`, `inlineCode`, `subscript`, `superscript` and `break`. Markdown written directly in a cell (`*10*`, `$x$`) stays literal text. With blank lines around a cell's content, CommonMark ends the HTML block and the content is parsed as Markdown, but inline math then becomes a `span` with class `math-inline`, not `inlineMath`. → §9C.2 forbids blank lines in the table and Markdown and math in its cells.
10. **Asides, footnotes and ruby** parse as expected with default options: `aside` with `admonitionTitle`, `footnoteReference` / `footnoteDefinition`, and `mystRole` `ruby` (myst-parser does not reject unknown roles).
