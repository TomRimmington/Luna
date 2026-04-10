import type { Model, RunResult } from './types';

export const MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', latency: 142, costPer1k: 0.005 },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', latency: 198, costPer1k: 0.003 },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', provider: 'Google', latency: 112, costPer1k: 0.0035 },
  { id: 'llama-3-1', name: 'Llama 3.1 405B', provider: 'Meta', latency: 89, costPer1k: 0.0009 },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', latency: 134, costPer1k: 0.002 },
];

export const MOCK_RESULT: RunResult = {
  rawOutput: `Quantum computing leverages quantum mechanical phenomena—superposition and entanglement—to process information fundamentally differently than classical computers.

Classical bits exist in a binary state (0 or 1), while quantum bits (qubits) can exist in a superposition of both states simultaneously. This allows quantum computers to evaluate multiple computational paths concurrently.

Key quantum algorithms include:
  • Shor's Algorithm: Factors large integers in polynomial time, threatening RSA encryption. A 4096-qubit fault-tolerant quantum computer could break RSA-2048 in approximately 8 hours.

  • Grover's Algorithm: Provides quadratic speedup for unstructured database search, reducing O(N) to O(√N) complexity.

  • Quantum Approximate Optimization Algorithm (QAOA): Addresses combinatorial optimization problems with near-term quantum devices.

Current state-of-the-art systems (IBM Condor: 1,121 qubits; Google Willow: 105 qubits) remain in the NISQ (Noisy Intermediate-Scale Quantum) era. Practical quantum advantage over classical systems has been demonstrated in narrow, synthetic benchmarks but not yet in real-world enterprise workloads.

Decoherence remains the primary engineering challenge. Maintaining qubit coherence requires temperatures approaching absolute zero (~15 millikelvin), roughly 180× colder than deep space.

Timeline to cryptographically relevant quantum computers: most consensus estimates range from 10–20 years, though some researchers suggest the window may compress with error correction breakthroughs.`,

  trust: {
    hallucinationRisk: 32,
    claims: [
      {
        id: 'c1',
        text: 'IBM Condor has 1,121 qubits',
        status: 'verified',
        confidence: 97,
      },
      {
        id: 'c2',
        text: "Shor's Algorithm can break RSA-2048 in ~8 hours with a 4096-qubit system",
        status: 'uncertain',
        confidence: 61,
      },
      {
        id: 'c3',
        text: 'Quantum computers operate at ~15 millikelvin, 180× colder than deep space',
        status: 'verified',
        confidence: 94,
      },
      {
        id: 'c4',
        text: 'Google Willow has 105 qubits',
        status: 'verified',
        confidence: 99,
      },
      {
        id: 'c5',
        text: 'Cryptographically relevant quantum computers are 10–20 years away',
        status: 'uncertain',
        confidence: 54,
      },
      {
        id: 'c6',
        text: 'Quantum advantage demonstrated in real-world enterprise workloads',
        status: 'contradicted',
        confidence: 12,
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
      },
      {
        id: 'e2',
        source: 'Nature — Google Quantum AI',
        url: 'nature.com/articles/s41586-024-08119-3',
        snippet:
          'Google\'s Willow chip demonstrated below-threshold quantum error correction on a 105-qubit system, achieving exponential error reduction as qubit count increases.',
        highlight: '105-qubit system',
        relevance: 96,
      },
      {
        id: 'e3',
        source: 'NIST Post-Quantum Cryptography Report',
        url: 'nvlpubs.nist.gov',
        snippet:
          'The resource estimates for breaking RSA-2048 using Shor\'s algorithm vary significantly across studies, ranging from thousands to millions of physical qubits depending on error correction assumptions.',
        highlight: 'resource estimates vary significantly',
        relevance: 78,
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
        timestamp: '00:00.58',
      },
      {
        id: 'm5',
        role: 'judge',
        content:
          'Ruling: The response requires two corrections. (1) The RSA break timeline needs qualification with model assumptions. (2) The quantum advantage claim must be corrected—no real-world enterprise advantage exists yet. Overall quality: Good with targeted fixes needed.',
        timestamp: '00:01.02',
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
    claims: [],
    evidence: [],
    criticFeed: [],
    revisedOutput: '',
  },
  latency: 0,
  cost: 0,
};
