import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Send, 
  Download, 
  Copy, 
  Check, 
  ShieldCheck, 
  Code2, 
  Server,
  Lock,
  Loader2
} from 'lucide-react';
import { Conjunction, CDMPreviewResponse, WebhookDispatchResponse } from '../types';
import { api } from '../services/api';

interface CDMExportModalProps {
  conjunction: Conjunction;
  onClose: () => void;
}

export const CDMExportModal: React.FC<CDMExportModalProps> = ({
  conjunction,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'cdm' | 'dispatch'>('cdm');
  const [cdmFormat, setCdmFormat] = useState<'kvn' | 'xml'>('kvn');
  const [cdmData, setCdmData] = useState<CDMPreviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Webhook Dispatch State
  const [webhookUrl, setWebhookUrl] = useState<string>('https://httpbin.org/post');
  const [secretToken, setSecretToken] = useState<string>('');
  const [includeCdm, setIncludeCdm] = useState<boolean>(true);
  const [customNotes, setCustomNotes] = useState<string>('Urgent Conjunction Assessment — Operators please review CAM burn options.');
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<WebhookDispatchResponse | null>(null);

  useEffect(() => {
    const loadCDM = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getCDM(conjunction.id);
        setCdmData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to generate CCSDS CDM message');
      } finally {
        setLoading(false);
      }
    };
    loadCDM();
  }, [conjunction.id]);

  const handleCopy = () => {
    if (!cdmData) return;
    const text = cdmFormat === 'kvn' ? cdmData.kvn_content : cdmData.xml_content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!cdmData) return;
    const text = cdmFormat === 'kvn' ? cdmData.kvn_content : cdmData.xml_content;
    const ext = cdmFormat === 'kvn' ? 'cdm' : 'xml';
    const mime = cdmFormat === 'kvn' ? 'text/plain' : 'application/xml';
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORBITGUARD_${cdmData.message_id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDispatch = async () => {
    if (!webhookUrl) return;
    try {
      setDispatching(true);
      setDispatchResult(null);
      const res = await api.dispatchWebhook({
        conjunction_id: conjunction.id,
        webhook_url: webhookUrl,
        secret_token: secretToken || undefined,
        include_cdm_attachment: includeCdm,
        custom_notes: customNotes || undefined
      });
      setDispatchResult(res);
    } catch (err: any) {
      setDispatchResult({
        success: false,
        status_code: undefined,
        response_body: err.message,
        dispatched_at: new Date().toISOString(),
        destination_url: webhookUrl,
        message: err.message || 'Dispatch error',
        latency_ms: 0
      });
    } finally {
      setDispatching(false);
    }
  };

  const currentContent = cdmData ? (cdmFormat === 'kvn' ? cdmData.kvn_content : cdmData.xml_content) : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono text-slate-200">
      <div className="bg-space-900 border border-cyan-500/50 rounded-2xl max-w-5xl w-full max-h-[94vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-space-800 px-4 sm:px-6 py-3.5 bg-space-950/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  CCSDS CONJUNCTION DATA MESSAGE (CDM) & DISPATCHER
                </h3>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
                  CCSDS 508.0-B-1 BLUE BOOK
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Inter-Agency Space Debris Coordination (IADC) • Space Situational Awareness Exchange Standard
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-space-800 hover:bg-space-700 text-slate-400 hover:text-white rounded-lg border border-space-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher & KPIs */}
        <div className="bg-space-950/70 border-b border-space-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('cdm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'cdm' 
                  ? 'bg-cyan-500 text-space-950 shadow-md' 
                  : 'bg-space-900 text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              CCSDS CDM MESSAGE
            </button>
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'dispatch' 
                  ? 'bg-cyan-500 text-space-950 shadow-md' 
                  : 'bg-space-900 text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              OPERATOR WEBHOOK DISPATCHER
            </button>
          </div>

          {cdmData && (
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-400">TCA: <span className="text-white font-bold">{new Date(cdmData.tca).toISOString().replace('T', ' ').slice(0, 19)}Z</span></span>
              <span className="text-slate-400">Miss: <span className="text-cyan-neon font-bold">{(cdmData.miss_distance_m / 1000).toFixed(2)} km</span></span>
              <span className="text-slate-400">Pc: <span className="text-red-400 font-bold">{cdmData.collision_probability.toExponential(2)}</span></span>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(94vh-170px)] space-y-4">
          {error && (
            <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-neon text-xs">
              {error}
            </div>
          )}

          {activeTab === 'cdm' ? (
            /* TAB 1: CCSDS CDM Message Viewer */
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Format Toggle */}
                <div className="flex items-center gap-2 bg-space-950 p-1 rounded-lg border border-space-800 text-xs">
                  <button
                    onClick={() => setCdmFormat('kvn')}
                    className={`px-2.5 py-1 rounded font-bold transition ${
                      cdmFormat === 'kvn' 
                        ? 'bg-cyan-500 text-space-950' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    KVN (.cdm Plain Text)
                  </button>
                  <button
                    onClick={() => setCdmFormat('xml')}
                    className={`px-2.5 py-1 rounded font-bold transition ${
                      cdmFormat === 'xml' 
                        ? 'bg-cyan-500 text-space-950' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    XML Schema (ndmxml)
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-space-800 hover:bg-space-700 text-white rounded-lg text-xs font-bold transition border border-space-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    {copied ? 'COPIED TO CLIPBOARD' : 'COPY CDM'}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-lg text-xs font-bold transition shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    DOWNLOAD {cdmFormat.toUpperCase()} FILE
                  </button>
                </div>
              </div>

              {/* Monospace Syntax Code Block */}
              <div className="relative bg-black rounded-xl border border-space-800 overflow-hidden">
                <div className="bg-space-950/90 border-b border-space-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                    <span className="ml-2 text-slate-300 font-bold">
                      {cdmData?.message_id}.{cdmFormat === 'kvn' ? 'cdm' : 'xml'}
                    </span>
                  </div>
                  <span>Standard CCSDS 508.0-B-1</span>
                </div>

                {loading ? (
                  <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span>Generating CCSDS 508.0-B-1 Blue Book CDM...</span>
                  </div>
                ) : (
                  <pre className="p-4 text-xs font-mono text-cyan-300/90 overflow-x-auto leading-relaxed max-h-[420px] select-all">
                    {currentContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: Operator Alert Webhook Dispatcher */
            <div className="space-y-4">
              <div className="bg-space-950 p-4 rounded-xl border border-space-800 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-space-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-cyan-400" />
                    MISSION CONTROL / OPERATOR DISPATCH WEBHOOK
                  </span>
                  <span className="text-[10px] text-slate-400">AUTOMATED CONJUNCTION ALERTS</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Destination Webhook URL (Slack, PagerDuty, OpsGenie, or Custom REST API)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-ops-webhook.internal/conjunctions"
                    className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Bearer Authorization / Secret Token (Optional)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      <input
                        type="password"
                        value={secretToken}
                        onChange={(e) => setSecretToken(e.target.value)}
                        placeholder="Bearer token or secret key"
                        className="w-full bg-space-900 border border-space-700 rounded-lg p-2 pl-8 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeCdm}
                        onChange={(e) => setIncludeCdm(e.target.checked)}
                        className="rounded accent-cyan-500 w-4 h-4"
                      />
                      <span>Attach full CCSDS CDM KVN text in JSON body</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Custom Operator Flight Director Notes
                  </label>
                  <textarea
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full bg-space-900 border border-space-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDispatch}
                    disabled={dispatching || !webhookUrl}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-xl font-bold text-xs transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {dispatching ? 'DISPATCHING TO OPERATOR...' : 'DISPATCH CONJUNCTION ALERT NOW'}
                  </button>
                </div>
              </div>

              {/* Webhook Response Log HUD */}
              {dispatchResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 font-mono ${
                  dispatchResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/40 text-red-300'
                }`}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 font-bold">
                      {dispatchResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-red-400" />}
                      <span>DISPATCH STATUS: {dispatchResult.message}</span>
                    </div>
                    <span>HTTP {dispatchResult.status_code || 'ERR'} • {dispatchResult.latency_ms} ms</span>
                  </div>

                  <div className="text-[11px] opacity-90">
                    <div>Destination: {dispatchResult.destination_url}</div>
                    <div>Timestamp: {dispatchResult.dispatched_at}</div>
                    {dispatchResult.response_body && (
                      <div className="mt-2 p-2 bg-black/50 rounded border border-white/10 overflow-x-auto text-[10px] text-slate-300">
                        {dispatchResult.response_body}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-space-800 px-4 sm:px-6 py-2.5 bg-space-950/90 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>ISO 26900 / CCSDS 508.0-B-1 CONJUNCTION DATA MESSAGE COMPLIANCE</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-space-800 hover:bg-space-700 text-white rounded text-xs transition font-bold"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
