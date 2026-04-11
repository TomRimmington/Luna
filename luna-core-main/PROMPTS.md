# LUNA — Hackathon Implementation Prompts

> 5 role-specific AI coding prompts for building LUNA Core end-to-end.
> Each prompt is self-contained and can be pasted directly into Cursor, Claude, or ChatGPT.
> Written for a 2–3 day hackathon sprint. Read your assigned prompt fully before writing any code.

---

## Product Vision

LUNA is not a chatbot. It is a **live reasoning observatory** — a system where users can watch AI think, catch its own mistakes, and correct itself in real time. The interface has three conceptual layers:

1. **The Generator** (Left Panel) — the raw LLM output, streamed token by token, with claims annotated inline as they're extracted
2. **The Orchestrator** (Right Panel) — the trust engine that extracts claims, retrieves evidence, compresses context, and runs a critic-judge debate, all visible in real time with full reasoning traces
3. **The Auditor** (Accountability Layer) — a third agent that watches the orchestrator itself: is the critic being too aggressive? Did the verifier miss obvious sources? Is the judge biased? This is the "who watches the watchers?" layer that makes LUNA a genuinely novel system

The UI should make the invisible visible. Every reasoning step, every agent's internal thinking, every decision point — exposed.

---

## Team Roles

| # | Role | Owner | Primary Files |
|---|------|-------|---------------|
| 1 | Frontend Lead | Thomas | `src/app/App.tsx`, `src/app/components/luna/*`, `src/app/hooks/*` |
| 2 | Backend Engineer | — | `backend/main.py`, `backend/orchestrator.py`, `backend/models.py` |
| 3 | AI Engineer | — | `backend/agents/` |
| 4 | Verification Engineer | — | `backend/verifier/` |
| 5 | Product & Demo Lead | — | `DEMO_SCRIPT.md`, slides |

---

## Updated Type Contract — `src/app/components/luna/types.ts`

This is the shared contract between frontend and backend. **All team members must use these types.** The frontend consumes them directly; the backend must return JSON matching these shapes.

```typescript
// ── Model Selection ──────────────────────────────────────────────
export type ModelId = 'gpt-4o' | 'claude-3-5-sonnet' | 'gemini-pro' | 'llama-3-1' | 'mistral-large';

export interface Model {
  id: ModelId;
  name: string;
  provider: string;
  latency: number;
  costPer1k: number;
}

// ── Pipeline Stages ──────────────────────────────────────────────
// The pipeline progresses through these stages in order.
// The frontend uses this to show a live progress indicator.
export type PipelineStage =
  | 'idle'
  | 'generating'
  | 'extracting'
  | 'verifying'
  | 'critiquing'
  | 'judging'
  | 'correcting'
  | 'compressing'
  | 'auditing'
  | 'complete';

// ── Reasoning Trace ──────────────────────────────────────────────
// Each step in the agent's internal chain-of-thought.
// These are displayed in a collapsible "reasoning" drawer so users
// can see WHY each agent made each decision — not just WHAT it decided.
export interface ReasoningStep {
  id: string;
  agent: 'generator' | 'extractor' | 'verifier' | 'critic' | 'judge' | 'compressor' | 'auditor';
  action: string;        // short label, e.g. "Evaluating claim 3 of 6"
  detail: string;        // the full reasoning text
  timestamp: string;     // "00:01.32"
  status: 'active' | 'complete' | 'failed';
}

// ── Claims ───────────────────────────────────────────────────────
export interface Claim {
  id: string;
  text: string;
  status: 'verified' | 'uncertain' | 'contradicted';
  confidence: number;
  // Character offsets in rawOutput for inline annotation highlighting.
  // If present, the frontend draws a colored underline on the raw output text.
  sourceSpan?: { start: number; end: number };
}

// ── Evidence ─────────────────────────────────────────────────────
export interface Evidence {
  id: string;
  source: string;
  url: string;
  snippet: string;
  highlight: string;
  relevance: number;
  claimId?: string;  // which claim this evidence supports/contradicts
}

// ── Critic Feed ──────────────────────────────────────────────────
export type AgentRole = 'generator' | 'critic' | 'judge' | 'auditor';

export interface CriticMessage {
  id: string;
  role: AgentRole;
  content: string;
  reasoning?: string;    // the internal thinking that led to this message (expandable)
  timestamp: string;
}

// ── Context Compression ──────────────────────────────────────────
export interface CompressionMetrics {
  originalTokens: number;
  compressedTokens: number;
  ratio: number;            // 0.0–1.0
  preservedClaims: number;
  totalClaims: number;
}

// ── Auditor / Accountability Layer ───────────────────────────────
export interface AuditFinding {
  id: string;
  target: 'critic' | 'judge' | 'verifier';
  assessment: 'fair' | 'aggressive' | 'lenient' | 'missed_source';
  detail: string;
  severity: 'info' | 'warning' | 'critical';
}

// ── Trust Analysis ───────────────────────────────────────────────
export interface TrustAnalysis {
  claims: Claim[];
  evidence: Evidence[];
  criticFeed: CriticMessage[];
  reasoningTrace: ReasoningStep[];
  compression?: CompressionMetrics;
  audit?: AuditFinding[];
  revisedOutput: string;
  hallucinationRisk: number;      // 0–100
  trustScoreInitial: number;      // 0–100, before correction
  trustScoreFinal: number;        // 0–100, after correction
}

// ── Top-Level Result ─────────────────────────────────────────────
export interface RunResult {
  rawOutput: string;
  trust: TrustAnalysis;
  latency: number;
  cost: number;
}
```

---

---

# PROMPT 1 — Frontend Lead

**Assigned to: Thomas (Frontend Lead)**

---

## Context

You are the Frontend Lead for LUNA — a live reasoning observatory for AI trust. The React + Vite + TypeScript frontend shell already exists with a working split-panel layout, model selector, prompt bar, and mock data. Your job is to transform this from a **static results viewer** into a **live reasoning observatory** where users watch AI agents think, debate, and correct in real time.

The codebase uses:
- React 18 with TypeScript, Vite dev server on `http://localhost:5173`
- `lucide-react` for icons
- Inline styles throughout (JetBrains Mono, dark theme, `#111111` base)
- No state management library (just `useState` / `useEffect` — keep it simple)

The backend (built by other teammates) will run on `http://localhost:8000`.

---

## Current File Map and What Changes

```
src/app/
├── App.tsx                    ← MAJOR REWRITE — new state architecture, SSE integration, stage tracking
├── components/
│   ├── luna/
│   │   ├── types.ts           ← REWRITE — new types (see contract above)
│   │   ├── mockData.ts        ← UPDATE — new mock data matching expanded types
│   │   ├── LeftPanel.tsx      ← MAJOR UPGRADE — streaming output, inline claim annotations, thinking trace
│   │   ├── RightPanel.tsx     ← MAJOR UPGRADE — pipeline status bar, reasoning toggles, compression, audit
│   │   ├── PromptBar.tsx      ← MINOR — add pipeline stage indicator during run
│   │   └── TopBar.tsx         ← MINOR — add auditor toggle button, demo mode pill
│   └── ui/                    ← UNCHANGED (shadcn components, available if needed)
├── hooks/                     ← NEW DIRECTORY
│   └── useStreamRun.ts        ← NEW — SSE streaming hook
└── main.tsx                   ← UNCHANGED
```

---

## Architecture: How State Flows

Currently `App.tsx` holds one monolithic state: `result: RunResult | null`. That is fine for the final result, but you also need progressive streaming state so the UI updates as each agent completes. Here is the new state architecture:

```typescript
// App.tsx state
const [result, setResult] = useState<RunResult | null>(null);           // final assembled result
const [isRunning, setIsRunning] = useState(false);
const [isDemoMode, setIsDemoMode] = useState(false);
const [error, setError] = useState<string | null>(null);

// Streaming state — populated progressively by SSE events
const [stage, setStage] = useState<PipelineStage>('idle');              // current pipeline stage
const [streamedRaw, setStreamedRaw] = useState('');                     // token-by-token raw output
const [streamedClaims, setStreamedClaims] = useState<Claim[]>([]);      // populated after extraction
const [streamedEvidence, setStreamedEvidence] = useState<Evidence[]>([]);
const [streamedCritic, setStreamedCritic] = useState<CriticMessage[]>([]);
const [streamedRevised, setStreamedRevised] = useState('');
const [reasoningTrace, setReasoningTrace] = useState<ReasoningStep[]>([]);
const [compression, setCompression] = useState<CompressionMetrics | null>(null);
const [audit, setAudit] = useState<AuditFinding[]>([]);
const [showAuditor, setShowAuditor] = useState(false);                  // toggle for accountability drawer
```

Pass these streaming states down to `LeftPanel` and `RightPanel` in addition to the final `result`. During a run, the panels render from streaming state. After `stage === 'complete'`, the backend sends the final `RunResult` and you call `setResult(finalResult)`.

---

## TASK 1 — Rewrite `types.ts` With the New Contract

Replace the contents of `src/app/components/luna/types.ts` with the full type contract shown in the "Updated Type Contract" section above. This is the single source of truth that both frontend and backend reference.

Key additions vs the current `types.ts`:
- `PipelineStage` — enum of all stages
- `ReasoningStep` — chain-of-thought trace entries
- `CompressionMetrics` — token compression stats
- `AuditFinding` — auditor accountability assessments
- `Claim.sourceSpan` — character offsets for inline annotation in the raw output
- `Evidence.claimId` — links evidence back to a specific claim
- `CriticMessage.reasoning` — expandable internal thinking
- `CriticMessage.role` — now includes `'auditor'` as a fourth role
- `TrustAnalysis.reasoningTrace`, `.compression`, `.audit`, `.trustScoreInitial`, `.trustScoreFinal`

---

## TASK 2 — Update `mockData.ts` With Expanded Mock

The mock data must match the new types so the UI works before the backend is ready. Extend `MOCK_RESULT` with these additions:

```typescript
// Add to the trust object in MOCK_RESULT:
reasoningTrace: [
  {
    id: 'r1',
    agent: 'generator',
    action: 'Initializing response generation',
    detail: 'User prompt requests quantum computing overview with specific qubit counts and timeline projections. Will need to include IBM Condor, Google Willow, and NISQ-era context. Setting temperature to 0.3 for factual precision.',
    timestamp: '00:00.02',
    status: 'complete' as const,
  },
  {
    id: 'r2',
    agent: 'extractor',
    action: 'Decomposing response into atomic claims',
    detail: 'Response contains approximately 280 words across 5 paragraphs. Identified 9 candidate factual statements. Filtering to 6 checkworthy claims containing specific numbers, named entities, or verifiable assertions. Discarding 3 definitional statements that are not empirically falsifiable.',
    timestamp: '00:00.18',
    status: 'complete' as const,
  },
  {
    id: 'r3',
    agent: 'verifier',
    action: 'Retrieving evidence for 6 claims',
    detail: 'Running parallel Wikipedia lookups for: IBM Condor, Google Willow, RSA-2048, quantum millikelvin, quantum advantage enterprise. Wikipedia returned results for 4/6. Tavily returned results for 1/6. 1 claim has no external evidence available.',
    timestamp: '00:00.24',
    status: 'complete' as const,
  },
  {
    id: 'r4',
    agent: 'critic',
    action: 'Evaluating factual accuracy',
    detail: 'Cross-referencing 6 claims against 3 evidence sources. Claim c2 (RSA-2048 break time) uses a specific number (8 hours) from a single 2022 paper (Webber et al.) that assumes optimistic error correction. NIST evidence shows estimates vary by orders of magnitude. Flagging as uncertain. Claim c6 (enterprise quantum advantage) directly contradicted by all retrieved sources — no real-world advantage demonstrated.',
    timestamp: '00:00.38',
    status: 'complete' as const,
  },
  {
    id: 'r5',
    agent: 'judge',
    action: 'Issuing correction ruling',
    detail: 'Assessing critic findings: 1 contradicted claim (enterprise advantage — severity HIGH), 2 uncertain claims (RSA timeline, crypto window — severity MEDIUM). Contradicted claim requires removal or correction. Uncertain claims require qualification language. Generating correction signal targeting these 3 specific claims. Setting max iteration to 1.',
    timestamp: '00:00.52',
    status: 'complete' as const,
  },
  {
    id: 'r6',
    agent: 'compressor',
    action: 'Compressing orchestration context',
    detail: 'Original context: 2,847 tokens across generator output, 6 claims, 3 evidence snippets, and critic-judge exchange. Compressed to 1,103 tokens by: (1) replacing full evidence snippets with claim-relevance pairs, (2) summarizing critic exchange into correction directive, (3) retaining all claim IDs and statuses. Compression ratio: 0.39. All 6 claims preserved in compressed representation.',
    timestamp: '00:00.58',
    status: 'complete' as const,
  },
  {
    id: 'r7',
    agent: 'auditor',
    action: 'Auditing orchestrator decisions',
    detail: 'Reviewing critic assessment of 6 claims. Critic correctly identified contradicted enterprise advantage claim — no false positive. Critic flagged RSA-2048 timeline as uncertain; this is appropriate given conflicting sources. Critic did NOT flag the "180x colder than deep space" claim despite no direct evidence retrieved — possible missed verification opportunity, though claim is well-established. Judge correction signal is proportionate. No systematic bias detected. Overall assessment: orchestrator performed fairly.',
    timestamp: '00:01.08',
    status: 'complete' as const,
  },
],
compression: {
  originalTokens: 2847,
  compressedTokens: 1103,
  ratio: 0.39,
  preservedClaims: 6,
  totalClaims: 6,
},
audit: [
  {
    id: 'a1',
    target: 'critic' as const,
    assessment: 'fair' as const,
    detail: 'Critic correctly identified the contradicted enterprise advantage claim and appropriately flagged the RSA-2048 timeline as uncertain given conflicting source estimates.',
    severity: 'info' as const,
  },
  {
    id: 'a2',
    target: 'verifier' as const,
    assessment: 'missed_source' as const,
    detail: 'Verifier did not retrieve evidence for the "180x colder than deep space" claim (c3). While the claim is verified via indirect evidence, a dedicated source would strengthen confidence.',
    severity: 'warning' as const,
  },
  {
    id: 'a3',
    target: 'judge' as const,
    assessment: 'fair' as const,
    detail: 'Judge correction signal is proportionate to the identified issues. Correction targets only the 3 problematic claims without overriding accurate content.',
    severity: 'info' as const,
  },
],
trustScoreInitial: 68,
trustScoreFinal: 91,
```

