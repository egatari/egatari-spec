# Egatari LMS Binding: SCORM 1.2

**Status:** Editor's Draft, 2026-10-17. Part of [Egatari 1.0](../egatari-1.0.md) §9.2, §10 (LMS Binding).

SCORM 1.2 is the only packaging format that Moodle core tracks without plugins, and it is also supported by most other LMSs. This binding packages one Egatari file as a single-SCO SCORM 1.2 package and maps the player's tracking events to the SCORM 1.2 run-time API.

## 1. Package

A ZIP file containing, at its root:

| Path | Content |
|---|---|
| `imsmanifest.xml` | the manifest below |
| `index.html` | the Egatari file, **byte-for-byte unchanged** |

The package MUST NOT add other launch files or modify the Egatari file: extracting `index.html` from the package gives back the original lesson, still playable and editable. Packagers MAY add the SCORM 1.2 XSD files; LMSs do not require them.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="egatari-{docId}" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org">
    <organization identifier="org">
      <title>{metadata.title}</title>
      <item identifier="item" identifierref="res">
        <title>{metadata.title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
```

`{docId}` and `{metadata.title}` come from the Egatari index (XML-escaped). For a play-only file without an index, the packager uses a fresh UUID and the document `<title>`.

## 2. Run-time

The bridge is part of the Egatari player's tracking adapter (no separate script in the package). A packager MUST refuse an Egatari file whose `deck-meta.tracking` does not contain `"scorm12"`.

The player looks for the SCORM 1.2 `API` object by walking `window.parent` up to 7 levels and then `window.opener`, as in the ADL reference algorithm. If none is found, it falls back to the next adapter (Egatari 1.0 §9.2). API functions return the strings `"true"` / `"false"`; the player compares them literally and calls `LMSGetLastError()` immediately after any failed call and after every `LMSGetValue`.

### 2.1 Lifecycle

| Player event | SCORM 1.2 calls |
|---|---|
| load | `LMSInitialize("")` once. Read `cmi.core.lesson_mode`, `cmi.core.lesson_status`, `cmi.core.entry`, `cmi.core.lesson_location`, `cmi.suspend_data` |
| start (first user gesture) | if `lesson_mode` is `review`: write nothing except at termination. Otherwise, if `lesson_status` is `not attempted`, set `incomplete` |
| step reached | update `cmi.core.lesson_location` and `cmi.suspend_data` (§2.2); `LMSCommit("")` at most once every 30 s and on every change of slide |
| completed (§3) | set `cmi.core.lesson_status` to `completed`; `LMSCommit("")` |
| `visibilitychange` to hidden | pause playback; `LMSCommit("")`. Do **not** finish |
| `pagehide` | set `cmi.core.session_time`; set `cmi.core.exit` to `suspend` unless completed (then `""`); `LMSCommit("")`; `LMSFinish("")`. Called at most once per page lifetime |
| `pageshow` with `persisted` after finishing (back/forward cache) | tracking is over for this page: the player keeps playing and shows a notice that progress is no longer recorded until the lesson is reopened from the LMS |

- `cmi.core.session_time` uses the SCORM 1.2 format `HHHH:MM:SS.SS`.
- Scores (`cmi.core.score.*`) and `passed`/`failed` are not used: an Egatari lesson has no assessment in 1.0.
- On any error the player keeps playing.

### 2.2 Location and suspend data

Steps are numbered by zero-based **ordinal** in timeline order (Egatari 1.0 §5.5).

- `cmi.core.lesson_location` (CMIString255, ASCII) is always `#<ordinal>` in canonical decimal, e.g. `#42`.
- `cmi.suspend_data` (at most 4096 characters) is the ASCII JSON

```json
{"v":1,"n":<number of steps>,"h":"<8 hex>","seen":"<base64url bitset>"}
```

- `h` is the first 8 hex digits of SHA-256 over the UTF-8 step keys in timeline order, each followed by LF.
- Bit *j* of `seen` corresponds to ordinal *j*: byte ⌊*j*/8⌋, bit *j* mod 8, least significant bit first; the bitset has ⌈*n*/8⌉ bytes, unused high bits are 0; base64url without padding.
- On resume (`entry` is `resume`), if `v`, `n` and `h` all match the current lesson, the player restores the visited steps and the position. Otherwise the lesson changed: it ignores both and starts at the beginning.
- A packager MUST refuse a lesson whose suspend data could exceed 4096 characters (more than about 3000 steps).

## 3. Completion

Completion follows Egatari 1.0 §9.2: by default every step has been reached at least once in any mode; `metadata.completion.visitedFraction` lowers the threshold; `metadata.completion.reachedEnd` requires only reaching the final step of the last slide. Once completed, the status is never set back to `incomplete`.

## 4. Conformance

An LMS Binding (SCORM 1.2) packager MUST produce packages as in §1. A player claiming this binding MUST implement §2 and §3. Conformance is checked with the fixtures in [`../fixtures/`](../fixtures/) and by importing a package into Moodle (activity type *SCORM package*) with these cases, recording the Moodle settings used (*Force new attempt*, *Force completed*, *standards mode*, *grading method*):

1. **Suspend/resume (incomplete):** start, visit some steps (skipping some), close; status is `incomplete`; reopen resumes at the last position with the visited set restored.
2. **Completion:** visit every step in order; status becomes `completed`.
3. **Review after completion:** reopen a completed attempt; status stays `completed` and nothing is overwritten.
4. **Changed lesson:** replace the package with a reordered lesson of the same length; resume data is ignored (`h` differs).
