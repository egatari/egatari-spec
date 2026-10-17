# Etoki LMS Binding: SCORM 1.2

**Status:** Editor's Draft, 2026-10-17. Part of [Etoki 1.0](../etoki-1.0.md) §9.2, §10 (LMS Binding).

SCORM 1.2 is the only packaging format that Moodle core tracks without plugins, and it is also supported by most other LMSs. This binding packages one Etoki file as a single-SCO SCORM 1.2 package and maps the player's tracking events to the SCORM 1.2 run-time API.

## 1. Package

A ZIP file containing, at its root:

| Path | Content |
|---|---|
| `imsmanifest.xml` | the manifest below |
| `index.html` | the Etoki file, **byte-for-byte unchanged** |

The package MUST NOT add other launch files or modify the Etoki file: extracting `index.html` from the package gives back the original lesson, still playable and editable. Packagers MAY add the SCORM 1.2 XSD files; LMSs do not require them.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="etoki-{docId}" version="1"
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

`{docId}` and `{metadata.title}` come from the Etoki index (XML-escaped). For a play-only file without an index, the packager uses a fresh UUID and the document `<title>`.

## 2. Run-time

The bridge is part of the Etoki player's tracking adapter (no separate script in the package). The player looks for the SCORM 1.2 `API` object by walking `window.parent` up to 7 levels and then `window.opener`, as in the ADL reference algorithm. If none is found, the player falls back to the next adapter (Etoki 1.0 §9.2).

| Player event | SCORM 1.2 calls |
|---|---|
| start | `LMSInitialize("")`. If `cmi.core.lesson_status` is `not attempted`, set it to `incomplete`. If `cmi.core.entry` is `resume`, restore position from `cmi.core.lesson_location` and visited steps from `cmi.suspend_data` |
| step reached | set `cmi.core.lesson_location` to the step key; update `cmi.suspend_data`; `LMSCommit("")` at most once every 30 s and on every change of slide |
| completed (§3) | set `cmi.core.lesson_status` to `completed`; `LMSCommit("")` |
| page hidden / unload (`pagehide`) | set `cmi.core.session_time`; set `cmi.core.exit` to `suspend` unless completed (then `""`); `LMSCommit("")`; `LMSFinish("")` |

- `cmi.core.lesson_location` is at most 255 characters. If a step key is longer, the player stores the step's ordinal number instead, prefixed with `#` (e.g. `#42`).
- `cmi.core.session_time` uses the SCORM 1.2 format `HHHH:MM:SS.SS`.
- Scores (`cmi.core.score.*`) and `passed`/`failed` are not used: an Etoki lesson has no assessment in 1.0.
- Every API call's return value is checked; on error the player keeps playing and logs `LMSGetLastError()`.

### 2.1 Suspend data

`cmi.suspend_data` (at most 4096 characters) holds

```json
{"v":1,"n":<number of steps>,"seen":"<base64url bitset>"}
```

where bit *j* of `seen` (least significant bit of the first byte first) is set when the *j*-th step in document order was reached. With 4096 characters this covers about 20 000 steps. A player that reads `v` it does not know, or `n` different from the current lesson, ignores the stored data (the lesson changed) and starts fresh, keeping only `lesson_location` if that step still exists.

## 3. Completion

Completion follows Etoki 1.0 §9.2: by default every step has been reached at least once in any mode; `metadata.completion.visitedFraction` lowers the threshold; `metadata.completion.reachedEnd` requires only reaching the final step of the last slide. Once completed, the status is never set back to `incomplete`.

## 4. Conformance

An LMS Binding (SCORM 1.2) packager MUST produce packages as in §1. A player claiming this binding MUST implement §2 and §3. Conformance is checked with the fixtures in [`../fixtures/`](../fixtures/) and by importing a package into Moodle (activity type SCORM package) and confirming: launch, status `incomplete` after start, `completed` after the last step, and resume at the last step after reopening.