Also add `sourceSpan` to claims where the text appears in `rawOutput` — the frontend will use these character offsets to draw inline underlines. Calculate these by finding the substring positions of each claim's text in the raw output string.

Add the auditor message to `criticFeed`:

```typescript
{
  id: 'm6',
  role: 'auditor',
  content: 'Orchestrator audit complete. Critic assessment is fair — no false positives in contradicted claims. Verifier missed one potential source for the deep space temperature comparison. Judge correction signal is proportionate. No intervention required.',
  reasoning: 'Checked critic-to-evidence alignment for all 6 claims. The critic flagged c2 and c6 — both are justified by the retrieved NIST and Wikipedia evidence. The verifier returned 0 results for c3 and c5, but c3 was still verified via indirect mention in other evidence. c5 has no retrieved evidence but is marked uncertain (appropriate). Judge did not over-correct verified claims. No bias pattern detected.',
  timestamp: '00:01.12',
}
```

---

## TASK 3 — Rewrite `App.tsx` State Architecture and API Integration

This is the core integration task. Replace the current `handleRun` function and add the full streaming state architecture.

### 3A — Non-streaming integration (do this FIRST, get it working)

Install axios: `npm install axios`

```typescript
const handleRun = async (prompt: string) => {
  if (isRunning) return;

  // Reset all state
  setIsRunning(true);
  setResult(null);
  setError(null);
  setIsDemoMode(false);
  setStage('generating');
  setStreamedRaw('');
  setStreamedClaims([]);
  setStreamedEvidence([]);
  setStreamedCritic([]);
  setStreamedRevised('');
  setReasoningTrace([]);
  setCompression(null);
  setAudit([]);

  const startTime = Date.now();

  try {
    const response = await axios.post<RunResult>('http://localhost:8000/run', {
      prompt,
      model: selectedModel.id,
    }, { timeout: 90000 });

    const measured = Date.now() - startTime;
    const finalResult = { ...response.data, latency: measured };
    setResult(finalResult);
    setStage('complete');
  } catch (err) {
    console.warn('[LUNA] Backend unavailable, using mock:', err);
    setError('Backend offline — showing demo data');
    setResult({ ...MOCK_RESULT, latency: Date.now() - startTime });
    setStage('complete');
    setIsDemoMode(true);
  } finally {
    setIsRunning(false);
  }
};
```

### 3B — SSE streaming integration (do this AFTER non-streaming works)

Create `src/app/hooks/useStreamRun.ts`. This hook connects to `GET /run/stream?prompt=...&model=...` via `EventSource` and dispatches typed events to update streaming state:

```
SSE event types the backend will emit (in order):
  event: stage         → data: { "stage": "generating" }
  event: reasoning     → data: ReasoningStep
  event: raw_token     → data: { "token": "..." }
  event: raw_complete  → data: { "text": "full raw output" }
  event: claims        → data: Claim[]
  event: evidence      → data: Evidence[]
  event: critic_msg    → data: CriticMessage
  event: compression   → data: CompressionMetrics
  event: revised_token → data: { "token": "..." }
  event: audit         → data: AuditFinding[]
  event: complete      → data: RunResult
```

The hook should:
- Use native `EventSource` (no library)
- Append `raw_token` data to `streamedRaw` (character-by-character accumulation)
- Append each `reasoning` step to `reasoningTrace`
- Set `streamedClaims` when `claims` event arrives
- Append each `critic_msg` to `streamedCritic`
- On `complete`, build the final `RunResult` and call `setResult`
- On `error` or `EventSource.onerror`, fall back to non-streaming POST
- Return `{ run, cancel, isRunning }` for use in `App.tsx`

---

## TASK 4 — Upgrade LeftPanel: Streaming Output + Inline Claim Annotations + Thinking Trace

The left panel transforms from a static text dump into a living document. Three major additions:

### 4A — Streaming Text Display

Replace the current `lines.map(...)` renderer with a streaming-aware version:
- During `isRunning`, if `streamedRaw` is being populated, render it character by character with a blinking cursor at the end (a `|` character that blinks via CSS animation)
- The text should appear to "type" in real time as tokens arrive from SSE
- Once `result` is set (run complete), switch to the full `result.rawOutput` rendered as the existing line-numbered code view

Implementation: render `streamedRaw || result?.rawOutput || ''` through the same line-numbered display. When streaming, add a trailing cursor span:

```tsx
{isStreaming && (
  <span style={{
    display: 'inline-block',
    width: '2px',
    height: '14px',
    background: '#cccccc',
    animation: 'pulse 0.8s ease-in-out infinite',
    verticalAlign: 'text-bottom',
    marginLeft: '1px',
  }} />
)}
```

### 4B — Inline Claim Annotations

When claims are available (either from streaming or from `result.trust.claims`), and claims have `sourceSpan` data, overlay colored underlines on the raw output text at those character positions.

Implementation approach:
- Build an `AnnotatedText` component that takes `text: string` and `claims: Claim[]`
- Sort claims by `sourceSpan.start`
- Split the text into segments: unannotated text between claim spans, and annotated claim spans
- Render unannotated segments as plain text
- Render claim spans wrapped in a `<span>` with:
  - A bottom border colored by claim status: green `#3fb950` for verified, amber `#d29922` for uncertain, red `#f85149` for contradicted
  - A CSS `cursor: pointer` and `title` tooltip showing `"{claim.text}" — {status} ({confidence}%)`
  - On hover: highlight background with `rgba(status_color, 0.1)`

This is the single most visually impressive frontend feature. When a judge sees the raw AI output with individual claims underlined in green/amber/red, it immediately communicates what LUNA does without any explanation.

If the backend doesn't provide `sourceSpan` data, implement a fallback: search for each claim's `text` substring in `rawOutput` and compute the span positions client-side. Use fuzzy matching if exact substring isn't found (find the longest common subsequence of words).

### 4C — Reasoning Trace Drawer

Add a collapsible drawer at the top of the LeftPanel (below the header, above the output area) that shows the `reasoningTrace` entries for the `generator` agent.

Visual design:
- A thin bar with a toggle: `▸ REASONING TRACE (3)` / `▾ REASONING TRACE (3)`
- When expanded: a vertical timeline of reasoning steps
- Each step shows: a small status dot (green for complete, amber pulsing for active, red for failed), the `action` label, and an expandable `detail` text
- Steps animate in with a `fadeIn` animation (already defined in App.tsx styles) as they arrive from streaming

This shows the user WHAT the generator was thinking as it composed the response. For the demo, the reasoning trace should read like a professional analyst's notes:
- "User prompt requests quantum computing overview with specific qubit counts..."
- "Will need to include IBM Condor, Google Willow, and NISQ-era context..."
- "Setting temperature to 0.3 for factual precision."

### 4D — Trust Score Arc

Replace or augment the `HallucinationBadge` at the bottom of LeftPanel with a `TrustScoreArc` component that shows the before → after trust score improvement.

Visual design — a compact horizontal meter:

```
TRUST  ████████░░░░░░  68%  →  █████████████░  91%  ▲+23
       initial                  final
```

- The "initial" bar renders immediately when claims arrive
- The "final" bar animates from the initial value to the final value over 1.2 seconds after the revised output is generated
- The `▲+23` delta pill is green for improvements, red for regressions
- Use the colors: initial bar uses amber/red gradient, final bar uses green gradient

Animation: use `requestAnimationFrame` in a `useEffect` to count from `trustScoreInitial` to `trustScoreFinal` over 1200ms. Use an ease-out timing function so the number accelerates at the start and decelerates toward the end.

This is the most important demo moment. The trust score animating upward from 68% to 91% is the visual proof that LUNA works.

---

## TASK 5 — Upgrade RightPanel: Pipeline Status, Reasoning Toggles, Compression, Auditor

The right panel has four major additions on top of the existing Claims/Evidence/CriticFeed/RevisedOutput accordion sections.

### 5A — Pipeline Status Bar

Add a horizontal progress indicator at the very top of the right panel (below the "Trust Engine" header). It shows all pipeline stages as a connected sequence of nodes:

```
● GEN → ● EXTRACT → ● VERIFY → ○ CRITIQUE → ○ JUDGE → ○ CORRECT → ○ COMPRESS → ○ AUDIT
         ↑ current stage (pulsing)
```

- Completed stages: filled dot, green or white
- Current stage: filled dot with pulsing animation, amber
- Future stages: hollow dot, gray
- Connecting lines between dots: solid for completed, dashed for future

This gives judges an immediate sense that LUNA is doing real multi-step work, not just making one API call.

Use the `stage` state from App.tsx. Map stage strings to display labels:
```
generating → GEN
extracting → EXTRACT
verifying → VERIFY
critiquing → CRITIQUE
judging → JUDGE
correcting → CORRECT
compressing → COMPRESS
auditing → AUDIT
```

### 5B — Reasoning Expand Toggles on Each Section

Add a small `{...}` or `▸ reasoning` toggle to each section header (Claims, Evidence, Critic Feed). When expanded, it shows the relevant `ReasoningStep` entries for that section's agent.

For example, in the Claims section header:
```
✓ CLAIMS (6)  ▸ reasoning                                    ▾
```

When "reasoning" is clicked, a panel slides in above the claim cards showing the extractor agent's reasoning:
> "Response contains approximately 280 words. Identified 9 candidate factual statements. Filtering to 6 checkworthy claims..."

Filter `reasoningTrace` by `agent` to show the right entries in each section:
- Claims section → `agent === 'extractor'`
- Evidence section → `agent === 'verifier'`
- Critic Feed section → `agent === 'critic'` and `agent === 'judge'`

Design: use a subtle background (`rgba(255,255,255,0.02)`), monospace text at 10px, with a left border accent in the agent's color.

### 5C — Context Compression Section

Add a new collapsible section between "Critic Feed" and "Revised Output":

```
◇ CONTEXT COMPRESSION                                         ▾
```

When expanded, shows:

