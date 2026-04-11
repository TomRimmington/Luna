import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Zap, DollarSign, AlertTriangle } from 'lucide-react';
import type { Model, RunResult, Claim, ReasoningStep, PipelineStage } from './types';
import { MODELS } from './mockData';

interface LeftPanelProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
  result: RunResult | null;
  isRunning: boolean;
  streamedRaw?: string;
  streamedClaims?: Claim[];
  reasoningTrace?: ReasoningStep[];
  stage?: PipelineStage;
}

// ── Annotated Text ───────────────────────────────────────────────
function AnnotatedText({ text, claims }: { text: string; claims: Claim[] }) {
  const segments = useMemo(() => {
    const spanned = claims
      .filter(c => c.sourceSpan)
      .sort((a, b) => a.sourceSpan!.start - b.sourceSpan!.start);

    if (spanned.length === 0) return [{ text, claim: null }];

    const result: { text: string; claim: Claim | null }[] = [];
    let cursor = 0;

    for (const claim of spanned) {
      const { start, end } = claim.sourceSpan!;
      if (start < cursor) continue;
      if (start > cursor) {
        result.push({ text: text.slice(cursor, start), claim: null });
      }
      result.push({ text: text.slice(start, end), claim });
      cursor = end;
    }
    if (cursor < text.length) {
      result.push({ text: text.slice(cursor), claim: null });
    }
    return result;
  }, [text, claims]);

  const statusColor: Record<string, string> = {
    verified: '#3fb950',
    uncertain: '#d29922',
    contradicted: '#f85149',
  };

  return (
    <>
      {segments.map((seg, i) => {
        if (!seg.claim) return <span key={i}>{seg.text}</span>;
        const color = statusColor[seg.claim.status] || '#6e6e6e';
        return (
          <span
            key={i}
            style={{
              borderBottom: `2px solid ${color}`,
              cursor: 'pointer',
              transition: 'background 0.15s',
              borderRadius: '1px',
            }}
            title={`"${seg.claim.text}" — ${seg.claim.status} (${seg.claim.confidence}%)`}
            onMouseEnter={e => {
              (e.currentTarget as HTMLSpanElement).style.background = `${color}18`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLSpanElement).style.background = 'transparent';
            }}
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );
}

// ── Trust Score Arc ──────────────────────────────────────────────
function TrustScoreArc({ initial, final }: { initial: number; final: number }) {
  const [displayed, setDisplayed] = useState(initial);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (final <= initial) {
      setDisplayed(final);
      return;
    }
    setAnimating(true);
    const start = performance.now();
    const duration = 1200;

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(initial + (final - initial) * eased);
      setDisplayed(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setAnimating(false);
      }
    }
    requestAnimationFrame(step);
  }, [initial, final]);

  const delta = final - initial;
  const deltaColor = delta >= 0 ? '#3fb950' : '#f85149';
  const barColor = (val: number) =>
    val >= 80 ? '#3fb950' : val >= 50 ? '#d29922' : '#f85149';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid #222',
        borderRadius: '5px',
        padding: '8px 12px',
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: '#cccccc',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}
      >
        TRUST
      </span>

      {/* Initial bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
        <div style={{ flex: 1, height: '4px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${initial}%`, height: '100%', background: barColor(initial), borderRadius: '2px', opacity: 0.5 }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e', width: '28px', textAlign: 'right' }}>
          {initial}%
        </span>
      </div>

      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e' }}>→</span>

      {/* Final bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
        <div style={{ flex: 1, height: '4px', background: '#1e1e1e', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${displayed}%`,
              height: '100%',
              background: barColor(displayed),
              borderRadius: '2px',
              transition: animating ? 'none' : 'width 0.3s',
            }}
          />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: barColor(displayed), fontWeight: 600, width: '28px', textAlign: 'right' }}>
          {displayed}%
        </span>
      </div>

      {/* Delta pill */}
      <div
        style={{
          background: `${deltaColor}15`,
          border: `1px solid ${deltaColor}30`,
          borderRadius: '3px',
          padding: '1px 5px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: deltaColor, fontWeight: 600 }}>
          {delta >= 0 ? '▲' : '▼'}{delta >= 0 ? '+' : '−'}{Math.abs(delta)}
        </span>
      </div>
    </div>
  );
}

