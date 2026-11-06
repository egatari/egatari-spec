// Loaded with `node --import` before the test tools (see tools/mdit14-hooks.mjs for why).
import { registerHooks } from 'node:module';
import { resolveSync } from './mdit14-hooks.mjs';
registerHooks({ resolve: resolveSync });
