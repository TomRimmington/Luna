import { useState, useRef, useEffect } from 'react';
import { Paperclip, ChevronDown, Play, Loader } from 'lucide-react';
import type { Model, PipelineStage } from './types';
import { MODELS } from './mockData';

interface PromptBarProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
  judgeModel: Model;
  onJudgeChange: (model: Model) => void;
  onRun: (prompt: string) => void;
  isRunning: boolean;
  stage?: PipelineStage;
}

const stageLabels: Partial<Record<PipelineStage, string>> = {
  generating: 'GENERATING...',
  extracting: 'EXTRACTING CLAIMS...',
  verifying: 'VERIFYING...',
  critiquing: 'CRITIQUING...',
  judging: 'JUDGING...',
  correcting: 'CORRECTING...',
  compressing: 'COMPRESSING...',
  auditing: 'AUDITING...',
};

export function PromptBar({ selectedModel, onModelChange, judgeModel, onJudgeChange, onRun, isRunning, stage = 'idle' }: PromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [focused, setFocused] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [judgeDropdownOpen, setJudgeDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const judgeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
      if (judgeDropdownRef.current && !judgeDropdownRef.current.contains(e.target as Node)) {
        setJudgeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  const handleRun = () => {
    if (!prompt.trim() || isRunning) return;
    onRun(prompt.trim());
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const canRun = prompt.trim().length > 0 && !isRunning;
  const stageLabel = stageLabels[stage];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 80px)',
        maxWidth: '860px',
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          border: `1px solid ${focused ? '#3a3a3a' : '#252525'}`,
          borderRadius: '10px',
          padding: '12px',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: focused
            ? '0 0 0 1px rgba(255,255,255,0.05), 0 12px 40px rgba(0,0,0,0.6)'
            : '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe what you want LUNA to analyze... (⌘+Enter to run)"
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            color: '#cccccc',
            lineHeight: '1.6',
            padding: '5px 4px',
            overflowY: 'hidden',
            minHeight: '32px',
            maxHeight: '200px',
            scrollbarWidth: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                background: 'transparent',
                border: '1px solid #272727',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'border-color 0.12s, background 0.12s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a3a';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#272727';
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
              title="Attach file"
            >
              <Paperclip size={12} style={{ color: '#9e9e9e' }} />
            </button>

            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#111111',
                  border: '1px solid #272727',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  height: '28px',
                  transition: 'border-color 0.12s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a3a')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#272727')}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#9e9e9e' }}>
                  {selectedModel.name}
                </span>
                <ChevronDown size={10} style={{ color: '#9e9e9e' }} />
              </button>

              {modelDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 6px)',
                    left: 0,
                    background: '#1e1e1e',
                    border: '1px solid #2e2e2e',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    zIndex: 200,
                    minWidth: '280px',
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
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
                        padding: '7px 10px',
                        background: model.id === selectedModel.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        if (model.id !== selectedModel.id)
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        if (model.id !== selectedModel.id)
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc' }}>
                        {model.name}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e' }}>
                        {model.provider}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Judge / Trust Engine model selector */}
            <div ref={judgeDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setJudgeDropdownOpen(!judgeDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#111111',
                  border: '1px solid #272727',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  height: '28px',
                  transition: 'border-color 0.12s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#3a3a3a')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = '#272727')}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#d29922', letterSpacing: '0.04em' }}>
                  JUDGE
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#9e9e9e' }}>
                  {judgeModel.name}
                </span>
                <ChevronDown size={10} style={{ color: '#9e9e9e' }} />
              </button>

              {judgeDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 6px)',
                    left: 0,
                    background: '#1e1e1e',
                    border: '1px solid #2e2e2e',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    zIndex: 200,
                    minWidth: '280px',
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
                  }}
                >
                  <div style={{ padding: '6px 10px', borderBottom: '1px solid #252525' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#d29922', letterSpacing: '0.06em' }}>
                      TRUST ENGINE MODEL
                    </span>
                  </div>
                  {MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onJudgeChange(model);
                        setJudgeDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '7px 10px',
                        background: model.id === judgeModel.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        if (model.id !== judgeModel.id)
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseLeave={e => {
                        if (model.id !== judgeModel.id)
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#cccccc' }}>
                        {model.name}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#9e9e9e' }}>
                        {model.provider}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={!canRun}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              background: canRun ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${canRun ? '#3a3a3a' : '#222'}`,
              borderRadius: '6px',
              cursor: canRun ? 'pointer' : 'not-allowed',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              if (canRun) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#4a4a4a';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = canRun
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.03)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = canRun ? '#3a3a3a' : '#222';
            }}
            title="Run (⌘+Enter)"
          >
            {isRunning ? (
              <Loader size={12} style={{ color: '#8a8a8a', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={12} style={{ color: canRun ? '#cccccc' : '#3a3a3a' }} />
            )}
          </button>
        </div>
      </div>

      {/* Hint / Stage Indicator */}
      <div style={{ textAlign: 'center', marginTop: '5px', height: '16px' }}>
        {isRunning && stageLabel ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <div
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#d29922',
                animation: 'pulse 1s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#d29922',
                letterSpacing: '0.05em',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {stageLabel}
            </span>
          </div>
        ) : (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6e6e6e' }}>
            ⌘+Enter to run · LUNA v0.4.1 · Trust Engine enabled
          </span>
        )}
      </div>
    </div>
  );
}