// ── Reasoning Trace Drawer ──────────────────────────────────────
function ReasoningTraceDrawer({ trace }: { trace: ReasoningStep[] }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const genTrace = trace.filter(t => t.agent === 'generator');
  if (genTrace.length === 0) return null;

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const statusDot = (status: string) => {
    if (status === 'complete') return '#8a8a8a';
    if (status === 'active') return '#d29922';
    return '#f85149';
  };

  return (
    <div style={{ borderBottom: '1px solid #222', flexShrink: 0 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '6px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e' }}>
          {expanded ? '▾' : '▸'}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#b0b0b0', letterSpacing: '0.1em' }}>
          REASONING TRACE
        </span>
        <span
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #2e2e2e',
            borderRadius: '8px',
            padding: '0 5px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: '#b0b0b0',
          }}
        >
          {genTrace.length}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {genTrace.map(step => (
            <div
              key={step.id}
              style={{ animation: 'fadeIn 0.3s ease', paddingLeft: '8px', borderLeft: '2px solid #222' }}
            >
              <button
                onClick={() => toggleStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '3px 0',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: statusDot(step.status),
                    flexShrink: 0,
                    animation: step.status === 'active' ? 'pulse 1s ease-in-out infinite' : 'none',
                  }}
                />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#cccccc' }}>
                  {step.action}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#7a7a7a', marginLeft: 'auto' }}>
                  {step.timestamp}
                </span>
              </button>
              {expandedSteps.has(step.id) && (
                <div style={{ padding: '4px 0 4px 11px' }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#b0b0b0', lineHeight: 1.6, margin: 0 }}>
                    {step.detail}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hallucination Badge ─────────────────────────────────────────
function HallucinationBadge({ risk }: { risk: number }) {
  const color =
    risk < 20
      ? { bg: 'rgba(35, 134, 54, 0.12)', border: '#2a5a2a', text: '#3fb950', label: 'Low Risk' }
      : risk < 50
      ? { bg: 'rgba(187, 128, 9, 0.12)', border: '#5a4a00', text: '#d29922', label: 'Moderate Risk' }
      : { bg: 'rgba(218, 54, 51, 0.12)', border: '#5a2020', text: '#f85149', label: 'High Risk' };

  return (
    <div
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: '5px',
        padding: '7px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <AlertTriangle size={12} style={{ color: color.text }} />
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#cccccc', letterSpacing: '0.07em' }}>
        HALLUCINATION RISK
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: color.text, fontWeight: 600 }}>
        {risk}%
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: color.text, opacity: 0.7 }}>
        {color.label}
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export function LeftPanel({
  selectedModel,
  onModelChange,
  result,
  isRunning,
  streamedRaw = '',
  streamedClaims = [],
  reasoningTrace = [],
  stage = 'idle',
}: LeftPanelProps) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isRunning && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streamedRaw, isRunning]);

  const isStreaming = isRunning && stage === 'generating' && streamedRaw.length > 0;
  const displayText = isStreaming ? streamedRaw : (result?.rawOutput || streamedRaw || '');
  const lines = displayText ? displayText.split('\n') : [];

  const activeClaims = result?.trust.claims ?? (streamedClaims.length > 0 ? streamedClaims : []);
  const hasClaims = activeClaims.length > 0 && activeClaims.some(c => c.sourceSpan);

  const trustData = result?.trust;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#181818' }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: isRunning ? '#d29922' : result ? '#8a8a8a' : '#5a5a5a',
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
            Model Output
          </span>
        </div>

        {result && (
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #2e2e2e',
                borderRadius: '4px',
                padding: '2px 7px',
              }}
            >
              <Zap size={9} style={{ color: '#b0b0b0' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#cccccc' }}>
                {result.latency}ms
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #2e2e2e',
                borderRadius: '4px',
                padding: '2px 7px',
              }}
            >
              <DollarSign size={9} style={{ color: '#b0b0b0' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#cccccc' }}>
                ${result.cost.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Model Selector */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid #2a2a2a',
          flexShrink: 0,
        }}
      >
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: '#111111',
              border: '1px solid #2e2e2e',
              borderRadius: '5px',
              padding: '5px 10px',
              cursor: 'pointer',
              transition: 'border-color 0.12s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#4a4a4a')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#2e2e2e')}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc' }}>
              {selectedModel.name}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e' }}>
              {selectedModel.provider}
            </span>
            <ChevronDown size={11} style={{ color: '#9e9e9e', marginLeft: '2px' }} />
          </button>

          {modelDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                background: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: '6px',
                overflow: 'hidden',
                zIndex: 100,
                minWidth: '240px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              {MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model);
                    setModelDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    background: model.id === selectedModel.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (model.id !== selectedModel.id)
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (model.id !== selectedModel.id)
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc' }}>
                      {model.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#b0b0b0' }}>
                      {model.latency}ms
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e' }}>
                      ${model.costPer1k}/1k
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reasoning Trace Drawer */}
      {reasoningTrace.length > 0 && <ReasoningTraceDrawer trace={reasoningTrace} />}

      {/* Output Area */}
      <div
        ref={outputRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 0',
          scrollbarWidth: 'thin',
          scrollbarColor: '#2e2e2e transparent',
        }}
      >
        {/* Skeleton while running with no content yet */}
        {isRunning && lines.length === 0 && (
          <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                style={{
                  height: '13px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '2px',
                  width: `${55 + (i * 17 % 45)}%`,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isRunning && lines.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '10px',
              padding: '40px 24px',
            }}
          >
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#7a7a7a' }}>
              {'// awaiting input'}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6e6e6e', textAlign: 'center', lineHeight: 1.7 }}>
              Submit a prompt to generate model output.<br />
              LUNA will analyze and verify the response.
            </div>
          </div>
        )}

        {/* Line-numbered output with inline annotations */}
        {lines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '0 14px',
                  minHeight: '20px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#5a5a5a',
                    width: '32px',
                    flexShrink: 0,
                    paddingRight: '14px',
                    userSelect: 'none',
                    textAlign: 'right',
                    lineHeight: '20px',
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12.5px',
                    color: '#cccccc',
                    lineHeight: '20px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    flex: 1,
                  }}
                >
                  {hasClaims && !isStreaming ? (
                    <AnnotatedLineSegment
                      lineText={line || '\u00A0'}
                      lineStartOffset={getLineStartOffset(displayText, i)}
                      claims={activeClaims}
                    />
                  ) : (
                    line || '\u00A0'
                  )}
                  {isStreaming && i === lines.length - 1 && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '2px',
                        height: '14px',
                        background: '#cccccc',
                        animation: 'blink 0.8s ease-in-out infinite',
                        verticalAlign: 'text-bottom',
                        marginLeft: '1px',
                      }}
                    />
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: Trust Score Arc + Hallucination Risk */}
      <div
        style={{
          padding: '10px 14px',
          paddingBottom: '120px',
          borderTop: '1px solid #2a2a2a',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {trustData && trustData.trustScoreInitial > 0 && (
          <TrustScoreArc
            initial={trustData.trustScoreInitial}
            final={trustData.trustScoreFinal}
          />
        )}
        {result ? (
          <HallucinationBadge risk={result.trust.hallucinationRisk} />
        ) : (
          <div
            style={{
              background: 'transparent',
              border: '1px solid #222',
              borderRadius: '5px',
              padding: '7px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <AlertTriangle size={11} style={{ color: '#7a7a7a' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#7a7a7a', letterSpacing: '0.07em' }}>
              HALLUCINATION RISK — awaiting analysis
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getLineStartOffset(fullText: string, lineIndex: number): number {
  let offset = 0;
  const lines = fullText.split('\n');
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }
  return offset;
}

function AnnotatedLineSegment({
  lineText,
  lineStartOffset,
  claims,
}: {
  lineText: string;
  lineStartOffset: number;
  claims: Claim[];
}) {
  const lineEnd = lineStartOffset + lineText.length;

  const overlapping = claims
    .filter(c => c.sourceSpan && c.sourceSpan.start < lineEnd && c.sourceSpan.end > lineStartOffset)
    .sort((a, b) => a.sourceSpan!.start - b.sourceSpan!.start);

  if (overlapping.length === 0) return <>{lineText}</>;

  const statusColor: Record<string, string> = {
    verified: '#3fb950',
    uncertain: '#d29922',
    contradicted: '#f85149',
  };

  const segments: React.ReactNode[] = [];
  let cursor = lineStartOffset;

  for (const claim of overlapping) {
    const spanStart = Math.max(claim.sourceSpan!.start, lineStartOffset);
    const spanEnd = Math.min(claim.sourceSpan!.end, lineEnd);

    if (spanStart > cursor) {
      segments.push(lineText.slice(cursor - lineStartOffset, spanStart - lineStartOffset));
    }

    const color = statusColor[claim.status] || '#6e6e6e';
    segments.push(
      <span
        key={claim.id}
        style={{
          borderBottom: `2px solid ${color}`,
          cursor: 'pointer',
          borderRadius: '1px',
          transition: 'background 0.15s',
        }}
        title={`"${claim.text}" — ${claim.status} (${claim.confidence}%)`}
        onMouseEnter={e => {
          (e.currentTarget as HTMLSpanElement).style.background = `${color}18`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLSpanElement).style.background = 'transparent';
        }}
      >
        {lineText.slice(spanStart - lineStartOffset, spanEnd - lineStartOffset)}
      </span>
    );

    cursor = spanEnd;
  }

  if (cursor < lineEnd) {
    segments.push(lineText.slice(cursor - lineStartOffset));
  }

  return <>{segments}</>;
}