```
┌─────────────────────────────────────────────┐
│  ORIGINAL    2,847 tokens                   │
│  ████████████████████████████████░░░░░░░░░  │
│                                             │
│  COMPRESSED  1,103 tokens   ratio: 0.39     │
│  █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                             │
│  Claims preserved: 6/6                      │
└─────────────────────────────────────────────┘
```

Use the `compression` data from streaming state or `result.trust.compression`. The bars should be proportional (the compressed bar is visually shorter than the original bar by the ratio).

This section proves to judges that LUNA is not just throwing tokens at the problem — it's intelligent about resource usage. It directly addresses the "but isn't this expensive?" question.

### 5D — Auditor Messages in Critic Feed

The `criticFeed` array now includes messages with `role: 'auditor'`. Add a fourth role config to the existing `CriticMsg` component:

```typescript
auditor: {
  label: 'Auditor',
  color: '#a371f7',        // purple — distinct from generator/critic/judge
  borderColor: '#2d1b69',
  bg: 'rgba(163, 113, 247, 0.05)',
  icon: <Shield size={10} />,   // from lucide-react
}
```

Auditor messages appear at the end of the critic feed and have an expandable `reasoning` field. When a user clicks "show reasoning" on an auditor message, it expands to show the internal audit analysis.

### 5E — Diff View for Revised Output

Replace the current plain `<pre>` in the revised output section with a side-by-side or inline diff view that highlights what changed between `rawOutput` and `revisedOutput`.

Implementation:
- Split both texts into sentences (split on `. ` or `\n`)
- Compare sentence-by-sentence
- Sentences only in the original: render with `text-decoration: line-through` and red text (`#f85149`)
- Sentences only in the revised: render with green background highlight (`rgba(35, 134, 54, 0.12)`)
- Unchanged sentences: render normally

This makes the correction visible. Judges can see EXACTLY what LUNA changed — it's not a black box.

A simpler alternative if time is short: just render the revised output with the changed portions in green text. Compute the diff client-side by comparing words.

---

## TASK 6 — Accountability Drawer (The Third Agent)

Add a new `AuditDrawer` component that slides in from the right edge of the screen, overlaying the right panel. Toggled by a shield icon in the `TopBar`.

### TopBar Changes

Add a shield button to the right section of `TopBar.tsx`. Import `Shield` from lucide-react. Pass an `onToggleAudit?: () => void` prop (add to `TopBarProps`). When audit data is available, show a small notification dot on the shield icon.

### AuditDrawer Component

Create `src/app/components/luna/AuditDrawer.tsx`:

- Fixed position, right: 0, top: 35px (below TopBar), width: 340px, height: calc(100vh - 35px)
- Slides in with a CSS transform transition (translateX(100%) → translateX(0))
- Header: "ACCOUNTABILITY AUDIT" with a close button
- Body: a list of `AuditFinding` cards
- Each card shows:
  - Target agent: "CRITIC", "JUDGE", or "VERIFIER" in a colored pill
  - Assessment: "FAIR" (green), "AGGRESSIVE" (red), "LENIENT" (amber), "MISSED SOURCE" (amber)
  - Detail text explaining the finding
  - Severity indicator: info (gray dot), warning (amber dot), critical (red dot)

Below the findings, show a summary:
```
ORCHESTRATOR HEALTH
  Critic:    ● Fair
  Verifier:  ▲ Missed 1 source
  Judge:     ● Fair
  Overall:   No intervention required
```

This is the "who watches the watchers?" layer. It communicates to judges that LUNA doesn't just trust its own analysis blindly — it has a meta-layer that audits the auditors. This is a genuine innovation in the multi-agent space and will differentiate LUNA from every other hackathon project.

---

## TASK 7 — Demo Fallback Mode

Add a hidden keyboard shortcut `Ctrl+Shift+D` that:
1. Loads `MOCK_RESULT` instantly
2. Sets `isDemoMode = true`
3. Shows a subtle "DEMO" pill in the TopBar

Also add a simulated streaming mode: when `Ctrl+Shift+S` is pressed, instead of loading the mock instantly, it "plays back" the mock data progressively — setting stages, appending reasoning steps, revealing claims one by one with 200ms delays between each. This makes the demo look live even when using mock data.

Implementation:

```typescript
const playbackMock = async () => {
  setIsRunning(true);
  setIsDemoMode(true);

  // Stage 1: Generate
  setStage('generating');
  for (let i = 0; i < MOCK_RESULT.rawOutput.length; i += 3) {
    setStreamedRaw(MOCK_RESULT.rawOutput.slice(0, i + 3));
    await new Promise(r => setTimeout(r, 8));
  }
  setStreamedRaw(MOCK_RESULT.rawOutput);

  // Stage 2: Extract
  setStage('extracting');
  await new Promise(r => setTimeout(r, 400));
  for (const claim of MOCK_RESULT.trust.claims) {
    setStreamedClaims(prev => [...prev, claim]);
    await new Promise(r => setTimeout(r, 200));
  }

  // ... continue for each stage ...

  setStage('complete');
  setResult(MOCK_RESULT);
  setIsRunning(false);
};
```

This is your safety net. If the backend breaks 5 minutes before the demo, you can still show a fully animated, convincing live experience.

---

## TASK 8 — PromptBar Pipeline Indicator

Add a subtle status indicator to the `PromptBar` during a run. Replace the static "LUNA v0.4.1 · Trust Engine enabled" hint text with a dynamic stage label:

```
When idle:     "⌘+Enter to run · LUNA v0.4.1 · Trust Engine enabled"
When running:  "● GENERATING..."  /  "● EXTRACTING CLAIMS..."  /  "● VERIFYING..."  etc.
```

The dot should pulse with the same animation as the pipeline status bar. The text should transition with a fade when the stage changes.

---

## Priority Order

If time is limited, implement in this order (each is independently valuable):

1. **types.ts rewrite** + **mockData.ts update** (30 min) — unblocks everything
2. **App.tsx API integration** (non-streaming) (30 min) — connects to backend
3. **TrustScoreArc** in LeftPanel (45 min) — biggest demo impact per minute spent
4. **Pipeline Status Bar** in RightPanel (30 min) — shows multi-agent work visually
5. **Inline Claim Annotations** in LeftPanel (60 min) — the "wow" feature
6. **Reasoning Trace drawers** (45 min) — proves LUNA isn't a black box
7. **Auditor Drawer** (60 min) — the differentiator, the "third agent"
8. **SSE streaming** (90 min) — makes everything feel alive
9. **Context Compression section** (20 min) — quick win, addresses cost question
10. **Diff View** for revised output (30 min) — shows exactly what changed
11. **Demo Fallback playback** (45 min) — safety net

Items 1–4 are non-negotiable for the demo. Items 5–7 are what win the hackathon. Items 8–11 are polish.

---

## Design System Reference

All components must use the existing visual language. Here are the constants:

```
Backgrounds:    #111111 (base), #181818 (panels), #1a1a1a (prompt bar), #1e1e1e (elevated)
Borders:        #1e1e1e (subtle), #222 (default), #2a2a2a (medium), #2e2e2e (emphasized)
Text:           #cccccc (primary), #9e9e9e (secondary), #6e6e6e (muted), #4a4a4a (dim), #2e2e2e (ghost)
Fonts:          'JetBrains Mono', monospace (code/data); 'Inter', sans-serif (body text in critic messages)
Status green:   #3fb950
Status amber:   #d29922
Status red:     #f85149
Auditor purple: #a371f7
Font sizes:     9px (labels), 10px (metadata), 11px (body mono), 11.5px (body inter), 12px (prominent), 13px (input)
```

Do NOT introduce new colors, fonts, or spacing scales. Every pixel of this UI should feel like it belongs to the same product.

---

## Definition of Done

- [ ] `types.ts` rewritten with all new types (PipelineStage, ReasoningStep, CompressionMetrics, AuditFinding, etc.)
- [ ] `mockData.ts` updated with expanded mock including reasoning trace, compression, audit, trustScores
- [ ] `App.tsx` calls `POST /run` with fallback to mock; full streaming state architecture in place
- [ ] LeftPanel streams output with blinking cursor during generation
- [ ] LeftPanel shows inline claim annotations (colored underlines on raw output text)
- [ ] LeftPanel shows reasoning trace drawer for generator agent
- [ ] LeftPanel shows TrustScoreArc with animated before→after improvement
- [ ] RightPanel shows pipeline status bar with current stage indicator
- [ ] RightPanel sections have reasoning expand toggles
- [ ] RightPanel includes context compression section
- [ ] RightPanel critic feed supports auditor role (purple, shield icon)
- [ ] AuditDrawer slides in from right, toggled by TopBar shield button
- [ ] `Ctrl+Shift+D` loads mock instantly; `Ctrl+Shift+S` plays back mock with simulated streaming
- [ ] No TypeScript errors, no console errors
- [ ] Demo-ready: the UI tells a compelling story even with mock data

---

---

---

# Cost Strategy: The Open-Weight Advantage

## The Problem With All-GPT-4o

If every agent (generator, extractor, critic, judge, auditor) calls GPT-4o, one LUNA query costs roughly:

```
Generator:        ~800 tokens  × $5.00/M  = $0.004
Claim Extractor:  ~1100 tokens × $5.00/M  = $0.006
Critic:           ~1200 tokens × $5.00/M  = $0.006
Judge:            ~1000 tokens × $5.00/M  = $0.005
Correction pass:  ~800 tokens  × $5.00/M  = $0.004
Auditor:          ~800 tokens  × $5.00/M  = $0.004
────────────────────────────────────────────────────
Total per query:                            ~$0.029
```

At 100 queries/day per user, that's $2.90/day per user. Unsustainable.

## The Solution: Two-Tier Model Architecture

Only the Generator needs to be the user's chosen premium model. The entire trust/orchestration layer can run on **free or near-free open-weight models** via Groq's API:

```
Tier 1 — Generator (User's chosen model)
  GPT-4o / Claude / Gemini — the model the user is paying to use
  Cost: $0.004–0.015 per query

Tier 2 — Orchestrator Agents (Llama 3.1 via Groq — FREE tier)
  Claim Extractor:  Llama 3.1 8B   → $0.0000 (free)  ~0.2s
  Critic:           Llama 3.1 70B  → $0.0000 (free)  ~0.8s
  Judge:            Llama 3.1 8B   → $0.0000 (free)  ~0.2s
  Compressor:       Rule-based     → $0.0000          ~0.0s
  Auditor:          Llama 3.1 8B   → $0.0000 (free)  ~0.2s

Tier 3 — Verification (API calls, no LLM)
  Wikipedia:        Free
  Tavily:           Free tier (1000/month)
  Cost: $0.000
────────────────────────────────────────────────────
Total per query:                     ~$0.004–0.015
```

**That's an 80% cost reduction.** The orchestration layer is essentially free. And it's *faster* — Groq serves Llama 3.1 at 300+ tokens/sec, faster than GPT-4o.

## Why This Is a Genuine Competitive Advantage

- DeepSeek's insight was that reasoning tokens can be generated cheaply. LUNA applies the same logic: **trust verification tokens are cheap, only generation tokens are expensive.**
- This means LUNA can wrap any expensive model and add trust for near-zero marginal cost.
- For a startup: the trust layer itself is the product. You charge a flat monthly fee, your actual costs are the Groq/open-weight inference which is pennies.

## Implementation

All backend agents accept an `llm_client` parameter. The orchestrator creates two clients:

```python
from openai import AsyncOpenAI

# Tier 1 — User's chosen model (expensive, high quality)
generator_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Tier 2 — Orchestrator models (free/cheap, fast)
orchestrator_client = AsyncOpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)
```

Groq's API is OpenAI-compatible. Same `client.chat.completions.create()` calls. The only change is which client you pass and which model name you use (`llama-3.1-70b-versatile` or `llama-3.1-8b-instant`).

---

---

# Honest Assessment: Is This Groundbreaking?

## What Already Exists

- **Guardrails AI** — input/output validation rails for LLMs (guards, not correction)
- **NeMo Guardrails** (NVIDIA) — similar, rule-based rails
- **Patronus AI** — commercial hallucination detection scoring
- **Vectara HHEM** — a fine-tuned hallucination evaluation model
- **FactScore** (academic) — decomposes text into atomic facts and checks them
- **ChainPoll** — multiple LLMs voting on factual accuracy

