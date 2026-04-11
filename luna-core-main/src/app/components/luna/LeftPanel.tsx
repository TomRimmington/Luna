import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, DollarSign, AlertTriangle } from 'lucide-react';
import type { Model, RunResult } from './types';
import { MODELS } from './mockData';

interface LeftPanelProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
  result: RunResult | null;
  isRunning: boolean;
}

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
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6e6e6e', letterSpacing: '0.07em' }}>
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

export function LeftPanel({ selectedModel, onModelChange, result, isRunning }: LeftPanelProps) {
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

  const lines = result?.rawOutput ? result.rawOutput.split('\n') : [];

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
              background: '#5a5a5a',
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
            Model Output
          </span>
        </div>

        {/* Latency + Cost badges */}
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
              <Zap size={9} style={{ color: '#7a7a7a' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#8a8a8a' }}>
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
              <DollarSign size={9} style={{ color: '#7a7a7a' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#8a8a8a' }}>
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
            {/* Green circle removed */}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc' }}>
              {selectedModel.name}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#5a5a5a' }}>
              {selectedModel.provider}
            </span>
            <ChevronDown size={11} style={{ color: '#5a5a5a', marginLeft: '2px' }} />
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
                    {/* Green circle removed */}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc' }}>
                      {model.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6e6e6e' }}>
                      {model.latency}ms
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#4a4a4a' }}>
                      ${model.costPer1k}/1k
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
        {isRunning && (
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
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#2e2e2e' }}>
              {'// awaiting input'}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#252525', textAlign: 'center', lineHeight: 1.7 }}>
              Submit a prompt to generate model output.<br />
              LUNA will analyze and verify the response.
            </div>
          </div>
        )}

        {!isRunning && lines.length > 0 && (
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
                    color: '#333333',
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
                  {line || '\u00A0'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: Hallucination Risk */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid #2a2a2a',
          flexShrink: 0,
        }}
      >
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
            <AlertTriangle size={11} style={{ color: '#2e2e2e' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#2e2e2e', letterSpacing: '0.07em' }}>
              HALLUCINATION RISK — awaiting analysis
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
