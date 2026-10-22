# Egatari extension registry

Extensions carry platform-specific information without changing Egatari (spec §9A). Register a name by adding a row (pull request). Names are first-come; the definition document must state the extension's `v` versions and the shape of its data.

| Name | Owner | Purpose | Definition |
|---|---|---|---|
| `tutor` | Egatari editors | comprehension checkpoints, AI answer scope, branch lessons generated in answer to questions | [extensions/tutor.md](extensions/tutor.md) |
| `live` | Egatari Studio | joining a live room (questions, polls) from the distributed lesson within a time window; the only network access in Egatari, opt-in | [extensions/live.md](extensions/live.md) |
| `embed` | Egatari Studio | third-party video and maps inside a slide, loaded only when the viewer asks, from listed destinations; placeholder and link otherwise | [extensions/embed.md](extensions/embed.md) |