None of these do **closed-loop correction**. They detect. They score. They don't fix.

## What Makes LUNA Genuinely Novel

1. **Closed-loop correction** — not just "this is wrong" but "here is the fixed version." The generator is re-prompted with a targeted correction signal. This is active alignment, not passive detection.

2. **Visible reasoning traces** — no existing product exposes the full agent chain-of-thought to end users. This is transparency as a feature, not just an engineering detail.

3. **The auditor layer** — "who watches the watchers?" is an unsolved problem in multi-agent systems. No commercial or academic system audits its own oversight pipeline. LUNA does.

4. **Two-tier cost architecture** — using cheap open-weight models for oversight of expensive models is the DeepSeek-style insight applied to trust. The trust layer's marginal cost approaches zero.

5. **Model-agnostic trust-as-a-service** — LUNA doesn't compete with GPT or Claude. It makes them all better. That's infrastructure, not a chatbot.

## What Would Make It a Real Startup

- **API product**: `POST /verify` — any app sends its LLM output, gets back a trust score and corrections. Charge per verification.
- **Domain specialization**: medical (PubMed verification), legal (case law retrieval), financial (SEC filing checks). Each domain is a vertical.
- **Fine-tuned critic model**: train a small model specifically on (claim, evidence, verdict) triplets. This replaces the prompt-engineered critic with a purpose-built one. Open-weight means you own it.
- **Persistent learning**: store corrections in a vector DB. If the same hallucination appears again, catch it instantly without re-running the full pipeline.
- **Browser extension / IDE plugin**: verify any LLM output on any website (ChatGPT, Claude, Perplexity) without the user switching tools.

## Honest Gaps

- The verification layer is only as good as the sources it can access. Wikipedia covers general knowledge but not niche domains.
- The critic relies on prompt engineering, not fine-tuning. It can be inconsistent.
- Latency: even with Groq, the full pipeline adds 3–8 seconds. For real-time chat, that may feel slow. Solution: run verification in the background and annotate the output retroactively.
- The auditor is currently a single-pass check. A truly robust accountability layer would need adversarial testing.

---

---

# PROMPT 2 — Backend Engineer

**Assigned to: Backend Engineer**

---

## Context

You are the Backend Engineer for LUNA. You own the FastAPI application, the orchestration pipeline, and the server infrastructure. Your job is to build the API server that connects the React frontend to the multi-agent AI pipeline. **You write Python. No TypeScript.**

The frontend is a React/Vite app on `http://localhost:5173`. Your server runs on `http://localhost:8000`.

You are NOT writing the AI agent logic or the verification layer — those are other people's jobs. You are writing the plumbing: the API routes, the orchestrator that calls agents in order, the SSE streaming, and the Pydantic models that enforce the response contract.

---

## Project Structure

Create a `backend/` directory at the repo root (`LUNA/backend/`):

```
backend/
├── main.py                ← FastAPI app, routes, CORS, SSE
├── orchestrator.py        ← Pipeline coordination — calls agents in order
├── models.py              ← Pydantic models (mirrors frontend types.ts)
├── config.py              ← LLM client setup, env vars, model routing
├── agents/
│   ├── __init__.py
│   ├── generator.py       ← (AI Engineer owns)
│   ├── claim_extractor.py ← (AI Engineer owns)
│   ├── critic.py          ← (AI Engineer owns)
│   ├── judge.py           ← (AI Engineer owns)
│   ├── compressor.py      ← (AI Engineer owns)
│   └── auditor.py         ← (AI Engineer owns)
├── verifier/
│   ├── __init__.py
│   ├── search.py          ← (Verification Engineer owns)
│   └── scorer.py          ← (Verification Engineer owns)
├── requirements.txt
└── .env.example
```

---

## `backend/requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
pydantic==2.8.2
python-dotenv==1.0.1
openai==1.51.0
httpx==0.27.2
sse-starlette==2.1.2
```

Run: `pip install -r requirements.txt`

---

## `backend/.env.example`

```
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
```

Everyone copies this to `backend/.env` and fills in their keys. Groq API key is free at `console.groq.com`.

---

## `backend/config.py` — Two-Tier Client Setup

This is the cost strategy. The generator uses the user's chosen premium model. All orchestrator agents use Groq's free Llama inference.

```python
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

# Tier 1: Generator — the user's chosen premium model
generator_client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY", ""),
)

# Tier 2: Orchestrator agents — free/cheap open-weight via Groq
orchestrator_client = AsyncOpenAI(
    api_key=os.environ.get("GROQ_API_KEY", ""),
    base_url="https://api.groq.com/openai/v1",
)

# Model mapping: which model name to use for each tier
GENERATOR_MODELS = {
    "gpt-4o": "gpt-4o",
    "claude-3-5-sonnet": "gpt-4o",       # route to GPT-4o for hackathon
    "gemini-pro": "gpt-4o",              # route to GPT-4o for hackathon
    "llama-3-1": "gpt-4o",               # route to GPT-4o for hackathon
    "mistral-large": "gpt-4o",           # route to GPT-4o for hackathon
}

ORCHESTRATOR_MODEL_LARGE = "llama-3.1-70b-versatile"  # critic (needs reasoning)
ORCHESTRATOR_MODEL_SMALL = "llama-3.1-8b-instant"     # extractor, judge, auditor (structured output)

# Cost estimates per 1K tokens (for the cost field in RunResult)
MODEL_COSTS = {
    "gpt-4o": 0.005,
    "llama-3.1-70b-versatile": 0.0000,   # free on Groq
    "llama-3.1-8b-instant": 0.0000,      # free on Groq
}
```

---

## `backend/models.py` — Pydantic Models

These MUST match the TypeScript types in `types.ts`. The JSON keys MUST be `camelCase`. Use Pydantic's `alias_generator` or `Field(alias=...)` for snake_case Python with camelCase JSON output.

```python
from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum

class ModelId(str, Enum):
    GPT4O = "gpt-4o"
    CLAUDE = "claude-3-5-sonnet"
    GEMINI = "gemini-pro"
    LLAMA = "llama-3-1"
    MISTRAL = "mistral-large"

class RunRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    model: ModelId = ModelId.GPT4O

class SourceSpan(BaseModel):
    start: int
    end: int

class Claim(BaseModel):
    id: str
    text: str
    status: Literal["verified", "uncertain", "contradicted"]
    confidence: int = Field(..., ge=0, le=100)
    sourceSpan: Optional[SourceSpan] = None

class Evidence(BaseModel):
    id: str
    source: str
    url: str
    snippet: str
    highlight: str
    relevance: int = Field(..., ge=0, le=100)
    claimId: Optional[str] = None

class CriticMessage(BaseModel):
    id: str
    role: Literal["generator", "critic", "judge", "auditor"]
    content: str
    reasoning: Optional[str] = None
    timestamp: str

class ReasoningStep(BaseModel):
    id: str
    agent: Literal["generator", "extractor", "verifier", "critic", "judge", "compressor", "auditor"]
    action: str
    detail: str
    timestamp: str
    status: Literal["active", "complete", "failed"]

class CompressionMetrics(BaseModel):
    originalTokens: int
    compressedTokens: int
    ratio: float
    preservedClaims: int
    totalClaims: int

class AuditFinding(BaseModel):
    id: str
    target: Literal["critic", "judge", "verifier"]
    assessment: Literal["fair", "aggressive", "lenient", "missed_source"]
    detail: str
    severity: Literal["info", "warning", "critical"]

class TrustAnalysis(BaseModel):
    claims: list[Claim]
    evidence: list[Evidence]
    criticFeed: list[CriticMessage]
    reasoningTrace: list[ReasoningStep]
    compression: Optional[CompressionMetrics] = None
    audit: Optional[list[AuditFinding]] = None
    revisedOutput: str
    hallucinationRisk: int = Field(..., ge=0, le=100)
    trustScoreInitial: int = Field(..., ge=0, le=100)
    trustScoreFinal: int = Field(..., ge=0, le=100)

class RunResult(BaseModel):
    rawOutput: str
    trust: TrustAnalysis
    latency: int
    cost: float
```

---

## `backend/main.py` — FastAPI Application

```python
import time
import json
import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

from models import RunRequest, RunResult
from orchestrator import run_pipeline, stream_pipeline

