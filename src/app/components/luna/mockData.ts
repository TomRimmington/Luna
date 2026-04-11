import type { Model, RunResult } from './types';

export const MODELS: Model[] = [
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', costPer1k: 0.003 },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', costPer1k: 0.003 },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', costPer1k: 0.001 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', costPer1k: 0.005 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', costPer1k: 0.0003 },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', costPer1k: 0.0 },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', provider: 'Meta', costPer1k: 0.0 },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', costPer1k: 0.0001 },
];

const RAW_OUTPUT = `Quantum computing leverages quantum mechanical phenomena—superposition and entanglement—to process information fundamentally differently than classical computers.

Classical bits exist in a binary state (0 or 1), while quantum bits (qubits) can exist in a superposition of both states simultaneously. This allows quantum computers to evaluate multiple computational paths concurrently.

Key quantum algorithms include:
  • Shor's Algorithm: Factors large integers in polynomial time, threatening RSA encryption. A 4096-qubit fault-tolerant quantum computer could break RSA-2048 in approximately 8 hours.

  • Grover's Algorithm: Provides quadratic speedup for unstructured database search, reducing O(N) to O(√N) complexity.

  • Quantum Approximate Optimization Algorithm (QAOA): Addresses combinatorial optimization problems with near-term quantum devices.

Current state-of-the-art systems (IBM Condor: 1,121 qubits; Google Willow: 105 qubits) remain in the NISQ (Noisy Intermediate-Scale Quantum) era. Practical quantum advantage over classical systems has been demonstrated in narrow, synthetic benchmarks but not yet in real-world enterprise workloads.

Decoherence remains the primary engineering challenge. Maintaining qubit coherence requires temperatures approaching absolute zero (~15 millikelvin), roughly 180× colder than deep space.

Timeline to cryptographically relevant quantum computers: most consensus estimates range from 10–20 years, though some researchers suggest the window may compress with error correction breakthroughs.`;

function findSpan(text: string, raw: string): { start: number; end: number } | undefined {
  const idx = raw.indexOf(text);
  if (idx >= 0) return { start: idx, end: idx + text.length };

  const words = text.toLowerCase().split(/\s+/);
  const rawLower = raw.toLowerCase();
  let bestStart = 0, bestEnd = 0, bestLen = 0;
  for (let i = 0; i < words.length; i++) {
    for (let j = words.length; j > i + 2; j--) {
      const phrase = words.slice(i, j).join(' ');
      const idx2 = rawLower.indexOf(phrase);
      if (idx2 >= 0 && (j - i) > bestLen) {
        bestStart = idx2;
        bestEnd = idx2 + phrase.length;
        bestLen = j - i;
        break;
      }
    }
  }
  if (bestLen >= 3) return { start: bestStart, end: bestEnd };
  return undefined;
}

const CLAIM_TEXTS = [
  'IBM Condor: 1,121 qubits',
  'break RSA-2048 in approximately 8 hours',
  'roughly 180× colder than deep space',
  'Google Willow: 105 qubits',
  'most consensus estimates range from 10–20 years',
  'not yet in real-world enterprise workloads',
];

