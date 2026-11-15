// Egatari's `:nonumber:` on asides (spec §9C.2). mystmd numbers no asides and its
// aside directive has no such option, so the option stays only on the
// `mystDirective` node. Run this after mystParse and before
// liftMystDirectivesAndRolesTransform: it sets `enumerated: false` on the aside.
export function egatariAsideTransform(tree) {
  (function walk(node) {
    if (node.type === 'mystDirective' && node.name === 'aside' && node.options?.nonumber) {
      for (const c of node.children ?? []) if (c.type === 'aside') c.enumerated = false;
    }
    for (const c of node.children ?? []) walk(c);
  })(tree);
}
