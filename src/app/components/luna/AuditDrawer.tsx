import { X, Shield } from 'lucide-react';
import type { AuditFinding } from './types';

interface AuditDrawerProps {
  open: boolean;
  onClose: () => void;
  findings: AuditFinding[];
}

const assessmentConfig: Record<string, { color: string; bg: string; border: string }> = {
  fair: { color: '#3fb950', bg: 'rgba(35, 134, 54, 0.08)', border: 'rgba(35, 134, 54, 0.2)' },
  aggressive: { color: '#f85149', bg: 'rgba(218, 54, 51, 0.08)', border: 'rgba(218, 54, 51, 0.2)' },
  lenient: { color: '#d29922', bg: 'rgba(187, 128, 9, 0.08)', border: 'rgba(187, 128, 9, 0.2)' },
  missed_source: { color: '#d29922', bg: 'rgba(187, 128, 9, 0.08)', border: 'rgba(187, 128, 9, 0.2)' },
};

const severityDot: Record<string, string> = {
  info: '#6e6e6e',
  warning: '#d29922',
  critical: '#f85149',
};

const targetLabel: Record<string, string> = {
  critic: 'CRITIC',
  judge: 'JUDGE',
  verifier: 'VERIFIER',
};

const targetColor: Record<string, string> = {
  critic: '#d29922',
  judge: '#cccccc',
  verifier: '#8a8a8a',
};

export function AuditDrawer({ open, onClose, findings }: AuditDrawerProps) {
  const criticFinding = findings.find(f => f.target === 'critic');
  const verifierFinding = findings.find(f => f.target === 'verifier');
  const judgeFinding = findings.find(f => f.target === 'judge');

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: '35px',
        width: '340px',
        height: 'calc(100vh - 35px)',
        background: '#141414',
        borderLeft: '1px solid #2a2a2a',
        zIndex: 100,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Shield size={12} style={{ color: '#a371f7' }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#a371f7',
              letterSpacing: '0.1em',
            }}
          >
            ACCOUNTABILITY AUDIT
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#6e6e6e',
            display: 'flex',
            alignItems: 'center',
            padding: '4px',
            borderRadius: '3px',
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#cccccc')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#6e6e6e')}
        >
          <X size={13} />
        </button>
      </div>

      {/* Findings */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#2a2a2a transparent',
        }}
      >
        {findings.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#333' }}>
              {'// no audit data available'}
            </span>
          </div>
        )}

        {findings.map(finding => {
          const acfg = assessmentConfig[finding.assessment] || assessmentConfig.fair;
          return (
            <div
              key={finding.id}
              style={{
                background: '#111111',
                border: '1px solid #222',
                borderRadius: '5px',
                padding: '10px 11px',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      background: `${targetColor[finding.target]}15`,
                      border: `1px solid ${targetColor[finding.target]}30`,
                      borderRadius: '3px',
                      padding: '1px 6px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px',
                        color: targetColor[finding.target],
                        letterSpacing: '0.08em',
                      }}
                    >
                      {targetLabel[finding.target]}
                    </span>
                  </div>
                  <div
                    style={{
                      background: acfg.bg,
                      border: `1px solid ${acfg.border}`,
                      borderRadius: '3px',
                      padding: '1px 6px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px',
                        color: acfg.color,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {finding.assessment.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: severityDot[finding.severity] || '#6e6e6e',
                  }}
                />
              </div>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: '#6e6e6e',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {finding.detail}
              </p>
            </div>
          );
        })}

        {/* Summary */}
        {findings.length > 0 && (
          <div
            style={{
              marginTop: '8px',
              background: 'rgba(163, 113, 247, 0.04)',
              border: '1px solid rgba(163, 113, 247, 0.12)',
              borderRadius: '5px',
              padding: '10px 11px',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  color: '#a371f7',
                  letterSpacing: '0.1em',
                }}
              >
                ORCHESTRATOR HEALTH
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <HealthRow label="Critic" finding={criticFinding} />
              <HealthRow label="Verifier" finding={verifierFinding} />
              <HealthRow label="Judge" finding={judgeFinding} />
            </div>
            <div
              style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(163, 113, 247, 0.1)',
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6e6e6e' }}>
                Overall: {findings.some(f => f.severity === 'critical') ? 'Intervention recommended' : 'No intervention required'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HealthRow({ label, finding }: { label: string; finding?: AuditFinding }) {
  if (!finding) return null;
  const icon = finding.assessment === 'fair' ? '●' : '▲';
  const color = finding.assessment === 'fair' ? '#3fb950' : '#d29922';
  const text = finding.assessment === 'fair'
    ? 'Fair'
    : finding.assessment === 'missed_source'
      ? `Missed ${finding.severity === 'warning' ? '1' : ''} source`
      : finding.assessment.charAt(0).toUpperCase() + finding.assessment.slice(1);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#5a5a5a', width: '60px' }}>
        {label}:
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color }}>
        {icon} {text}
      </span>
    </div>
  );
}
