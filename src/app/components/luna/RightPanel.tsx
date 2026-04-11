import { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Cpu,
  Scale,
  Sparkles,
  Shield,
  Archive,
} from 'lucide-react';
import type {
  RunResult,
  Claim,
  Evidence,
  CriticMessage,
  ReasoningStep,
  PipelineStage,
  CompressionMetrics,
} from './types';

interface RightPanelProps {
  result: RunResult | null;
  isRunning: boolean;
  stage?: PipelineStage;
  streamedClaims?: Claim[];
  streamedEvidence?: Evidence[];
  streamedCritic?: CriticMessage[];
  streamedRevised?: string;
  reasoningTrace?: ReasoningStep[];
  compression?: CompressionMetrics | null;
}

// ── Pipeline Status Bar ─────────────────────────────────────────
const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: 'generating', label: 'GEN' },
  { key: 'extracting', label: 'EXTRACT' },
  { key: 'verifying', label: 'VERIFY' },
  { key: 'critiquing', label: 'CRITIQUE' },
  { key: 'judging', label: 'JUDGE' },
  { key: 'correcting', label: 'CORRECT' },
  { key: 'compressing', label: 'COMPRESS' },
  { key: 'auditing', label: 'AUDIT' },
];

function PipelineStatusBar({ stage }: { stage: PipelineStage }) {
  if (stage === 'idle') return null;

  const stageKeys = PIPELINE_STAGES.map(s => s.key);
  const currentIdx = stageKeys.indexOf(stage);
  const isComplete = stage === 'complete';

  return (
    <div
      style={{
        padding: '8px 14px',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      {PIPELINE_STAGES.map((s, i) => {
        const isCompleted = isComplete || i < currentIdx;
        const isCurrent = !isComplete && i === currentIdx;
        const isFuture = !isComplete && i > currentIdx;

        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div
                style={{
                  width: '12px',
                  height: '1px',
                  background: isCompleted ? '#3a3a3a' : '#1e1e1e',
                  borderStyle: isFuture ? 'dashed' : 'solid',
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isCompleted ? '#8a8a8a' : isCurrent ? '#d29922' : 'transparent',
                  border: isFuture ? '1px solid #333' : 'none',
                  animation: isCurrent ? 'pulse 1s ease-in-out infinite' : 'none',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '8px',
                  color: isCompleted ? '#b0b0b0' : isCurrent ? '#d29922' : '#5a5a5a',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Reasoning Inline Panel ──────────────────────────────────────
function ReasoningPanel({ steps }: { steps: ReasoningStep[] }) {
  if (steps.length === 0) return null;

  const agentColors: Record<string, string> = {
    extractor: '#8a8a8a',
    verifier: '#8a8a8a',
    critic: '#d29922',
    judge: '#cccccc',
    compressor: '#6e6e6e',
    auditor: '#a371f7',
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderLeft: `2px solid ${agentColors[steps[0]?.agent] || '#333'}`,
        padding: '6px 10px',
        marginBottom: '6px',
        borderRadius: '0 3px 3px 0',
      }}
    >
      {steps.map(step => (
        <p
          key={step.id}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#b0b0b0',
            lineHeight: 1.6,
            margin: '0 0 4px 0',
          }}
        >
          {step.detail}
        </p>
      ))}
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────
function SectionHeader({
  title,
  icon,
  count,
  expanded,
  onToggle,
  reasoningSteps,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  reasoningSteps?: ReasoningStep[];
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const hasReasoning = reasoningSteps && reasoningSteps.length > 0;

  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '9px 14px',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #222',
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ color: '#9e9e9e', display: 'flex', alignItems: 'center' }}>{icon}</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#cccccc',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </span>
          {count !== undefined && (
            <span
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #2e2e2e',
                borderRadius: '8px',
                padding: '1px 6px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#b0b0b0',
              }}
            >
              {count}
            </span>
          )}
          {hasReasoning && (
            <span
              onClick={e => { e.stopPropagation(); setShowReasoning(!showReasoning); }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                color: '#8a8a8a',
                cursor: 'pointer',
                padding: '1px 5px',
                borderRadius: '3px',
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLSpanElement).style.color = '#cccccc')}
              onMouseLeave={e => ((e.currentTarget as HTMLSpanElement).style.color = '#8a8a8a')}
            >
              {showReasoning ? '▾' : '▸'} reasoning
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={12} style={{ color: '#9e9e9e' }} />
        ) : (
          <ChevronDown size={12} style={{ color: '#9e9e9e' }} />
        )}
      </button>
      {showReasoning && hasReasoning && (
        <div style={{ padding: '6px 14px' }}>
          <ReasoningPanel steps={reasoningSteps!} />
        </div>
      )}
    </div>
  );
}

// ── Claim Card ──────────────────────────────────────────────────
function ClaimCard({ claim }: { claim: Claim }) {
  const statusConfig = {
    verified: {
      icon: <CheckCircle size={11} />,
      color: '#3fb950',
      bg: 'rgba(35, 134, 54, 0.08)',
      border: 'rgba(35, 134, 54, 0.2)',
      leftBorder: '#2a5a2a',
      label: 'Verified',
    },
    uncertain: {
      icon: <AlertCircle size={11} />,
      color: '#d29922',
      bg: 'rgba(187, 128, 9, 0.08)',
      border: 'rgba(187, 128, 9, 0.2)',
      leftBorder: '#5a4000',
      label: 'Uncertain',
    },
    contradicted: {
      icon: <XCircle size={11} />,
      color: '#f85149',
      bg: 'rgba(218, 54, 51, 0.08)',
      border: 'rgba(218, 54, 51, 0.2)',
      leftBorder: '#5a1a1a',
      label: 'Contradicted',
    },
  };

  const cfg = statusConfig[claim.status];

  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid #222',
        borderLeft: `2px solid ${cfg.leftBorder}`,
        borderRadius: '5px',
        padding: '9px 11px',
        transition: 'border-color 0.12s',
        animation: 'fadeIn 0.3s ease',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2e2e2e')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#222')}
    >
      <div style={{ marginBottom: '7px' }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: '#b0b0b0',
            lineHeight: 1.5,
          }}
        >
          {claim.text}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: '4px',
            padding: '2px 7px',
          }}
        >
          <span style={{ color: cfg.color, display: 'flex', alignItems: 'center' }}>{cfg.icon}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '56px',
              height: '2px',
              background: '#1e1e1e',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${claim.confidence}%`,
                height: '100%',
                background: cfg.color,
                borderRadius: '2px',
              }}
            />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#b0b0b0' }}>
            {claim.confidence}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Evidence Card ───────────────────────────────────────────────
function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const highlighted = evidence.snippet.replace(
    evidence.highlight,
    `<mark style="background: rgba(255,255,255,0.1); color: #cccccc; border-radius: 2px; padding: 0 2px;">${evidence.highlight}</mark>`
  );

  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid #222',
        borderRadius: '5px',
        padding: '9px 11px',
        transition: 'border-color 0.12s',
        animation: 'fadeIn 0.3s ease',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2e2e2e')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#222')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#cccccc' }}>
            {evidence.source}
          </span>
          <ExternalLink size={9} style={{ color: '#9e9e9e' }} />
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#b0b0b0',
            background: 'rgba(255,255,255,0.03)',
            padding: '1px 6px',
            borderRadius: '3px',
          }}
        >
          rel: {evidence.relevance}%
        </span>
      </div>
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#b0b0b0',
          lineHeight: 1.6,
          margin: 0,
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

// ── Critic Message ──────────────────────────────────────────────
function CriticMsg({ message }: { message: CriticMessage }) {
  const [showReasoning, setShowReasoning] = useState(false);

  const roleConfig: Record<string, { label: string; color: string; borderColor: string; bg: string; icon: React.ReactNode }> = {
    generator: {
      label: 'Generator',
      color: '#8a8a8a',
      borderColor: '#2e2e2e',
      bg: 'rgba(255,255,255,0.025)',
      icon: <Cpu size={10} />,
    },
    critic: {
      label: 'Critic',
      color: '#d29922',
      borderColor: '#3a3000',
      bg: 'rgba(187,128,9,0.05)',
      icon: <AlertCircle size={10} />,
    },
    judge: {
      label: 'Judge',
      color: '#cccccc',
      borderColor: '#3a3a3a',
      bg: 'rgba(255,255,255,0.04)',
      icon: <Scale size={10} />,
    },
    auditor: {
      label: 'Auditor',
      color: '#a371f7',
      borderColor: '#2d1b69',
      bg: 'rgba(163, 113, 247, 0.05)',
      icon: <Shield size={10} />,
    },
  };

  const cfg = roleConfig[message.role] || roleConfig.generator;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.borderColor}`,
        borderRadius: '5px',
        padding: '9px 11px',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: cfg.color, display: 'flex', alignItems: 'center' }}>{cfg.icon}</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: cfg.color,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {cfg.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {message.reasoning && (
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                color: '#8a8a8a',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '1px 4px',
                borderRadius: '3px',
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#cccccc')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#8a8a8a')}
            >
              {showReasoning ? '▾' : '▸'} reasoning
            </button>
          )}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#7a7a7a' }}>
            {message.timestamp}
          </span>
        </div>
      </div>
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '11.5px',
          color: '#cccccc',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {message.content}
      </p>
      {showReasoning && message.reasoning && (
        <div
          style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: `1px solid ${cfg.borderColor}`,
          }}
        >
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#9e9e9e',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {message.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Compression Section ─────────────────────────────────────────
function CompressionSection({ metrics }: { metrics: CompressionMetrics }) {
  const compressedPct = Math.round(metrics.ratio * 100);
  return (
    <div style={{ padding: '9px 14px' }}>
      <div
        style={{
          background: '#111111',
          border: '1px solid #222',
          borderRadius: '5px',
          padding: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#b0b0b0', letterSpacing: '0.05em' }}>
              ORIGINAL
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc', marginLeft: '8px' }}>
              {metrics.originalTokens.toLocaleString()} tokens
            </span>
          </div>
        </div>
        <div style={{ height: '4px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ width: '100%', height: '100%', background: '#4a4a4a', borderRadius: '2px' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#b0b0b0', letterSpacing: '0.05em' }}>
              COMPRESSED
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc', marginLeft: '8px' }}>
              {metrics.compressedTokens.toLocaleString()} tokens
            </span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#b0b0b0' }}>
            ratio: {metrics.ratio}
          </span>
        </div>
        <div style={{ height: '4px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ width: `${compressedPct}%`, height: '100%', background: '#3fb950', borderRadius: '2px' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#b0b0b0' }}>
            Claims preserved: {metrics.preservedClaims}/{metrics.totalClaims}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Diff View ───────────────────────────────────────────────────
function DiffView({ original, revised }: { original: string; revised: string }) {
  const origSentences = original.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const revSentences = revised.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);

  const origSet = new Set(origSentences.map(s => s.trim()));
  const revSet = new Set(revSentences.map(s => s.trim()));

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', lineHeight: 1.7 }}>
      {revSentences.map((sentence, i) => {
        const trimmed = sentence.trim();
        const isNew = !origSet.has(trimmed);
        return (
          <span
            key={i}
            style={{
              color: isNew ? '#3fb950' : '#9e9e9e',
              background: isNew ? 'rgba(35, 134, 54, 0.08)' : 'transparent',
              borderRadius: isNew ? '2px' : '0',
              padding: isNew ? '0 2px' : '0',
            }}
          >
            {sentence}{' '}
          </span>
        );
      })}
      {origSentences
        .filter(s => !revSet.has(s.trim()))
        .map((removed, i) => (
          <span
            key={`rm-${i}`}
            style={{
              color: '#f85149',
              textDecoration: 'line-through',
              opacity: 0.6,
            }}
          >
            {removed}{' '}
          </span>
        ))}
    </div>
  );
}

// ── Skeleton Loader ─────────────────────────────────────────────
function SkeletonLoader({ lines = 4 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 14px' }}>
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          style={{
            height: '11px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '2px',
            width: `${48 + ((i * 23) % 52)}%`,
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function RightPanel({
  result,
  isRunning,
  stage = 'idle',
  streamedClaims = [],
  streamedEvidence = [],
  streamedCritic = [],
  streamedRevised = '',
  reasoningTrace = [],
  compression = null,
}: RightPanelProps) {
  const [sections, setSections] = useState({
    claims: true,
    evidence: true,
    critic: true,
    compression: true,
    revised: true,
  });

  const toggle = (key: keyof typeof sections) =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const EmptyState = ({ text }: { text: string }) => (
    <div style={{ padding: '16px 14px', textAlign: 'center' }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#7a7a7a' }}>{text}</span>
    </div>
  );

  const claims = result?.trust.claims ?? streamedClaims;
  const evidence = result?.trust.evidence ?? streamedEvidence;
  const critic = result?.trust.criticFeed ?? streamedCritic;
  const revised = result?.trust.revisedOutput ?? streamedRevised;
  const comp = result?.trust.compression ?? compression;
  const trace = result?.trust.reasoningTrace ?? reasoningTrace;

  const extractorSteps = trace.filter(t => t.agent === 'extractor');
  const verifierSteps = trace.filter(t => t.agent === 'verifier');
  const criticJudgeSteps = trace.filter(t => t.agent === 'critic' || t.agent === 'judge');
  const compressorSteps = trace.filter(t => t.agent === 'compressor');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#181818',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#2a2a2a transparent',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: isRunning ? '#d29922' : result ? '#8a8a8a' : '#3a3a3a',
            animation: isRunning ? 'pulse 1s ease-in-out infinite' : 'none',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#cccccc',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Trust Engine
        </span>
        {result && (
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #2e2e2e',
              borderRadius: '4px',
              padding: '2px 7px',
            }}
          >
            <Sparkles size={9} style={{ color: '#b0b0b0' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#b0b0b0' }}>
              Analysis Complete
            </span>
          </div>
        )}
      </div>

      {/* Pipeline Status Bar */}
      <PipelineStatusBar stage={stage} />

      {/* Claims */}
      <div style={{ flexShrink: 0 }}>
        <SectionHeader
          title="Claims"
          icon={<CheckCircle size={12} />}
          count={claims.length || undefined}
          expanded={sections.claims}
          onToggle={() => toggle('claims')}
          reasoningSteps={extractorSteps}
        />
        {sections.claims && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {isRunning && claims.length === 0 ? (
              <SkeletonLoader lines={5} />
            ) : claims.length > 0 ? (
              claims.map(claim => <ClaimCard key={claim.id} claim={claim} />)
            ) : (
              <EmptyState text="// no claims extracted" />
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#1a1a1a', flexShrink: 0 }} />

      {/* Evidence */}
      <div style={{ flexShrink: 0 }}>
        <SectionHeader
          title="Evidence"
          icon={<ExternalLink size={12} />}
          count={evidence.length || undefined}
          expanded={sections.evidence}
          onToggle={() => toggle('evidence')}
          reasoningSteps={verifierSteps}
        />
        {sections.evidence && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {isRunning && evidence.length === 0 ? (
              <SkeletonLoader lines={4} />
            ) : evidence.length > 0 ? (
              evidence.map(ev => <EvidenceCard key={ev.id} evidence={ev} />)
            ) : (
              <EmptyState text="// no sources retrieved" />
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#1a1a1a', flexShrink: 0 }} />

      {/* Critic Feed */}
      <div style={{ flexShrink: 0 }}>
        <SectionHeader
          title="Critic Feed"
          icon={<MessageSquare size={12} />}
          count={critic.length || undefined}
          expanded={sections.critic}
          onToggle={() => toggle('critic')}
          reasoningSteps={criticJudgeSteps}
        />
        {sections.critic && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {isRunning && critic.length === 0 ? (
              <SkeletonLoader lines={6} />
            ) : critic.length > 0 ? (
              critic.map(msg => <CriticMsg key={msg.id} message={msg} />)
            ) : (
              <EmptyState text="// critic exchange pending" />
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#1a1a1a', flexShrink: 0 }} />

      {/* Context Compression */}
      {comp && (
        <>
          <div style={{ flexShrink: 0 }}>
            <SectionHeader
              title="Context Compression"
              icon={<Archive size={12} />}
              expanded={sections.compression}
              onToggle={() => toggle('compression')}
              reasoningSteps={compressorSteps}
            />
            {sections.compression && <CompressionSection metrics={comp} />}
          </div>
          <div style={{ height: '1px', background: '#1a1a1a', flexShrink: 0 }} />
        </>
      )}

      {/* Revised Output */}
      <div style={{ flexShrink: 0 }}>
        <SectionHeader
          title="Revised Output"
          icon={<Sparkles size={12} />}
          expanded={sections.revised}
          onToggle={() => toggle('revised')}
        />
        {sections.revised && (
          <div style={{ padding: '9px 14px' }}>
            {isRunning && !revised ? (
              <SkeletonLoader lines={7} />
            ) : revised ? (
              <div
                style={{
                  background: 'rgba(35, 134, 54, 0.04)',
                  border: '1px solid #1e3a1e',
                  borderRadius: '5px',
                  padding: '11px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '9px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3fb950' }} />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                      color: '#3fb950',
                      letterSpacing: '0.08em',
                    }}
                  >
                    CRITIC-IMPROVED
                  </span>
                </div>
                {result?.rawOutput ? (
                  <DiffView original={result.rawOutput} revised={revised} />
                ) : (
                  <pre
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#9e9e9e',
                      lineHeight: 1.7,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {revised}
                  </pre>
                )}
              </div>
            ) : (
              <EmptyState text="// revised output pending" />
            )}
          </div>
        )}
      </div>

      <div style={{ height: '130px', flexShrink: 0 }} />
    </div>
  );
}
