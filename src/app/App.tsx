import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { TopBar } from './components/luna/TopBar';
import { LeftPanel } from './components/luna/LeftPanel';
import { RightPanel } from './components/luna/RightPanel';
import { PromptBar } from './components/luna/PromptBar';
import { AuditDrawer } from './components/luna/AuditDrawer';
import { MODELS, MOCK_RESULT } from './components/luna/mockData';
import type {
  Model,
  ModelId,
  RunResult,
  PipelineStage,
  Claim,
  Evidence,
  CriticMessage,
  ReasoningStep,
  CompressionMetrics,
  AuditFinding,
} from './components/luna/types';

const COMPLEMENTARY_MODEL: Record<ModelId, ModelId> = {
  'claude-sonnet-4-6': 'llama-3.3-70b-versatile',
  'claude-haiku-4-5-20251001': 'llama-3.3-70b-versatile',
  'llama-3.3-70b-versatile': 'claude-sonnet-4-6',
  'llama-3.1-8b-instant': 'claude-sonnet-4-6',
};

export default function App() {
  const [selectedModel, setSelectedModel] = useState<Model>(MODELS[0]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<PipelineStage>('idle');
  const [streamedRaw, setStreamedRaw] = useState('');
  const [streamedClaims, setStreamedClaims] = useState<Claim[]>([]);
  const [streamedEvidence, setStreamedEvidence] = useState<Evidence[]>([]);
  const [streamedCritic, setStreamedCritic] = useState<CriticMessage[]>([]);
  const [streamedRevised, setStreamedRevised] = useState('');
  const [reasoningTrace, setReasoningTrace] = useState<ReasoningStep[]>([]);
  const [compression, setCompression] = useState<CompressionMetrics | null>(null);
  const [audit, setAudit] = useState<AuditFinding[]>([]);
  const [showAuditor, setShowAuditor] = useState(false);

  const playbackRef = useRef(false);

  const resetStreamState = useCallback(() => {
    setResult(null);
    setError(null);
    setStage('generating');
    setStreamedRaw('');
    setStreamedClaims([]);
    setStreamedEvidence([]);
    setStreamedCritic([]);
    setStreamedRevised('');
    setReasoningTrace([]);
    setCompression(null);
    setAudit([]);
  }, []);

  const handleRun = useCallback(async (prompt: string) => {
    if (isRunning) return;

    setIsRunning(true);
    setIsDemoMode(false);
    resetStreamState();

    const startTime = Date.now();

    try {
      const modelA = selectedModel.id;
      const modelB = COMPLEMENTARY_MODEL[modelA];
      const response = await axios.post('http://localhost:8000/run', {
        prompt,
        model_a: modelA,
        model_b: modelB,
      }, { timeout: 90000 });

      const data = response.data;
      const measured = Date.now() - startTime;

      const rawOutput = data.rawOutputA || data.rawOutput || '';
      const trust = data.trust || {};

      const finalResult: RunResult = {
        rawOutput,
        trust: {
          claims: trust.claims ?? [],
          evidence: trust.evidence ?? [],
          criticFeed: trust.criticFeed ?? [],
          reasoningTrace: trust.reasoningTrace ?? [],
          revisedOutput: trust.revisedOutput ?? rawOutput,
          hallucinationRisk: trust.hallucinationRisk ?? 50,
          trustScoreInitial: trust.trustScoreInitial ?? 50,
          trustScoreFinal: trust.trustScoreFinal ?? 50,
          compression: trust.compression ?? undefined,
          audit: trust.audit ?? [],
        },
        latency: measured,
        cost: data.cost ?? 0,
      };

      setStreamedRaw(rawOutput);
      setStreamedClaims(finalResult.trust.claims);
      setStreamedEvidence(finalResult.trust.evidence);
      setStreamedCritic(finalResult.trust.criticFeed);
      setStreamedRevised(finalResult.trust.revisedOutput);
      setReasoningTrace(finalResult.trust.reasoningTrace);
      setCompression(finalResult.trust.compression ?? null);
      setAudit(finalResult.trust.audit ?? []);
      setResult(finalResult);
      setStage('complete');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Unknown error';
      console.error('[LUNA] Backend error:', msg, err);
      setError(`Backend error: ${msg}`);
      setStage('idle');
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, selectedModel, resetStreamState]);

  const loadMockInstant = useCallback(() => {
    setIsRunning(false);
    setIsDemoMode(true);
    setResult(MOCK_RESULT);
    setStage('complete');
    setStreamedRaw(MOCK_RESULT.rawOutput);
    setStreamedClaims(MOCK_RESULT.trust.claims);
    setStreamedEvidence(MOCK_RESULT.trust.evidence);
    setStreamedCritic(MOCK_RESULT.trust.criticFeed);
    setStreamedRevised(MOCK_RESULT.trust.revisedOutput);
    setReasoningTrace(MOCK_RESULT.trust.reasoningTrace);
    setCompression(MOCK_RESULT.trust.compression ?? null);
    setAudit(MOCK_RESULT.trust.audit ?? []);
  }, []);

  const playbackMock = useCallback(async () => {
    if (isRunning) return;
    playbackRef.current = true;
    setIsRunning(true);
    setIsDemoMode(true);
    resetStreamState();

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Stage 1: Generate
    setStage('generating');
    setReasoningTrace(prev => [...prev, MOCK_RESULT.trust.reasoningTrace[0]]);
    for (let i = 0; i < MOCK_RESULT.rawOutput.length; i += 3) {
      if (!playbackRef.current) return;
      setStreamedRaw(MOCK_RESULT.rawOutput.slice(0, i + 3));
      await delay(8);
    }
    setStreamedRaw(MOCK_RESULT.rawOutput);

    // Stage 2: Extract
    setStage('extracting');
    setReasoningTrace(prev => [...prev, MOCK_RESULT.trust.reasoningTrace[1]]);
    await delay(400);
    for (const claim of MOCK_RESULT.trust.claims) {
      if (!playbackRef.current) return;
      setStreamedClaims(prev => [...prev, claim]);
      await delay(200);
    }

    // Stage 3: Verify
    setStage('verifying');
    setReasoningTrace(prev => [...prev, MOCK_RESULT.trust.reasoningTrace[2]]);
    await delay(600);
    for (const ev of MOCK_RESULT.trust.evidence) {
      if (!playbackRef.current) return;
      setStreamedEvidence(prev => [...prev, ev]);
      await delay(300);
    }

    // Stage 4: Critique
    setStage('critiquing');
    setReasoningTrace(prev => [...prev, MOCK_RESULT.trust.reasoningTrace[3]]);
    await delay(300);
    for (const msg of MOCK_RESULT.trust.criticFeed.filter(m => m.role !== 'auditor')) {
      if (!playbackRef.current) return;
      setStreamedCritic(prev => [...prev, msg]);
      await delay(250);
    }

    // Stage 5: Judge
    setStage('judging');
    setReasoningTrace(prev => [...prev, MOCK_RESULT.trust.reasoningTrace[4]]);
    await delay(500);

    // Stage 6: Correct
    setStage('correcting');
    await delay(400);
    setStreamedRevised(MOCK_RESULT.trust.revisedOutput);

    // Stage 7: Compress
    setStage('compressing');
    setReasoningTrace(prev => [...prev, MOCK_RESULT.trust.reasoningTrace[5]]);
    await delay(300);
    setCompression(MOCK_RESULT.trust.compression ?? null);

    // Stage 8: Audit
    setStage('auditing');
    setReasoningTrace(prev => [...prev, MOCK_RESULT.trust.reasoningTrace[6]]);
    await delay(500);
    setAudit(MOCK_RESULT.trust.audit ?? []);
    const auditorMsg = MOCK_RESULT.trust.criticFeed.find(m => m.role === 'auditor');
    if (auditorMsg) {
      setStreamedCritic(prev => [...prev, auditorMsg]);
    }

    // Complete
    setStage('complete');
    setResult(MOCK_RESULT);
    setIsRunning(false);
    playbackRef.current = false;
  }, [isRunning, resetStreamState]);

  // Keyboard shortcuts: Ctrl+Shift+D (instant mock), Ctrl+Shift+S (animated playback)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        loadMockInstant();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        playbackMock();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [loadMockInstant, playbackMock]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
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
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
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
      <TopBar
        showAuditor={showAuditor}
        onToggleAudit={() => setShowAuditor(prev => !prev)}
        hasAuditData={(audit.length > 0) || (result?.trust.audit && result.trust.audit.length > 0)}
      />

      {error && (
        <div style={{
          padding: '8px 16px',
          background: '#2a1515',
          borderBottom: '1px solid #4a2020',
          color: '#ff6b6b',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ opacity: 0.7 }}>ERR</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#ff6b6b', cursor: 'pointer', fontSize: 14, padding: '0 4px',
            }}
          >×</button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel — Model Output */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRight: '1px solid #1e1e1e',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#181818',
          }}
        >
          <LeftPanel
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            result={result}
            isRunning={isRunning}
            streamedRaw={streamedRaw}
            streamedClaims={streamedClaims}
            reasoningTrace={reasoningTrace}
            stage={stage}
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
            background: '#181818',
          }}
        >
          <RightPanel
            result={result}
            isRunning={isRunning}
            stage={stage}
            streamedClaims={streamedClaims}
            streamedEvidence={streamedEvidence}
            streamedCritic={streamedCritic}
            streamedRevised={streamedRevised}
            reasoningTrace={reasoningTrace}
            compression={compression}
          />
        </div>
      </div>

      {/* Audit Drawer */}
      <AuditDrawer
        open={showAuditor}
        onClose={() => setShowAuditor(false)}
        findings={audit.length > 0 ? audit : result?.trust.audit ?? []}
      />

      {/* Floating Prompt Bar */}
      <PromptBar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onRun={handleRun}
        isRunning={isRunning}
        stage={stage}
      />
    </div>
  );
}
