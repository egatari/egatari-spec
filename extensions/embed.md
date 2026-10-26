# Egatari extension `embed` — Draft v1

**Status:** draft, 2026-10-22. Registered in [../extensions.md](../extensions.md). Consumed by **players** and hosts. Lets a lesson show third-party content inside a slide — a video (YouTube), a map (Google Maps) — without breaking the rule that a lesson loads nothing by address (spec, *Self-contained by design*): nothing is loaded until the viewer asks for it, and only from destinations this definition names.

Players that ignore it show the lesson's own placeholder image and link, so the lesson stays complete without it.

## 1. Authoring and data

In the slide source, an embed is an element with a placeholder the lesson carries:

```html
<figure data-x-embed-src="https://www.youtube-nocookie.com/embed/VIDEO_ID?start=30"
        data-x-embed-title="実験の様子（3 分）">
  <img src="figs/video-thumb.jpg" alt="実験の様子の動画（YouTube）">
  <figcaption><a href="https://www.youtube.com/watch?v=VIDEO_ID&t=30">YouTube で見る</a></figcaption>
</figure>
```

Producers fold these into `extensions.embed` at export (`{v:1, items:{<element id>: {src, title}}}`), and copy it into `deck-extensions` in every file (the file's network policy is checked against it, spec §4.2).

- `src` MUST be `https:` and its origin MUST be on the allowed list (§3). Producers reject others; players ignore them.
- The placeholder (`img` inside the element, part of the lesson) and the link are REQUIRED: they are what video export, print, the presenter's view, previews and players without this extension show.

## 2. Player behaviour

1. Shows the placeholder with a clear control ("Load from YouTube" and the destination host). Nothing is requested before the viewer activates it; activating it is per element and per viewing session.
2. On activation, replaces the placeholder with an `iframe` for `src` with `sandbox="allow-scripts allow-same-origin allow-presentation"` (no top navigation, no popups unless the destination needs them for playback), `referrerpolicy="no-referrer"`, `allow` limited to what playback needs (e.g. `fullscreen`, `picture-in-picture`), and `loading="eager"` only after activation.
3. Never activates by itself: not on entering the step, not in autoplay, not in video mode, print or the presenter's view; those always show the placeholder, so *(i, k, t)* rendering is unchanged.
4. Inside a frame that forbids network (spec §10.1, §11; editor previews) it shows the placeholder and the link only.
5. When the destination refuses to play in this context (some services refuse lessons opened from a local file), the player falls back to the link.
6. The file's policy (spec §4.2) adds the listed destination hosts to `frame-src`, and nothing else; without them the browser refuses the iframe.
7. A host acting for a sandboxed lesson (as in `live` §2A) MAY create the iframe itself, outside the lesson's frame, positioned over the placeholder.

## 3. Allowed destinations (v1)

| Origin | Use |
|---|---|
| `https://www.youtube-nocookie.com` | video (privacy-enhanced mode) |
| `https://player.vimeo.com` | video |
| `https://www.google.com/maps/embed` (path prefix) | maps |
| `https://www.openstreetmap.org/export/embed.html` (path prefix) | maps |

Adding a destination changes this definition (a new minor version); players MUST NOT accept destinations outside the list of the version they implement.

## 4. Open questions

- Whether a lesson may embed content from its author's own site (a per-lesson allow-list), and how a viewer would judge it.
- Captions and accessibility of third-party players; whether the placeholder must carry a text description of the video's content.
- Conformance test: activation without a user gesture must be impossible; no request before activation.
