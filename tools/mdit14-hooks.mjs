// Resolve hook for the test tools only: myst-parser's markdown-it plugins (markdown-it-dollarmath, -amsmath,
// -myst) import markdown-it 13's deep path `markdown-it/lib/common/utils.js`, which markdown-it 14 moved to
// `utils.mjs`. package.json overrides markdown-it to 14.3.3 (security fixes); this maps the one old path to the
// new one and refuses any other deep path, so a future plugin bump cannot slip a new one through
// (same rule as egatari-studio tools/build-book-tools.mjs).
export function resolveSync(specifier, context, nextResolve) {
  if (specifier.startsWith('markdown-it/lib/')) {
    if (specifier === 'markdown-it/lib/common/utils.js') return nextResolve('markdown-it/lib/common/utils.mjs', context);
    throw new Error(`unexpected deep import of markdown-it: ${specifier}`);
  }
  return nextResolve(specifier, context);
}
