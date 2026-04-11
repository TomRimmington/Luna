import { useState, useEffect } from 'react';
import { TopBar } from './components/luna/TopBar';
import { LeftPanel } from './components/luna/LeftPanel';
import { RightPanel } from './components/luna/RightPanel';
import { PromptBar } from './components/luna/PromptBar';
import { MODELS, MOCK_RESULT } from './components/luna/mockData';
import type { Model, RunResult } from './components/luna/types';

export default function App() {
  const [selectedModel, setSelectedModel] = useState<Model>(MODELS[0]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = (_prompt: string) => {
    if (isRunning) return;
    setIsRunning(true);
    setResult(null);

    setTimeout(() => {
      setResult(MOCK_RESULT);
      setIsRunning(false);
    }, 2200);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Fix white overscroll background */
      html, body {
        margin: 0;
        padding: 0;
        background-color: #111111;
        height: 100%;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      * { box-sizing: border-box; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      ::-webkit-scrollbar-thumb:hover { background: #333333; }
      textarea::placeholder { color: #3a3a3a !important; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#111111',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
      }}
    >
      <TopBar />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Subtle grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(30, 30, 30, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 30, 30, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Left Panel — Model Output */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRight: '1px solid #1e1e1e',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
            paddingBottom: '108px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              padding: '3px 10px',
              background: 'rgba(11,11,11,0.95)',
              borderLeft: '1px solid #1e1e1e',
              borderBottom: '1px solid #1e1e1e',
              borderBottomLeftRadius: '4px',
              zIndex: 5,
              backdropFilter: 'blur(4px)',
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#2e2e2e', letterSpacing: '0.1em' }}>
              OUTPUT.TSX
            </span>
          </div>
          <LeftPanel
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            result={result}
            isRunning={isRunning}
          />
        </div>

        {/* Right Panel — Trust Engine */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
            paddingBottom: '108px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              padding: '3px 10px',
              background: 'rgba(11,11,11,0.95)',
              borderLeft: '1px solid #1e1e1e',
              borderBottom: '1px solid #1e1e1e',
              borderBottomLeftRadius: '4px',
              zIndex: 5,
              backdropFilter: 'blur(4px)',
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#2e2e2e', letterSpacing: '0.1em' }}>
              TRUST.TSX
            </span>
          </div>
          <RightPanel result={result} isRunning={isRunning} />
        </div>
      </div>

      {/* Floating Prompt Bar */}
      <PromptBar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onRun={handleRun}
        isRunning={isRunning}
      />
    </div>
  );
}