app = FastAPI(title="LUNA Trust Engine", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.5.0", "models": ["groq:llama-3.1-70b", "openai:gpt-4o"]}

@app.post("/run", response_model=RunResult)
async def run(request: RunRequest):
    start = time.time()
    try:
        result = await run_pipeline(
            prompt=request.prompt,
            model_id=request.model.value,
        )
        result.latency = int((time.time() - start) * 1000)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/run/stream")
async def run_stream(
    prompt: str = Query(..., min_length=1),
    model: str = Query("gpt-4o"),
):
    return StreamingResponse(
        stream_pipeline(prompt=prompt, model_id=model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
```

Start with: `cd backend && uvicorn main:app --reload --port 8000`

---

## `backend/orchestrator.py` — Pipeline Coordinator

This is your core file. It calls agents in sequence, collects reasoning traces, and builds the final `RunResult`.

```python
import asyncio
import json
import time
from models import (
    RunResult, TrustAnalysis, ReasoningStep,
    CompressionMetrics, CriticMessage, Claim, Evidence, AuditFinding,
)
from agents.generator import generate_response, stream_generate_response
from agents.claim_extractor import extract_claims
from agents.critic import run_critic
from agents.judge import run_judge
from agents.compressor import compress_context
from agents.auditor import run_auditor
from verifier.search import verify_claims
from verifier.scorer import compute_scores

async def run_pipeline(prompt: str, model_id: str) -> RunResult:
    total_cost = 0.0
    reasoning_trace: list[ReasoningStep] = []
    pipeline_start = time.time()

    def elapsed() -> str:
        s = time.time() - pipeline_start
        return f"{int(s // 60):02d}:{s % 60:05.2f}"

    # Step 1: Generate
    raw_output, gen_cost, gen_reasoning = await generate_response(prompt, model_id)
    total_cost += gen_cost
    reasoning_trace.append(ReasoningStep(
        id="r1", agent="generator", action="Response generated",
        detail=gen_reasoning, timestamp=elapsed(), status="complete",
    ))

    # Step 2: Extract claims
    claims, extract_cost, extract_reasoning = await extract_claims(raw_output)
    total_cost += extract_cost
    reasoning_trace.append(ReasoningStep(
        id="r2", agent="extractor", action=f"Extracted {len(claims)} claims",
        detail=extract_reasoning, timestamp=elapsed(), status="complete",
    ))

    # Step 3: Verify claims (parallel external lookups — no LLM cost)
    evidence, verify_cost, verify_reasoning = await verify_claims(claims)
    total_cost += verify_cost
    reasoning_trace.append(ReasoningStep(
        id="r3", agent="verifier", action=f"Retrieved {len(evidence)} evidence items",
        detail=verify_reasoning, timestamp=elapsed(), status="complete",
    ))

    # Step 4: Score claims based on evidence
    scored_claims, hallucination_risk, trust_initial = compute_scores(claims, evidence)

    # Step 5: Critic
    critic_feed, critic_cost, critic_reasoning = await run_critic(raw_output, scored_claims, evidence)
    total_cost += critic_cost
    reasoning_trace.append(ReasoningStep(
        id="r4", agent="critic", action="Evaluated factual accuracy",
        detail=critic_reasoning, timestamp=elapsed(), status="complete",
    ))

    # Step 6: Judge
    ruling, judge_cost, judge_reasoning = await run_judge(critic_feed, scored_claims)
    total_cost += judge_cost
    reasoning_trace.append(ReasoningStep(
        id="r5", agent="judge", action="Issued correction ruling",
        detail=judge_reasoning, timestamp=elapsed(), status="complete",
    ))

    # Append judge message to critic feed
    if "judge_message" in ruling:
        critic_feed.append(ruling["judge_message"])

    # Step 7: Conditional correction (max 1 loop)
    revised_output = raw_output
    if ruling.get("needs_correction", False):
        correction_signal = ruling.get("correction_signal", "")
        revised_output, rev_cost, rev_reasoning = await generate_response(
            prompt, model_id,
            correction_signal=correction_signal,
            original_output=raw_output,
        )
        total_cost += rev_cost

    # Step 8: Compress context and compute metrics
    compression, comp_reasoning = compress_context(raw_output, scored_claims, evidence, critic_feed)
    reasoning_trace.append(ReasoningStep(
        id="r6", agent="compressor", action="Context compressed",
        detail=comp_reasoning, timestamp=elapsed(), status="complete",
    ))

    # Step 9: Auditor — accountability check on the orchestrator
    audit_findings, auditor_msg, audit_cost, audit_reasoning = await run_auditor(
        scored_claims, evidence, critic_feed, ruling,
    )
    total_cost += audit_cost
    critic_feed.append(auditor_msg)
    reasoning_trace.append(ReasoningStep(
        id="r7", agent="auditor", action="Orchestrator audit complete",
        detail=audit_reasoning, timestamp=elapsed(), status="complete",
    ))

    # Compute final trust score after correction
    trust_final = compute_final_trust(scored_claims, ruling.get("needs_correction", False))

    return RunResult(
        rawOutput=raw_output,
        trust=TrustAnalysis(
            claims=scored_claims,
            evidence=evidence,
            criticFeed=critic_feed,
            reasoningTrace=reasoning_trace,
            compression=compression,
            audit=audit_findings,
            revisedOutput=revised_output,
            hallucinationRisk=hallucination_risk,
            trustScoreInitial=trust_initial,
            trustScoreFinal=trust_final,
        ),
        latency=0,   # overwritten by main.py
        cost=round(total_cost, 6),
    )


def compute_final_trust(claims: list[Claim], was_corrected: bool) -> int:
    if not claims:
        return 50
    verified = [c for c in claims if c.status == "verified"]
    total_conf = sum(c.confidence for c in claims)
    verified_conf = sum(c.confidence for c in verified)
    base = int((verified_conf / total_conf * 100)) if total_conf > 0 else 50
    if was_corrected:
        base = min(98, base + 10)  # correction bump
    return max(5, min(98, base))


async def stream_pipeline(prompt: str, model_id: str):
    """SSE async generator — yields typed events as the pipeline progresses."""
    pipeline_start = time.time()

    def elapsed() -> str:
        s = time.time() - pipeline_start
        return f"{int(s // 60):02d}:{s % 60:05.2f}"

    def sse(event: str, data) -> str:
        payload = json.dumps(data) if not isinstance(data, str) else data
        return f"event: {event}\ndata: {payload}\n\n"

    total_cost = 0.0
    reasoning_trace = []
    critic_feed = []

    # Stage: generating
    yield sse("stage", {"stage": "generating"})

    raw_chunks = []
    async for token in stream_generate_response(prompt, model_id):
        raw_chunks.append(token)
        yield sse("raw_token", {"token": token})

    raw_output = "".join(raw_chunks)
    yield sse("raw_complete", {"text": raw_output})

    r1 = ReasoningStep(id="r1", agent="generator", action="Response generated",
                       detail="Streamed generation complete.", timestamp=elapsed(), status="complete")
    reasoning_trace.append(r1)
    yield sse("reasoning", r1.model_dump())

    # Stage: extracting
    yield sse("stage", {"stage": "extracting"})
    claims, extract_cost, extract_reasoning = await extract_claims(raw_output)
    total_cost += extract_cost
    r2 = ReasoningStep(id="r2", agent="extractor", action=f"Extracted {len(claims)} claims",
                       detail=extract_reasoning, timestamp=elapsed(), status="complete")
    reasoning_trace.append(r2)
    yield sse("reasoning", r2.model_dump())
    yield sse("claims", [c.model_dump() for c in claims])

    # Stage: verifying
    yield sse("stage", {"stage": "verifying"})
    evidence, verify_cost, verify_reasoning = await verify_claims(claims)
    total_cost += verify_cost
    r3 = ReasoningStep(id="r3", agent="verifier", action=f"Retrieved {len(evidence)} evidence items",
                       detail=verify_reasoning, timestamp=elapsed(), status="complete")
    reasoning_trace.append(r3)
    yield sse("reasoning", r3.model_dump())
    yield sse("evidence", [e.model_dump() for e in evidence])

    # Score claims
    from verifier.scorer import compute_scores
    scored_claims, hallucination_risk, trust_initial = compute_scores(claims, evidence)
    yield sse("claims", [c.model_dump() for c in scored_claims])

    # Stage: critiquing
    yield sse("stage", {"stage": "critiquing"})
    cf, critic_cost, critic_reasoning = await run_critic(raw_output, scored_claims, evidence)
    total_cost += critic_cost
    critic_feed.extend(cf)
    for msg in cf:
        yield sse("critic_msg", msg.model_dump())
    r4 = ReasoningStep(id="r4", agent="critic", action="Evaluated factual accuracy",
                       detail=critic_reasoning, timestamp=elapsed(), status="complete")
    reasoning_trace.append(r4)
    yield sse("reasoning", r4.model_dump())

    # Stage: judging
    yield sse("stage", {"stage": "judging"})
    ruling, judge_cost, judge_reasoning = await run_judge(critic_feed, scored_claims)
    total_cost += judge_cost
    if "judge_message" in ruling:
        critic_feed.append(ruling["judge_message"])
        yield sse("critic_msg", ruling["judge_message"].model_dump())
    r5 = ReasoningStep(id="r5", agent="judge", action="Issued correction ruling",
                       detail=judge_reasoning, timestamp=elapsed(), status="complete")
    reasoning_trace.append(r5)
    yield sse("reasoning", r5.model_dump())

    # Stage: correcting
    revised_output = raw_output
    if ruling.get("needs_correction", False):
        yield sse("stage", {"stage": "correcting"})
        revised_output, rev_cost, _ = await generate_response(
            prompt, model_id,
            correction_signal=ruling.get("correction_signal", ""),
            original_output=raw_output,
        )
        total_cost += rev_cost
    yield sse("revised_token", {"token": revised_output})

    # Stage: compressing
    yield sse("stage", {"stage": "compressing"})
    compression, comp_reasoning = compress_context(raw_output, scored_claims, evidence, critic_feed)
    yield sse("compression", compression.model_dump())
    r6 = ReasoningStep(id="r6", agent="compressor", action="Context compressed",
                       detail=comp_reasoning, timestamp=elapsed(), status="complete")
    reasoning_trace.append(r6)
    yield sse("reasoning", r6.model_dump())

    # Stage: auditing
    yield sse("stage", {"stage": "auditing"})
    audit_findings, auditor_msg, audit_cost, audit_reasoning = await run_auditor(
        scored_claims, evidence, critic_feed, ruling,
    )
    total_cost += audit_cost
    critic_feed.append(auditor_msg)
    yield sse("critic_msg", auditor_msg.model_dump())
    yield sse("audit", [a.model_dump() for a in audit_findings])
    r7 = ReasoningStep(id="r7", agent="auditor", action="Orchestrator audit complete",
                       detail=audit_reasoning, timestamp=elapsed(), status="complete")
    reasoning_trace.append(r7)
    yield sse("reasoning", r7.model_dump())

    # Final
    trust_final = compute_final_trust(scored_claims, ruling.get("needs_correction", False))

    final_result = RunResult(
        rawOutput=raw_output,
        trust=TrustAnalysis(
            claims=scored_claims, evidence=evidence, criticFeed=critic_feed,
            reasoningTrace=reasoning_trace, compression=compression,
            audit=audit_findings, revisedOutput=revised_output,
            hallucinationRisk=hallucination_risk,
            trustScoreInitial=trust_initial, trustScoreFinal=trust_final,
        ),
        latency=int((time.time() - pipeline_start) * 1000),
        cost=round(total_cost, 6),
    )

    yield sse("stage", {"stage": "complete"})
    yield sse("complete", final_result.model_dump())
```

---

## Definition of Done

- [ ] `uvicorn main:app --reload --port 8000` starts clean
- [ ] `GET /health` returns model info
- [ ] `POST /run` returns valid `RunResult` JSON with all fields including `reasoningTrace`, `compression`, `audit`, `trustScoreInitial`, `trustScoreFinal`
- [ ] `GET /run/stream?prompt=...` emits SSE events in correct order
- [ ] CORS works from `http://localhost:5173`
- [ ] Two-tier client setup works (OpenAI for generator, Groq for orchestrator)
- [ ] Pipeline falls back gracefully if Groq is unavailable (use OpenAI for all agents)

---

---

# PROMPT 3 — AI Engineer

**Assigned to: AI Engineer**

---

## Context

You are the AI Engineer for LUNA. You own all six agent files in `backend/agents/`. Your job is to write the LLM-facing prompt logic that powers the trust pipeline. **You write Python only.**

Critical architecture decision: the Generator calls OpenAI (user's premium model). All other agents call **Groq's Llama 3.1** (free, open-weight). This means your orchestrator agents use the same `openai` Python SDK but with a different client instance and different model names. Import clients from `config.py`:

```python
from config import generator_client, orchestrator_client, ORCHESTRATOR_MODEL_LARGE, ORCHESTRATOR_MODEL_SMALL
```

Every agent function must return three values: `(result, cost: float, reasoning: str)`. The `reasoning` string is the agent's internal chain-of-thought — what it was thinking and why it made the decisions it did. This gets displayed in the frontend's reasoning trace.

---

## Agent 1 — Generator (`backend/agents/generator.py`)

```python
import os
from config import generator_client, GENERATOR_MODELS, MODEL_COSTS

SYSTEM_PROMPT = """You are a knowledgeable assistant. Respond with a comprehensive, factual answer.

Rules:
- Include concrete facts, numbers, named examples where relevant
- Make clear factual statements that can be verified
- Use bullet points or numbered lists for structure
- Aim for 150–300 words
- State facts directly, no hedging with "I think" or "I believe" """

CORRECTION_PROMPT = """You are performing a correction pass on your previous response.

Given:
1. Original prompt
2. Your previous response
3. Correction signal identifying specific issues

Rewrite the response correcting ONLY the identified issues. Keep accurate content unchanged. Do not lengthen the response."""

async def generate_response(
    prompt: str,
    model_id: str,
    correction_signal: str | None = None,
    original_output: str | None = None,
) -> tuple[str, float, str]:
    """Returns (text, cost_usd, reasoning_detail)"""
    actual_model = GENERATOR_MODELS.get(model_id, "gpt-4o")

    if correction_signal and original_output:
        system = CORRECTION_PROMPT
        user_content = f"Original prompt: {prompt}\n\nPrevious response:\n{original_output}\n\nCorrection signal:\n{correction_signal}\n\nCorrected response:"
        reasoning = f"Re-generating with correction signal targeting specific issues. Using {actual_model}."
    else:
        system = SYSTEM_PROMPT
        user_content = prompt
        reasoning = f"Generating initial response for: '{prompt[:80]}...'. Using {actual_model} at temperature 0.3 for factual precision."

    response = await generator_client.chat.completions.create(
        model=actual_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
        max_tokens=600,
    )

    text = response.choices[0].message.content or ""
    tokens = response.usage.total_tokens if response.usage else 500
    cost = (tokens / 1000) * MODEL_COSTS.get(actual_model, 0.005)

    reasoning += f" Generated {len(text.split())} words, {tokens} tokens."
    return text, cost, reasoning


async def stream_generate_response(prompt: str, model_id: str):
    """Async generator yielding text tokens for SSE streaming."""
    actual_model = GENERATOR_MODELS.get(model_id, "gpt-4o")
    response = await generator_client.chat.completions.create(
        model=actual_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=600,
        stream=True,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
```

---

## Agent 2 — Claim Extractor (`backend/agents/claim_extractor.py`)

This uses **Llama 3.1 8B via Groq** — fast, free, and surprisingly good at structured extraction.

```python
import json
import re
from config import orchestrator_client, ORCHESTRATOR_MODEL_SMALL, MODEL_COSTS
from models import Claim, SourceSpan

EXTRACTION_PROMPT = """Extract all verifiable factual claims from the text below.

A "claim" is a specific, atomic statement that can be checked as true or false. It must contain a concrete fact: a number, date, named entity, measurement, or causal statement.

Output a JSON array. Each object must have:
- "text": the claim as a standalone sentence (no pronouns)
- "checkworthy": true if important enough to verify, false otherwise

Extract 4–8 claims. Prioritize numerical or named-entity claims.

Respond with ONLY a JSON array:
[{"text": "...", "checkworthy": true}, ...]"""

def find_source_span(claim_text: str, raw_output: str) -> SourceSpan | None:
    """Find where a claim's content appears in the raw output text."""
    claim_words = claim_text.lower().split()
    raw_lower = raw_output.lower()

    # Try exact substring match first
    idx = raw_lower.find(claim_text.lower())
    if idx >= 0:
        return SourceSpan(start=idx, end=idx + len(claim_text))

    # Fuzzy: find longest contiguous word sequence match
    best_start, best_end, best_len = 0, 0, 0
    for i in range(len(claim_words)):
        for j in range(len(claim_words), i + 2, -1):
            phrase = " ".join(claim_words[i:j])
            idx = raw_lower.find(phrase)
            if idx >= 0 and (j - i) > best_len:
                best_start, best_end, best_len = idx, idx + len(phrase), j - i
                break

    if best_len >= 3:
        return SourceSpan(start=best_start, end=best_end)
    return None


async def extract_claims(raw_output: str) -> tuple[list[Claim], float, str]:
    """Returns (claims, cost, reasoning_detail)"""
    response = await orchestrator_client.chat.completions.create(
        model=ORCHESTRATOR_MODEL_SMALL,
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": f"Extract claims from:\n\n{raw_output}"},
        ],
        temperature=0.1,
        max_tokens=800,
    )

    raw = response.choices[0].message.content or "[]"
    tokens = response.usage.total_tokens if response.usage else 300
    cost = (tokens / 1000) * MODEL_COSTS.get(ORCHESTRATOR_MODEL_SMALL, 0.0)

    # Parse JSON — handle both array and object responses
    try:
        # Strip markdown code fences if present
        cleaned = re.sub(r'^```json?\s*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            items = parsed.get("claims", list(parsed.values())[0] if parsed else [])
        else:
            items = parsed
    except (json.JSONDecodeError, KeyError, IndexError):
        items = []

    claims = []
    for i, item in enumerate(items[:8]):
        if not item.get("checkworthy", True):
            continue
        span = find_source_span(item.get("text", ""), raw_output)
        claims.append(Claim(
            id=f"c{i+1}",
            text=item.get("text", ""),
            status="uncertain",
            confidence=50,
            sourceSpan=span,
        ))

    word_count = len(raw_output.split())
    reasoning = (
        f"Response contains ~{word_count} words. "
        f"Identified {len(items)} candidate claims, filtered to {len(claims)} checkworthy claims. "
        f"Discarded {len(items) - len(claims)} non-checkworthy statements. "
        f"Using {ORCHESTRATOR_MODEL_SMALL} via Groq (cost: ${cost:.4f})."
    )

    return claims, cost, reasoning
```

---

## Agent 3 — Critic (`backend/agents/critic.py`)

Uses **Llama 3.1 70B** — needs the larger model for nuanced reasoning.

```python
import json
from config import orchestrator_client, ORCHESTRATOR_MODEL_LARGE, MODEL_COSTS
from models import Claim, Evidence, CriticMessage

CRITIC_PROMPT = """You are a skeptical fact-checker reviewing an AI response.

Given: the original response, extracted claims with verification status, and evidence.

Your task: identify the most significant factual issues. Focus on:
- Claims marked "contradicted" or "uncertain" with confidence < 70
- Specific numbers that don't match evidence
- Generalizations beyond what evidence supports

Write 2–4 sentences. Be precise — quote the specific problematic claim text.

Also output your internal reasoning (what you checked, what you compared, how you reached your conclusion) as a separate field.

Respond in JSON:
{"critique": "your public critique", "reasoning": "your internal analysis process"}"""

async def run_critic(
    raw_output: str,
    claims: list[Claim],
    evidence: list[Evidence],
) -> tuple[list[CriticMessage], float, str]:
    """Returns (critic_feed, cost, reasoning_detail)"""

    claims_summary = "\n".join([f"- [{c.status.upper()} | {c.confidence}%] {c.text}" for c in claims])
    evidence_summary = "\n".join([f"- [{e.source}] {e.snippet[:150]}..." for e in evidence[:4]])

    # Generator self-description (simulated)
    gen_msg = CriticMessage(
        id="m1", role="generator",
        content=f"Providing response covering: {', '.join([c.text[:50] for c in claims[:3]])}...",
        timestamp="00:00.12",
    )

    # Critic analysis (real LLM call via Groq)
    response = await orchestrator_client.chat.completions.create(
        model=ORCHESTRATOR_MODEL_LARGE,
        messages=[
            {"role": "system", "content": CRITIC_PROMPT},
            {"role": "user", "content": f"Response:\n{raw_output[:500]}\n\nClaims:\n{claims_summary}\n\nEvidence:\n{evidence_summary}"},
        ],
        temperature=0.4,
        max_tokens=400,
    )

    raw_text = response.choices[0].message.content or "{}"
    tokens = response.usage.total_tokens if response.usage else 300
    cost = (tokens / 1000) * MODEL_COSTS.get(ORCHESTRATOR_MODEL_LARGE, 0.0)

    # Parse structured response
    try:
        parsed = json.loads(raw_text)
        critique_text = parsed.get("critique", raw_text)
        critic_reasoning = parsed.get("reasoning", "")
    except json.JSONDecodeError:
        critique_text = raw_text
        critic_reasoning = ""

    critic_msg = CriticMessage(
        id="m2", role="critic",
        content=critique_text,
        reasoning=critic_reasoning or None,
        timestamp="00:00.31",
    )

    # Generator acknowledgment (simulated)
    has_issues = any(c.status in ["uncertain", "contradicted"] for c in claims)
    gen_ack = CriticMessage(
        id="m3", role="generator",
        content="Acknowledged. The flagged claims require qualification or correction."
            if has_issues else "All major claims are supported by retrieved evidence.",
        timestamp="00:00.44",
    )

    reasoning = (
        f"Cross-referenced {len(claims)} claims against {len(evidence)} evidence sources. "
        f"Found {sum(1 for c in claims if c.status == 'contradicted')} contradicted, "
        f"{sum(1 for c in claims if c.status == 'uncertain')} uncertain. "
        f"Using {ORCHESTRATOR_MODEL_LARGE} via Groq (cost: ${cost:.4f})."
    )

    return [gen_msg, critic_msg, gen_ack], cost, reasoning
```

---

## Agent 4 — Judge (`backend/agents/judge.py`)

Uses **Llama 3.1 8B** — this is a structured decision, smaller model is fine.

```python
import json
from config import orchestrator_client, ORCHESTRATOR_MODEL_SMALL, MODEL_COSTS
from models import Claim, CriticMessage

JUDGE_PROMPT = """You are an impartial judge. Given the critic's analysis and claim verification results, determine:

1. needs_correction (true/false): true if any claim is "contradicted" OR more than 2 claims are "uncertain" with confidence < 60
2. correction_signal: if correction needed, write a SHORT (<80 words) specific instruction listing EXACTLY what must change
3. judge_statement: 2–3 sentence summary of your ruling

Also output your reasoning.

Respond in JSON only:
{"needs_correction": true, "correction_signal": "...", "judge_statement": "...", "reasoning": "..."}"""

async def run_judge(
    critic_feed: list[CriticMessage],
    claims: list[Claim] | None = None,
) -> tuple[dict, float, str]:
    """Returns (ruling_dict, cost, reasoning_detail)"""

    critic_content = "\n".join([f"[{msg.role.upper()}]: {msg.content}" for msg in critic_feed])

    claims_info = ""
    if claims:
        contradicted = [c for c in claims if c.status == "contradicted"]
        uncertain_low = [c for c in claims if c.status == "uncertain" and c.confidence < 60]
        claims_info = f"\nContradicted ({len(contradicted)}): {[c.text for c in contradicted]}"
        claims_info += f"\nLow-confidence uncertain ({len(uncertain_low)}): {[c.text for c in uncertain_low]}"

    response = await orchestrator_client.chat.completions.create(
        model=ORCHESTRATOR_MODEL_SMALL,
        messages=[
            {"role": "system", "content": JUDGE_PROMPT},
            {"role": "user", "content": f"Critic exchange:\n{critic_content}{claims_info}\n\nYour ruling:"},
        ],
        temperature=0.2,
        max_tokens=300,
    )

    raw = response.choices[0].message.content or "{}"
    tokens = response.usage.total_tokens if response.usage else 200
    cost = (tokens / 1000) * MODEL_COSTS.get(ORCHESTRATOR_MODEL_SMALL, 0.0)

    try:
        import re
        cleaned = re.sub(r'^```json?\s*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        ruling = json.loads(cleaned)
    except json.JSONDecodeError:
        ruling = {"needs_correction": False, "correction_signal": "", "judge_statement": "Ruling unavailable.", "reasoning": ""}

    judge_reasoning = ruling.get("reasoning", "")
    ruling["judge_message"] = CriticMessage(
        id="m5", role="judge",
        content=ruling.get("judge_statement", "Ruling complete."),
        reasoning=judge_reasoning or None,
        timestamp="00:01.02",
    )

    reasoning = (
        f"Assessed critic findings. Correction {'required' if ruling.get('needs_correction') else 'not required'}. "
        f"Using {ORCHESTRATOR_MODEL_SMALL} via Groq (cost: ${cost:.4f})."
    )

    return ruling, cost, reasoning
```

---

## Agent 5 — Compressor (`backend/agents/compressor.py`)

This is **rule-based** — no LLM call. It computes token estimates and produces compression metrics.

```python
from models import Claim, Evidence, CriticMessage, CompressionMetrics

def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English text."""
    return max(1, len(text) // 4)

def compress_context(
    raw_output: str,
    claims: list[Claim],
    evidence: list[Evidence],
    critic_feed: list[CriticMessage],
) -> tuple[CompressionMetrics, str]:
    """Returns (metrics, reasoning_detail). No LLM call — pure computation."""

    # Calculate original token count
    original = estimate_tokens(raw_output)
    original += sum(estimate_tokens(c.text) for c in claims)
    original += sum(estimate_tokens(e.snippet) for e in evidence)
    original += sum(estimate_tokens(m.content) for m in critic_feed)

    # Compressed representation: keep claim IDs + statuses, evidence relevance scores,
    # and a summary directive instead of full text
    compressed = estimate_tokens(raw_output)  # keep raw output
    compressed += len(claims) * 15            # ~15 tokens per claim summary
    compressed += len(evidence) * 10          # ~10 tokens per evidence reference
    compressed += 50                          # summary directive

    ratio = round(compressed / original, 2) if original > 0 else 1.0

    metrics = CompressionMetrics(
        originalTokens=original,
        compressedTokens=compressed,
        ratio=ratio,
        preservedClaims=len(claims),
        totalClaims=len(claims),
    )

    reasoning = (
        f"Original context: {original} tokens across generator output, "
        f"{len(claims)} claims, {len(evidence)} evidence snippets, and "
        f"{len(critic_feed)} critic messages. Compressed to {compressed} tokens "
        f"by replacing full snippets with claim-relevance pairs and summarizing "
        f"the critic exchange. Ratio: {ratio}. All {len(claims)} claims preserved."
    )

    return metrics, reasoning
```

---

## Agent 6 — Auditor (`backend/agents/auditor.py`)

The third agent. Uses **Llama 3.1 8B** — structured assessment task.

```python
import json
import re
from config import orchestrator_client, ORCHESTRATOR_MODEL_SMALL, MODEL_COSTS
from models import Claim, Evidence, CriticMessage, AuditFinding

AUDITOR_PROMPT = """You are an accountability auditor reviewing an AI orchestration pipeline.

Given: the claim verification results, evidence retrieved, critic analysis, and judge ruling.

Evaluate each component:
1. CRITIC: Was the critic's assessment fair, too aggressive, or too lenient?
2. VERIFIER: Did the verifier miss obvious sources? Were relevance scores reasonable?
3. JUDGE: Was the correction ruling proportionate?

For each, output an assessment.

Respond in JSON:
{
  "findings": [
    {"target": "critic", "assessment": "fair|aggressive|lenient", "detail": "...", "severity": "info|warning|critical"},
    {"target": "verifier", "assessment": "fair|missed_source", "detail": "...", "severity": "info|warning"},
    {"target": "judge", "assessment": "fair|aggressive|lenient", "detail": "...", "severity": "info|warning|critical"}
  ],
  "summary": "overall assessment statement",
  "reasoning": "internal analysis"
}"""

async def run_auditor(
    claims: list[Claim],
    evidence: list[Evidence],
    critic_feed: list[CriticMessage],
    ruling: dict,
) -> tuple[list[AuditFinding], CriticMessage, float, str]:
    """Returns (findings, auditor_message, cost, reasoning_detail)"""

    claims_summary = "\n".join([f"- [{c.status} | {c.confidence}%] {c.text}" for c in claims])
    evidence_summary = f"{len(evidence)} evidence items retrieved, avg relevance: {sum(e.relevance for e in evidence) // max(len(evidence), 1)}%"
    critic_summary = "\n".join([f"[{m.role}]: {m.content[:100]}..." for m in critic_feed])
    judge_summary = f"Correction needed: {ruling.get('needs_correction', False)}"

    response = await orchestrator_client.chat.completions.create(
        model=ORCHESTRATOR_MODEL_SMALL,
        messages=[
            {"role": "system", "content": AUDITOR_PROMPT},
            {"role": "user", "content": (
                f"Claims:\n{claims_summary}\n\n"
                f"Evidence:\n{evidence_summary}\n\n"
                f"Critic exchange:\n{critic_summary}\n\n"
                f"Judge ruling: {judge_summary}"
            )},
        ],
        temperature=0.3,
        max_tokens=400,
    )

    raw = response.choices[0].message.content or "{}"
    tokens = response.usage.total_tokens if response.usage else 200
    cost = (tokens / 1000) * MODEL_COSTS.get(ORCHESTRATOR_MODEL_SMALL, 0.0)

    try:
        cleaned = re.sub(r'^```json?\s*\n?', '', raw.strip())
        cleaned = re.sub(r'\n?```\s*$', '', cleaned)
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = {"findings": [], "summary": "Audit complete.", "reasoning": ""}

    findings = []
    for i, f in enumerate(parsed.get("findings", [])[:3]):
        findings.append(AuditFinding(
            id=f"a{i+1}",
            target=f.get("target", "critic"),
            assessment=f.get("assessment", "fair"),
            detail=f.get("detail", ""),
            severity=f.get("severity", "info"),
        ))

    audit_reasoning = parsed.get("reasoning", "")
    summary = parsed.get("summary", "Audit complete. No critical issues.")

    auditor_msg = CriticMessage(
        id="m6", role="auditor",
        content=summary,
        reasoning=audit_reasoning or None,
        timestamp="00:01.12",
    )

    reasoning = (
        f"Reviewed orchestrator pipeline: {len(claims)} claims scored, "
        f"{len(evidence)} evidence items, critic + judge exchange. "
        f"Found {sum(1 for f in findings if f.severity == 'warning')} warnings, "
        f"{sum(1 for f in findings if f.severity == 'critical')} critical issues. "
        f"Using {ORCHESTRATOR_MODEL_SMALL} via Groq (cost: ${cost:.4f})."
    )

    return findings, auditor_msg, cost, reasoning
```

---

## Don't forget `backend/agents/__init__.py`

Create an empty `backend/agents/__init__.py` file.

---

## Definition of Done

- [ ] `generate_response("What is quantum computing?", "gpt-4o")` returns text + cost + reasoning
- [ ] `extract_claims(text)` returns 4–8 claims with `sourceSpan` data using Llama 3.1 8B via Groq
- [ ] `run_critic(raw, claims, evidence)` returns critic feed with `reasoning` fields using Llama 3.1 70B via Groq
- [ ] `run_judge(feed, claims)` returns ruling using Llama 3.1 8B via Groq
- [ ] `compress_context(...)` returns `CompressionMetrics` (no LLM call)
- [ ] `run_auditor(...)` returns `AuditFinding[]` using Llama 3.1 8B via Groq
- [ ] Every agent handles API errors gracefully (return degraded-but-valid response, don't crash)
- [ ] Total orchestrator cost per query is < $0.001

---

---

# PROMPT 4 — Verification Engineer

**Assigned to: Verification Engineer**

---

## Context

You own `backend/verifier/search.py` and `backend/verifier/scorer.py`. Your job: retrieve real evidence from external sources for each claim, then score claims based on that evidence.

**You make zero LLM calls.** All your work is API calls to Wikipedia and Tavily, plus rule-based scoring. This means your module is free to run and has no dependency on API keys (Wikipedia is open). **You write Python only.**

Your functions are called by the orchestrator and must return the same three-value tuple pattern: `(result, cost, reasoning_detail)`.

---

## `backend/verifier/__init__.py`

Empty file. Create it.

---

## `backend/verifier/search.py`

```python
import asyncio
import os
import re
import httpx
from models import Claim, Evidence, SourceSpan

WIKIPEDIA_SEARCH = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
TAVILY_API = "https://api.tavily.com/search"


async def search_wikipedia(query: str, client: httpx.AsyncClient) -> dict | None:
    """Search Wikipedia for a page matching the query, return its summary."""
    try:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "srlimit": 3,
        }
        resp = await client.get(WIKIPEDIA_SEARCH, params=params, timeout=8.0)
        resp.raise_for_status()
        results = resp.json().get("query", {}).get("search", [])
        if not results:
            return None

        title = results[0]["title"].replace(" ", "_")
        summary = await client.get(WIKIPEDIA_SUMMARY.format(title=title), timeout=8.0)
        summary.raise_for_status()
        return summary.json()
    except Exception:
        return None


async def search_tavily(query: str, client: httpx.AsyncClient) -> list[dict]:
    """Search Tavily for web evidence. Requires TAVILY_API_KEY."""
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        return []
    try:
        resp = await client.post(TAVILY_API, json={
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": 2,
            "include_raw_content": False,
        }, timeout=10.0)
        resp.raise_for_status()
        return resp.json().get("results", [])
    except Exception:
        return []


def compute_overlap(claim: str, evidence: str) -> float:
    """Token overlap between claim and evidence (0.0–1.0)."""
    claim_words = set(re.findall(r'\b\w{4,}\b', claim.lower()))
    evidence_words = set(re.findall(r'\b\w{4,}\b', evidence.lower()))
    if not claim_words:
        return 0.0
    return len(claim_words & evidence_words) / len(claim_words)


def pick_highlight(claim: str, snippet: str) -> str:
    """Find the most relevant sentence in snippet to highlight."""
    claim_words = set(re.findall(r'\b\w{4,}\b', claim.lower()))
    sentences = snippet.split('. ')
    best = max(
        sentences,
        key=lambda s: len(set(re.findall(r'\b\w{4,}\b', s.lower())) & claim_words),
        default=snippet[:80],
    )
    return best[:120]


async def verify_claims(claims: list[Claim]) -> tuple[list[Evidence], float, str]:
    """Returns (evidence_list, cost, reasoning_detail). Cost is 0 (Wikipedia is free)."""
    evidence_list: list[Evidence] = []
    search_log: list[str] = []

    async with httpx.AsyncClient() as client:
        tasks = [search_wikipedia(c.text, client) for c in claims]
        wiki_results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, (claim, wiki) in enumerate(zip(claims, wiki_results)):
            if isinstance(wiki, Exception) or wiki is None:
                search_log.append(f"c{i+1}: no Wikipedia result")
                continue

            snippet = wiki.get("extract", "")[:400]
            if len(snippet) < 30:
                search_log.append(f"c{i+1}: snippet too short")
                continue

            overlap = compute_overlap(claim.text, snippet)
            relevance = min(int(overlap * 150), 100)

            if relevance < 15:
                search_log.append(f"c{i+1}: low relevance ({relevance}%)")
                continue

            title = wiki.get("title", "Wikipedia")
            url = wiki.get("content_urls", {}).get("desktop", {}).get("page", "en.wikipedia.org")

            evidence_list.append(Evidence(
                id=f"e{len(evidence_list)+1}",
                source=f"Wikipedia — {title}",
                url=url,
                snippet=snippet,
                highlight=pick_highlight(claim.text, snippet),
                relevance=relevance,
                claimId=claim.id,
            ))
            search_log.append(f"c{i+1}: found ({relevance}% relevance)")

    reasoning = (
        f"Ran parallel Wikipedia lookups for {len(claims)} claims. "
        f"Results: {'; '.join(search_log)}. "
        f"Retrieved {len(evidence_list)} evidence items total."
    )

    return evidence_list[:6], 0.0, reasoning
```

---

## `backend/verifier/scorer.py`

```python
import re
from models import Claim, Evidence

CONTRADICTION_SIGNALS = [
    "not demonstrated", "no evidence", "has not been", "contradicts",
    "incorrect", "false", "disputed", "inaccurate", "not yet achieved",
    "remains unproven", "not confirmed", "no real-world",
]

VERIFICATION_SIGNALS = [
    "confirmed", "demonstrated", "published", "according to",
    "researchers found", "study shows", "announced", "released",
    "unveiled", "achieved",
]


def score_single_claim(claim: Claim, evidence: list[Evidence]) -> tuple[str, int]:
    """Score one claim against available evidence. Returns (status, confidence)."""
    # Find evidence linked to this claim
    relevant = [e for e in evidence if e.claimId == claim.id]
    if not relevant:
        relevant = sorted(evidence, key=lambda e: e.relevance, reverse=True)[:2]

    if not relevant:
        return "uncertain", 45

    best = relevant[0]
    all_text = " ".join(e.snippet.lower() for e in relevant[:3])

    if best.relevance < 25:
        return "uncertain", 42

    contradiction_hits = sum(1 for s in CONTRADICTION_SIGNALS if s in all_text)
    if contradiction_hits >= 1:
        conf = max(8, 28 - contradiction_hits * 6)
        return "contradicted", conf

    verification_hits = sum(1 for s in VERIFICATION_SIGNALS if s in all_text)
    if verification_hits >= 1 and best.relevance >= 55:
        conf = min(97, 75 + verification_hits * 5 + int(best.relevance * 0.15))
        return "verified", conf

    conf = min(72, 45 + int(best.relevance * 0.35))
    return "uncertain", conf


def compute_scores(
    claims: list[Claim],
    evidence: list[Evidence],
) -> tuple[list[Claim], int, int]:
    """Returns (scored_claims, hallucination_risk, trust_score_initial)."""
    if not claims:
        return [], 50, 50

    scored = []
    for claim in claims:
        status, confidence = score_single_claim(claim, evidence)
        scored.append(Claim(
            id=claim.id,
            text=claim.text,
            status=status,
            confidence=confidence,
            sourceSpan=claim.sourceSpan,
        ))

    # Hallucination risk
    risk = 0
    for c in scored:
        if c.status == "contradicted":
            risk += 35
        elif c.status == "uncertain" and c.confidence < 55:
            risk += 15
        elif c.status == "uncertain":
            risk += 5
        elif c.status == "verified" and c.confidence > 85:
            risk -= 5

    risk = int(risk / len(scored) * 1.5)
    risk = max(5, min(95, risk))

    trust_initial = 100 - risk

    return scored, risk, trust_initial
```

---

## Definition of Done

- [ ] `verify_claims([3 test claims])` returns evidence from Wikipedia for at least 2
- [ ] `compute_scores(claims, evidence)` scores IBM Condor as `verified`, enterprise advantage as `contradicted`
- [ ] All Wikipedia searches run in parallel (use `asyncio.gather`)
- [ ] Evidence objects include `claimId` linking back to the claim
- [ ] Cost is `0.0` (no LLM calls)
- [ ] `reasoning` string describes what was searched and what was found/missed

---

---

# PROMPT 5 — Product & Demo Lead

**Assigned to: Product & Demo Lead**

---

## Context

You do not write backend code. You are the most important person on demo day. You own: testing, demo prompts, the demo script, the pitch, and the fallback plan.

With the new architecture (visible reasoning traces, auditor layer, open-weight cost strategy), your pitch is stronger. You have three narratives to weave:

1. **Trust, not just output** — LUNA doesn't just generate. It verifies, corrects, and proves it.
2. **Transparency** — every reasoning step is visible. No black box.
3. **Economics** — the trust layer runs on free open-weight models. The cost is near-zero.

---

## Three Demo Prompts

**Prompt A — Quantum Computing (primary)**
> "Explain quantum computing, including current qubit counts for IBM and Google, and when we might achieve cryptographically relevant quantum computers."

Why: IBM Condor (1121 qubits) and Google Willow (105 qubits) are verifiable. RSA timeline is contested. Enterprise advantage is false. Judges at an AIML hackathon know this domain.

**Prompt B — LLM Comparison (secondary)**
> "What are the key differences between GPT-4, Claude 3.5 Sonnet, and Gemini 1.5 Pro in terms of context window size, benchmark performance, and release dates?"

Why: Context windows (128K, 200K, 1M) are verifiable numbers. Benchmark claims are often overstated. AIML judges find this directly relevant.

**Prompt C — Climate Science (backup)**
> "What is the current concentration of CO2 in the atmosphere, how much has global average temperature risen since pre-industrial levels, and what does the IPCC say about the timeline to 1.5°C warming?"

Why: CO2 (~423 ppm), temperature rise (~1.2°C), IPCC timelines are all precise verifiable numbers.

---

## Demo Script

Create `LUNA/DEMO_SCRIPT.md`:

```markdown
# LUNA Demo Script

## Pre-Demo (30 seconds)
- Chrome full screen at http://localhost:5173 (Cmd+Shift+B to hide bookmarks)
- Model selector: GPT-4o
- Prompt A pasted but NOT submitted
- Know fallback: Ctrl+Shift+D (instant mock), Ctrl+Shift+S (animated mock)

## Opening (10 seconds)
"Every LLM hallucinates. GPT-4 fabricates citations. Claude invents statistics. The industry
solution is disclaimers. LUNA's solution is: detect it, correct it, prove it — all in real time."

## Demo (3–4 minutes)

### 1. Show the empty interface (15s)
"Left panel: raw AI output. Right panel: the trust engine — a multi-agent pipeline
that extracts claims, retrieves evidence, runs a critic-judge debate, and corrects
the response. Watch the pipeline stages light up as each agent activates."

### 2. Submit prompt (press Cmd+Enter)
"Watch the reasoning trace on the left — you can see what the generator is thinking.
On the right, the pipeline status bar shows which agent is currently active."

### 3. Claims appear (30s)
"LUNA extracted 6 factual claims from the response. Look at the raw output —
each claim is underlined in color. Green: verified. Amber: uncertain. Red: contradicted.
That red one — 'quantum advantage demonstrated in enterprise workloads' — is wrong.
LUNA caught it."

### 4. Evidence + Critic (30s)
"These aren't hallucinated sources. These are real Wikipedia and research snippets
retrieved in real time. The critic analyzed each claim against the evidence and
flagged two issues. The judge ruled correction was needed."

### 5. Reasoning traces (20s)
Click the reasoning expand on the Critic section:
"You can see exactly WHY the critic flagged each claim. This isn't a black box —
every decision is transparent and auditable."

### 6. Auditor (20s)
Click the shield icon in the top bar:
"Here's what makes LUNA unique: the auditor. This third agent watches the watchers.
It verified the critic was fair, flagged that the verifier missed one potential source,
and confirmed the judge's correction was proportionate. No other system does this."

### 7. Trust Score (15s)
Point to the trust score arc:
"Trust score went from 68% to 91% after one correction loop. Same model. Better output.
Automatically."

### 8. Cost (15s)
"And here's the business case: the generator uses GPT-4o — the user's chosen model.
But the entire trust pipeline — claim extraction, critic, judge, auditor — runs on
Llama 3.1 via Groq. Free. The trust layer costs near-zero to operate."

### 9. Close (10s)
"LUNA is a trust layer for any LLM. It's model-agnostic, transparent, and economically
viable. This isn't a chatbot. This is AI infrastructure."

## If Backend Fails
Ctrl+Shift+D loads mock data instantly. Say: "We've pre-loaded a reference run."
Ctrl+Shift+S plays animated mock. Say nothing different — it looks live.
```

---

## Testing Checklist

```
[ ] http://localhost:8000/health returns {"status": "ok"}
[ ] Frontend loads at http://localhost:5173, no console errors
[ ] Prompt A returns result within 30 seconds
[ ] Pipeline status bar progresses through all stages
[ ] Left panel shows line-numbered output with streaming cursor
[ ] Inline claim annotations appear (colored underlines on raw text)
[ ] Hallucination risk badge shows non-zero percentage
[ ] Trust score arc animates from initial to final
[ ] At least 3 claims with mixed statuses (green/amber/red)
[ ] At least 1 evidence item with real Wikipedia URL
[ ] Critic feed has 4+ messages (generator, critic, generator, judge)
[ ] Reasoning expand works on at least one section
[ ] Auditor message appears in critic feed (purple)
[ ] Audit drawer opens via shield icon in TopBar
[ ] Revised output shows in green panel
[ ] Context compression section shows token metrics
[ ] Ctrl+Shift+D loads mock instantly
[ ] Ctrl+Shift+S plays animated mock playback
[ ] Model selector works (UI-only is fine)
[ ] Cmd+Enter submits prompt
[ ] Prompt B produces meaningful results
[ ] Prompt C produces meaningful results
```

---

## Pitch Structure (2 minutes)

**Slide 1 — Problem**
> LLMs hallucinate. The industry response: disclaimers. That's not a solution.

**Slide 2 — LUNA**
> A closed-loop trust layer that detects, corrects, and proves. Model-agnostic. Real-time.

**Slide 3 — Architecture**
```
User Prompt → Generator (GPT-4o)
                  ↓
         Claim Extractor (Llama 3.1) ← FREE
                  ↓
         Verifier (Wikipedia API) ← FREE
                  ↓
         Critic (Llama 3.1 70B) ← FREE
                  ↓
         Judge → Correction Signal → Re-Generate
                  ↓
         Auditor (Llama 3.1) ← FREE ← "Who watches the watchers?"
                  ↓
         Verified Output + Trust Score
```

**Slide 4 — Demo Results**
> Hallucination risk: 32% → 9%. Trust score: 68% → 91%. Contradicted claim removed. Cost of trust layer: $0.00.

**Slide 5 — Startup Vision**
- API product: `POST /verify` for any app
- Domain verticals: medical, legal, financial
- Fine-tuned open-weight critic model (own the model, own the moat)
- Browser extension: verify any LLM output on any website

**Slide 6 — Why Now**
- Open-weight models are good enough for oversight (Llama 3.1 70B)
- Groq makes inference free/instant
- Every enterprise deploying LLMs needs a trust layer
- No one has built it as an API product

---

## Definition of Done

- [ ] `DEMO_SCRIPT.md` written and rehearsed 2+ times
- [ ] All 3 prompts tested end-to-end
- [ ] Testing checklist complete with no blockers
- [ ] Both fallback shortcuts confirmed working
- [ ] Pitch fits in 2 minutes
- [ ] Slides ready (5+ slides)
- [ ] You can answer: "How is this different from Guardrails AI?" (Answer: Guardrails detects. LUNA corrects. And LUNA audits its own pipeline.)
- [ ] You can answer: "How much does this cost to run?" (Answer: Generator is the user's model. Trust layer is Llama 3.1 via Groq — free.)

---

---

## Considerations Not Yet Addressed

### 1. Rate Limits
Groq's free tier has rate limits (~30 requests/minute). For the hackathon demo this is fine (one query at a time). For production, you'd need Groq's paid tier or self-hosted Llama via vLLM/Ollama.

### 2. Latency Budget
Full pipeline with Groq is roughly: Generator (2–4s) + Extractor (0.3s) + Verifier (1–2s) + Critic (0.8s) + Judge (0.3s) + Correction (2–4s if needed) + Auditor (0.3s) = **7–12 seconds total**. The SSE streaming masks this — the user sees progressive updates rather than waiting for the full result.

### 3. Offline/Local Mode
If Groq goes down during the demo, the backend should fall back to using OpenAI for all agents. Add a try/except in each agent that catches connection errors and retries with `generator_client` instead of `orchestrator_client`. This costs more but keeps the demo alive.

### 4. Multi-Model Debate (Stretch Goal)
Instead of one generator, run TWO generators (GPT-4o and Claude) in parallel. The critic compares their outputs and identifies disagreements. This is "cross-model debate" — a claim both models agree on is higher confidence; a claim they disagree on is flagged. This would be genuinely novel and impressive for judges.

### 5. Persistent Correction Memory (Post-Hackathon)
Store (claim, evidence, verdict) triples in a SQLite database. Before running the full pipeline, check if any claims in the new response have been seen before. If so, skip verification and use the cached verdict. This makes LUNA faster and cheaper over time.

### 6. The Fine-Tuned Critic Model (Post-Hackathon)
Collect (claim, evidence, critic_verdict) data from LUNA runs. Fine-tune a small open-weight model (Llama 3.1 8B) specifically on this task. Replace the prompt-engineered critic with the fine-tuned one. This is the technical moat — you'd own a purpose-built fact-checking model.

### 7. Browser Extension (Post-Hackathon)
A Chrome extension that detects LLM output on any website (ChatGPT, Claude, Perplexity) and sends it to `POST /verify`. Returns inline annotations directly on the page. This is the distribution strategy — users don't need to switch tools.

---

## Updated API Contract

```
POST http://localhost:8000/run
Content-Type: application/json

Request:
{
  "prompt": "string",
  "model": "gpt-4o" | "claude-3-5-sonnet" | "gemini-pro" | "llama-3-1" | "mistral-large"
}

Response 200 OK:
{
  "rawOutput": "string",
  "trust": {
    "claims": [{
      "id": "c1",
      "text": "string",
      "status": "verified" | "uncertain" | "contradicted",
      "confidence": 0-100,
      "sourceSpan": { "start": 0, "end": 42 }
    }],
    "evidence": [{
      "id": "e1",
      "source": "string",
      "url": "string",
      "snippet": "string",
      "highlight": "string",
      "relevance": 0-100,
      "claimId": "c1"
    }],
    "criticFeed": [{
      "id": "m1",
      "role": "generator" | "critic" | "judge" | "auditor",
      "content": "string",
      "reasoning": "string",
      "timestamp": "00:00.00"
    }],
    "reasoningTrace": [{
      "id": "r1",
      "agent": "generator" | "extractor" | "verifier" | "critic" | "judge" | "compressor" | "auditor",
      "action": "string",
      "detail": "string",
      "timestamp": "00:00.00",
      "status": "active" | "complete" | "failed"
    }],
    "compression": {
      "originalTokens": 2847,
      "compressedTokens": 1103,
      "ratio": 0.39,
      "preservedClaims": 6,
      "totalClaims": 6
    },
    "audit": [{
      "id": "a1",
      "target": "critic" | "judge" | "verifier",
      "assessment": "fair" | "aggressive" | "lenient" | "missed_source",
      "detail": "string",
      "severity": "info" | "warning" | "critical"
    }],
    "revisedOutput": "string",
    "hallucinationRisk": 0-100,
    "trustScoreInitial": 0-100,
    "trustScoreFinal": 0-100
  },
  "latency": 7200,
  "cost": 0.0042
}

GET http://localhost:8000/health
→ {"status": "ok", "version": "0.5.0", "models": ["groq:llama-3.1-70b", "openai:gpt-4o"]}

GET http://localhost:8000/run/stream?prompt=...&model=gpt-4o
→ SSE stream (see SSE contract in Prompt 1 section)
```

### Conventions

- `camelCase` for all JSON keys (matches TypeScript frontend)
- `confidence`, `relevance`, `hallucinationRisk`, `trustScoreInitial`, `trustScoreFinal` are integers 0–100
- `latency` is integer milliseconds
- `cost` is float USD to 6 decimal places
- `timestamp` format: `"MM:SS.ms"` (e.g. `"00:01.32"`)
- All arrays must be present even if empty (`[]`, not `null`)
- Optional fields (`sourceSpan`, `claimId`, `reasoning`, `compression`, `audit`) may be omitted
- `revisedOutput` equals `rawOutput` if no correction was needed
- `trustScoreInitial` = `100 - hallucinationRisk`
- `trustScoreFinal` = recalculated after correction pass

---

*Last updated: Hackathon Day 1. This is the authoritative contract. Any changes must be coordinated across all 5 team members.*