export const MOCK_RESULT: RunResult = {
  rawOutput: RAW_OUTPUT,

  trust: {
    hallucinationRisk: 32,
    trustScoreInitial: 68,
    trustScoreFinal: 91,
    claims: [
      {
        id: 'c1',
        text: 'IBM Condor has 1,121 qubits',
        status: 'verified',
        confidence: 97,
        sourceSpan: findSpan(CLAIM_TEXTS[0], RAW_OUTPUT),
      },
      {
        id: 'c2',
        text: "Shor's Algorithm can break RSA-2048 in ~8 hours with a 4096-qubit system",
        status: 'uncertain',
        confidence: 61,
        sourceSpan: findSpan(CLAIM_TEXTS[1], RAW_OUTPUT),
      },
      {
        id: 'c3',
        text: 'Quantum computers operate at ~15 millikelvin, 180× colder than deep space',
        status: 'verified',
        confidence: 94,
        sourceSpan: findSpan(CLAIM_TEXTS[2], RAW_OUTPUT),
      },
      {
        id: 'c4',
        text: 'Google Willow has 105 qubits',
        status: 'verified',
        confidence: 99,
        sourceSpan: findSpan(CLAIM_TEXTS[3], RAW_OUTPUT),
      },
      {
        id: 'c5',
        text: 'Cryptographically relevant quantum computers are 10–20 years away',
        status: 'uncertain',
        confidence: 54,
        sourceSpan: findSpan(CLAIM_TEXTS[4], RAW_OUTPUT),
      },
      {
        id: 'c6',
        text: 'Quantum advantage demonstrated in real-world enterprise workloads',
        status: 'contradicted',
        confidence: 12,
        sourceSpan: findSpan(CLAIM_TEXTS[5], RAW_OUTPUT),
      },
    ],
    evidence: [
      {
        id: 'e1',
        source: 'IBM Research Blog',
        url: 'research.ibm.com',
        snippet:
          'IBM unveiled the 1,121-qubit IBM Condor processor in December 2023, representing a significant milestone in quantum hardware development and demonstrating continued progress toward fault-tolerant systems.',
        highlight: '1,121-qubit IBM Condor processor',
        relevance: 98,
        claimId: 'c1',
      },
      {
        id: 'e2',
        source: 'Nature — Google Quantum AI',
        url: 'nature.com/articles/s41586-024-08119-3',
        snippet:
          "Google's Willow chip demonstrated below-threshold quantum error correction on a 105-qubit system, achieving exponential error reduction as qubit count increases.",
        highlight: '105-qubit system',
        relevance: 96,
        claimId: 'c4',
      },
      {
        id: 'e3',
        source: 'NIST Post-Quantum Cryptography Report',
        url: 'nvlpubs.nist.gov',
        snippet:
          "The resource estimates for breaking RSA-2048 using Shor's algorithm vary significantly across studies, ranging from thousands to millions of physical qubits depending on error correction assumptions.",
        highlight: 'resource estimates vary significantly',
        relevance: 78,
        claimId: 'c2',
      },
    ],
    criticFeed: [
      {
        id: 'm1',
        role: 'generator',
        content:
          "I'll provide a comprehensive overview of quantum computing, covering qubits, key algorithms, current hardware state, and timeline projections for cryptographic relevance.",
        timestamp: '00:00.12',
      },
      {
        id: 'm2',
        role: 'critic',
        content:
          'The claim that a 4096-qubit system breaks RSA-2048 in ~8 hours is likely an optimistic estimate. Most peer-reviewed analyses require significantly more logical qubits after error correction overhead. This figure may mislead readers about current threat timelines.',
        reasoning:
          'Cross-referenced the RSA-2048 break time claim against NIST evidence. The 8-hour figure comes from Webber et al. (2022) which assumes optimistic error correction. NIST reports indicate estimates vary by orders of magnitude. Flagging as uncertain due to conflicting sources.',
        timestamp: '00:00.31',
      },
      {
        id: 'm3',
        role: 'generator',
        content:
          'Acknowledged. The 8-hour figure comes from a 2022 paper by Webber et al. assuming specific error correction codes. I should caveat this estimate more explicitly as model-dependent.',
        timestamp: '00:00.44',
      },
      {
        id: 'm4',
        role: 'critic',
        content:
          'Additionally, the statement that quantum advantage has been demonstrated in real-world enterprise workloads is factually incorrect. All demonstrated quantum advantages remain on synthetic, constructed benchmarks—not practical applications.',
        reasoning:
          'Checked claim c6 against all retrieved evidence. No source supports enterprise quantum advantage. All sources describe narrow benchmark demonstrations only. This is a clear contradiction.',
        timestamp: '00:00.58',
      },
      {
        id: 'm5',
        role: 'judge',
        content:
          'Ruling: The response requires two corrections. (1) The RSA break timeline needs qualification with model assumptions. (2) The quantum advantage claim must be corrected—no real-world enterprise advantage exists yet. Overall quality: Good with targeted fixes needed.',
        reasoning:
          'Assessed critic findings: 1 contradicted claim (enterprise advantage — severity HIGH), 2 uncertain claims (RSA timeline, crypto window — severity MEDIUM). Contradicted claim requires removal or correction. Uncertain claims require qualification language. Correction signal targets these 3 specific claims.',
        timestamp: '00:01.02',
      },
      {
        id: 'm6',
        role: 'auditor',
        content:
          'Orchestrator audit complete. Critic assessment is fair — no false positives in contradicted claims. Verifier missed one potential source for the deep space temperature comparison. Judge correction signal is proportionate. No intervention required.',
        reasoning:
          'Checked critic-to-evidence alignment for all 6 claims. The critic flagged c2 and c6 — both are justified by the retrieved NIST and Wikipedia evidence. The verifier returned 0 results for c3 and c5, but c3 was still verified via indirect mention in other evidence. c5 has no retrieved evidence but is marked uncertain (appropriate). Judge did not over-correct verified claims. No bias pattern detected.',
        timestamp: '00:01.12',
      },
    ],
    reasoningTrace: [
      {
        id: 'r1',
        agent: 'generator',
        action: 'Initializing response generation',
        detail:
          'User prompt requests quantum computing overview with specific qubit counts and timeline projections. Will need to include IBM Condor, Google Willow, and NISQ-era context. Setting temperature to 0.3 for factual precision.',
        timestamp: '00:00.02',
        status: 'complete' as const,
      },
      {
        id: 'r2',
        agent: 'extractor',
        action: 'Decomposing response into atomic claims',
        detail:
          'Response contains approximately 280 words across 5 paragraphs. Identified 9 candidate factual statements. Filtering to 6 checkworthy claims containing specific numbers, named entities, or verifiable assertions. Discarding 3 definitional statements that are not empirically falsifiable.',
        timestamp: '00:00.18',
        status: 'complete' as const,
      },
      {
        id: 'r3',
        agent: 'verifier',
        action: 'Retrieving evidence for 6 claims',
        detail:
          'Running parallel Wikipedia lookups for: IBM Condor, Google Willow, RSA-2048, quantum millikelvin, quantum advantage enterprise. Wikipedia returned results for 4/6. Tavily returned results for 1/6. 1 claim has no external evidence available.',
        timestamp: '00:00.24',
        status: 'complete' as const,
      },
      {
        id: 'r4',
        agent: 'critic',
        action: 'Evaluating factual accuracy',
        detail:
          'Cross-referencing 6 claims against 3 evidence sources. Claim c2 (RSA-2048 break time) uses a specific number (8 hours) from a single 2022 paper (Webber et al.) that assumes optimistic error correction. NIST evidence shows estimates vary by orders of magnitude. Flagging as uncertain. Claim c6 (enterprise quantum advantage) directly contradicted by all retrieved sources — no real-world advantage demonstrated.',
        timestamp: '00:00.38',
        status: 'complete' as const,
      },
      {
        id: 'r5',
        agent: 'judge',
        action: 'Issuing correction ruling',
        detail:
          'Assessing critic findings: 1 contradicted claim (enterprise advantage — severity HIGH), 2 uncertain claims (RSA timeline, crypto window — severity MEDIUM). Contradicted claim requires removal or correction. Uncertain claims require qualification language. Generating correction signal targeting these 3 specific claims. Setting max iteration to 1.',
        timestamp: '00:00.52',
        status: 'complete' as const,
      },
      {
        id: 'r6',
        agent: 'compressor',
        action: 'Compressing orchestration context',
        detail:
          'Original context: 2,847 tokens across generator output, 6 claims, 3 evidence snippets, and critic-judge exchange. Compressed to 1,103 tokens by: (1) replacing full evidence snippets with claim-relevance pairs, (2) summarizing critic exchange into correction directive, (3) retaining all claim IDs and statuses. Compression ratio: 0.39. All 6 claims preserved in compressed representation.',
        timestamp: '00:00.58',
        status: 'complete' as const,
      },
      {
        id: 'r7',
        agent: 'auditor',
        action: 'Auditing orchestrator decisions',
        detail:
          'Reviewing critic assessment of 6 claims. Critic correctly identified contradicted enterprise advantage claim — no false positive. Critic flagged RSA-2048 timeline as uncertain; this is appropriate given conflicting sources. Critic did NOT flag the "180x colder than deep space" claim despite no direct evidence retrieved — possible missed verification opportunity, though claim is well-established. Judge correction signal is proportionate. No systematic bias detected. Overall assessment: orchestrator performed fairly.',
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
        detail:
          'Critic correctly identified the contradicted enterprise advantage claim and appropriately flagged the RSA-2048 timeline as uncertain given conflicting source estimates.',
        severity: 'info' as const,
      },
      {
        id: 'a2',
        target: 'verifier' as const,
        assessment: 'missed_source' as const,
        detail:
          'Verifier did not retrieve evidence for the "180x colder than deep space" claim (c3). While the claim is verified via indirect evidence, a dedicated source would strengthen confidence.',
        severity: 'warning' as const,
      },
      {
        id: 'a3',
        target: 'judge' as const,
        assessment: 'fair' as const,
        detail:
          'Judge correction signal is proportionate to the identified issues. Correction targets only the 3 problematic claims without overriding accurate content.',
        severity: 'info' as const,
      },
    ],
    revisedOutput: `Quantum computing leverages quantum mechanical phenomena—superposition and entanglement—to process information fundamentally differently than classical computers.

Classical bits exist in a binary state (0 or 1), while quantum bits (qubits) can exist in superposition of both states simultaneously. This allows quantum computers to evaluate multiple computational paths concurrently.

Key quantum algorithms include:
  • Shor's Algorithm: Factors large integers in polynomial time, threatening RSA encryption. Resource estimates for breaking RSA-2048 vary widely across studies (thousands to millions of physical qubits) depending on error correction assumptions; one model suggests ~4,000 logical qubits could suffice under optimistic conditions.

  • Grover's Algorithm: Provides quadratic speedup for unstructured database search, reducing O(N) to O(√N) complexity.

  • QAOA: Addresses combinatorial optimization with near-term quantum devices.

Current state-of-the-art systems (IBM Condor: 1,121 qubits; Google Willow: 105 qubits) remain in the NISQ era. While narrow benchmark demonstrations of quantum speedup exist, practical quantum advantage over classical systems in real-world enterprise workloads has not yet been achieved.

Decoherence remains the primary engineering challenge, requiring temperatures near absolute zero (~15 millikelvin).

Timeline to cryptographically relevant quantum computers: consensus estimates of 10–20 years, contingent on error correction advances.`,
  },
  latency: 142,
  cost: 0.0031,
};

export const EMPTY_RESULT: RunResult = {
  rawOutput: '',
  trust: {
    hallucinationRisk: 0,
    trustScoreInitial: 0,
    trustScoreFinal: 0,
    claims: [],
    evidence: [],
    criticFeed: [],
    reasoningTrace: [],
    revisedOutput: '',
  },
  latency: 0,
  cost: 0,
};
