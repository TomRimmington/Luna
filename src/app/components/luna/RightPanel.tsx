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
} from 'lucide-react';
import type { RunResult, Claim, Evidence, CriticMessage } from './types';

interface RightPanelProps {
  result: RunResult | null;
  isRunning: boolean;
}

function SectionHeader({
  title,
  icon,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
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
        <span style={{ color: '#5a5a5a', display: 'flex', alignItems: 'center' }}>{icon}</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#6e6e6e',
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
              color: '#6e6e6e',
            }}
          >
            {count}
          </span>
        )}
      </div>
      {expanded ? (
        <ChevronUp size={12} style={{ color: '#4a4a4a' }} />
      ) : (
        <ChevronDown size={12} style={{ color: '#4a4a4a' }} />
      )}
    </button>
  );
}

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
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#5a5a5a' }}>
            {claim.confidence}%
          </span>
        </div>
      </div>
    </div>
  );
}

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
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2e2e2e')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#222')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#8a8a8a' }}>
            {evidence.source}
          </span>
          <ExternalLink size={9} style={{ color: '#4a4a4a' }} />
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#5a5a5a',
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
          color: '#666666',
          lineHeight: 1.6,
          margin: 0,
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

function CriticMsg({ message }: { message: CriticMessage }) {
  const roleConfig = {
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
  };

  const cfg = roleConfig[message.role];

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.borderColor}`,
        borderRadius: '5px',
        padding: '9px 11px',
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
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#2e2e2e' }}>
          {message.timestamp}
        </span>
      </div>
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '11.5px',
          color: '#6e6e6e',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {message.content}
      </p>
    </div>
  );
}

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

export function RightPanel({ result, isRunning }: RightPanelProps) {
  const [sections, setSections] = useState({
    claims: true,
    evidence: true,
    critic: true,
    revised: true,
  });

  const toggle = (key: keyof typeof sections) =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const EmptyState = ({ text }: { text: string }) => (
    <div style={{ padding: '16px 14px', textAlign: 'center' }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#252525' }}>{text}</span>
    </div>
  );

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
            background: '#3a3a3a',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#6e6e6e',
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
            <Sparkles size={9} style={{ color: '#6e6e6e' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6e6e6e' }}>
              Analysis Complete
            </span>
          </div>
        )}
      </div>

      {/* Claims Panel */}
      <div style={{ flexShrink: 0 }}>
        <SectionHeader
          title="Claims"
          icon={<CheckCircle size={12} />}
          count={result?.trust.claims.length}
          expanded={sections.claims}
          onToggle={() => toggle('claims')}
        />
        {sections.claims && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {isRunning ? (
              <SkeletonLoader lines={5} />
            ) : result?.trust.claims.length ? (
              result.trust.claims.map(claim => <ClaimCard key={claim.id} claim={claim} />)
            ) : (
              <EmptyState text="// no claims extracted" />
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#1a1a1a', flexShrink: 0 }} />

      {/* Evidence Panel */}
      <div style={{ flexShrink: 0 }}>
        <SectionHeader
          title="Evidence"
          icon={<ExternalLink size={12} />}
          count={result?.trust.evidence.length}
          expanded={sections.evidence}
          onToggle={() => toggle('evidence')}
        />
        {sections.evidence && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {isRunning ? (
              <SkeletonLoader lines={4} />
            ) : result?.trust.evidence.length ? (
              result.trust.evidence.map(ev => <EvidenceCard key={ev.id} evidence={ev} />)
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
          count={result?.trust.criticFeed.length}
          expanded={sections.critic}
          onToggle={() => toggle('critic')}
        />
        {sections.critic && (
          <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {isRunning ? (
              <SkeletonLoader lines={6} />
            ) : result?.trust.criticFeed.length ? (
              result.trust.criticFeed.map(msg => <CriticMsg key={msg.id} message={msg} />)
            ) : (
              <EmptyState text="// critic exchange pending" />
            )}
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: '#1a1a1a', flexShrink: 0 }} />

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
            {isRunning ? (
              <SkeletonLoader lines={7} />
            ) : result?.trust.revisedOutput ? (
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
                  {result.trust.revisedOutput}
                </pre>
              </div>
            ) : (
              <EmptyState text="// revised output pending" />
            )}
          </div>
        )}
      </div>

      <div style={{ height: '80px', flexShrink: 0 }} />
    </div>
  );
}
