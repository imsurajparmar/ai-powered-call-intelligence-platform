# Prompt log — CallIntel (Vibe Coding / AI-assisted development)

This document records **how we used LLMs in the product** and the **prompt strategy** for call analysis. Extend it with your own iteration notes (what failed, what you tightened, how you validated JSON).

---

## 1. Development methodology (Vibe Coding)

| Phase | What we asked the AI for | Outcome |
|--------|---------------------------|---------|
| Scaffolding | Next.js app structure, API routes, Prisma schema, data contracts | Monorepo shape for upload → transcribe → analyze → dashboards |
| Analysis design | Modular prompts vs single orchestrator; scoring formula | Parallel JSON tasks + **deterministic** overall score in code |
| UI iteration | Dashboard layout, charts, hackathon deliverables checklist | Iterative polish on home + dashboard + call detail |
| Debugging | Prisma version mismatch, Whisper file upload | Pinned `prisma` / `@prisma/client` to the same major version |

**Strategy:** Keep the **system role stable**, use **`response_format: json_object`** where possible, validate shapes in TypeScript, and **compute numeric rollups in code** instead of trusting the model for math.

---

## 2. Global system prompt (every analysis call)

Used as the `system` message for all chat completions in `src/lib/analysis.ts`:

```
You are CallIntel, an expert AI for analyzing sales call transcripts.
Your goals:
- Be accurate, concise, and practical for sales coaching.
- Use only information in the transcript and provided metadata.
- If unsure, state assumptions minimally.
- Always return STRICTLY VALID JSON that conforms to the provided schema.
- Do not include any commentary outside of JSON. No markdown. No explanations.
- Keep code blocks and formatting out of the JSON.
```

**Model settings (typical):** `temperature: 0.2`, model from `OPENAI_MODEL` (default `gpt-4o-mini`).

---

## 3. Modular user prompts (runtime)

All prompts are implemented in **`runAnalysis()`** in `src/lib/analysis.ts`. They run **in parallel** where independent (`Promise.all`), except talk-time LLM fallback when segments have no usable speaker durations.

| # | Task | Output shape (high level) |
|---|------|---------------------------|
| 1 | Summary + overall sentiment + sentiment timeline (binned) | `summary`, `overall_sentiment`, `sentiment_timeline[]` |
| 3 | Agent performance scores (1–10) + rationales | `agent_scores`, `rationales` |
| 4 | Questionnaire coverage (Q1–Q15 topics from `questionnaire.ts`) | `questionnaire_coverage[]`, `coverage_pct` |
| 5 | Keywords + counts (taxonomy-aware) | `top_keywords`, `keywords_counts` |
| 6 | Action items | `action_items[]` |
| 7 | Positive / negative coaching observations | `positive_observations`, `negative_observations` |
| 2 (conditional) | Talk-time estimate when diarization is missing | `talk_time` percentages |

**Not sent to the LLM:**

- **Overall call score** — computed in `computeOverallCallScore()` with the weighted formula (agent average, sentiment, questionnaire %, talk balance).
- **Main dashboard rollup** — aggregated in `src/lib/rollup.ts` from stored per-call insights.

---

## 4. Transcription (OpenAI Whisper)

- **API:** `openai.audio.transcriptions.create` with `model: "whisper-1"`, `response_format: "verbose_json"`.
- **Post-processing:** Segments get **alternating `agent` / `customer` labels** when the STT provider does not supply diarization (demo-friendly talk-time). Replace with Azure / Deepgram / AssemblyAI for real speaker labels.

---

## 5. Failure handling & iteration ideas

1. **JSON parse errors:** `parseJsonObject()` strips fences; consider a retry with `STRICT_FORMAT_REMINDER` appended to the user message.
2. **Long calls:** Chunk transcript (e.g. 5–8 min), run tasks per chunk, merge with a final summarizer prompt.
3. **Schema drift:** Add Zod validation on each JSON blob before persisting.

---

## 6. Where to edit prompts

- **All analysis prompts:** `src/lib/analysis.ts`
- **Questionnaire topics (Q1–Q15):** `src/lib/questionnaire.ts`
- **Insight types:** `src/lib/types.ts`

---

*Maintainers: append dated notes below when you change prompts or models.*

### Changelog (template)

| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Initial prompt log from hackathon scaffold | Team |
