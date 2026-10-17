# Egatari extension `tutor` — Draft v1

**Status:** draft, 2026-10-17. Registered in [../extensions.md](../extensions.md). Consumed by hosts (Egatari spec §10.1) that hold a dialogue with the learner; players that ignore it render and time the lesson exactly the same.

`tutor` describes *where and how a host may talk with the learner* about a lesson: comprehension checkpoints, the scope an AI may draw on when answering, and lessons generated on the spot in answer to a question. Pausing, asking and branching are done by the host through the embedding interface (§9.4); the lesson itself is never modified.

## 1. Data (`extensions.tutor`)

```json
{
  "v": 1,
  "checkpoints": {
    "s-k3f9q2:concl": [
      {"id": "c1", "kind": "invite", "prompt": "ここまでで、わからないところはありますか。",
       "next": {"understood": "c2"}},
      {"id": "c2", "kind": "recall", "prompt": "では、学習率 η は何を決める値でしたか。",
       "keyPoints": ["1 歩の大きさ", "大きすぎると発散する"], "refs": ["s-k3f9q2:2"]}
    ]
  },
  "scope": "watched"
}
```

| Member | Meaning |
|---|---|
| `checkpoints` | step key → ordered list. The host MAY pause after that step (on `stepEnded`) and run them |
| `kind` | `invite` (open question: "anything unclear so far?") or `recall` (ask the learner to recall or explain something) |
| `prompt` | what the host says or shows; single line |
| `next` | transitions by the host's classification of the reply: `understood`, `unclear`, `noReply` → checkpoint id, or `"end"` |
| `keyPoints` | points a good answer contains, for the host's evaluation. **Withheld information**: hosts MUST serve learners a play-only derivative (§3.7) |
| `refs` | step keys the checkpoint is about (for retrieval and for jumping back) |
| `scope` | what an AI answering questions may draw on: `watched` (steps the learner has reached; default), `slide` (up to the end of the current slide), `all` |

Authoring in `narration.md` (spec §8.2): `@x-tutor-invite <prompt>` and `@x-tutor-recall <prompt>` lines under a step create checkpoints in order with generated ids; `@x-tutor-keypoint <text>` lines attach to the preceding recall. Transitions other than the default (`invite` → following `recall` when understood) require the JSON form.

## 2. Generated answers (branch lessons)

When a host answers a question with slides, it produces a **branch lesson**: a separate, small Egatari document with

- `metadata.derivedFrom = {docId, sourceSha256, anchor}` of the lesson and step it answers from;
- `metadata.authorship` marking its steps `by: "ai"`, `reviewed: false` until a teacher checks it;
- `metadata.audience = "individual"` when made for one learner.

The host plays the branch, then returns to the anchor. A teacher may promote a good branch into the original lesson as an ordinary edit. Branch lessons use the same components as the original (Core profile: registry components only), so they need no new code.

## 3. Open questions

- Classification of replies (`understood`/`unclear`) is host policy; should v1 fix a minimum vocabulary beyond these three?
- Whether recall results feed completion (`metadata.completion`) or stay host grading only (current answer: host grading only, §10.1-5).
