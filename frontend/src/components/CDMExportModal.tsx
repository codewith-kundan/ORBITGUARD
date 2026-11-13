import React, { useState, useEffect, useCallback } from 'react';
import { Conjunction, CDMPreviewResponse, WebhookDispatchResponse } from '../types';
import { api } from '../services/api';
import {
  X,
  FileText,
  Send,
  Copy,
  Download,
  Check,
  Code2,
  ShieldCheck,
  Server,
  Lock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { formatUtcDateTime } from '../utils/utcTime';

interface CDMExportModalProps {
  conjunction: Conjunction;
  isOpen?: boolean;
  onClose: () => void;
}

export const CDMExportModal: React.FC<CDMExportModalProps> = ({
  conjunction,
  isOpen = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'cdm' | 'dispatch'>('cdm');
  const [cdmFormat, setCdmFormat] = useState<'kvn' | 'xml'>('kvn');
  const [cdmData, setCdmData] = useState<CDMPreviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Operator alert webhook form state (no hardcoded external URL)
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [secretToken, setSecretToken] = useState<string>('');
  const [includeCdm, setIncludeCdm] = useState<boolean>(true);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<WebhookDispatchResponse | null>(null);

  const loadCDM = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCDM(conjunction.id);
      setCdmData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate CCSDS 508.0-B-1 Conjunction Data Message.');
    } finally {
      setLoading(false);
    }
  }, [conjunction.id]);

  useEffect(() => {
    if (isOpen) {
      loadCDM();
    }
  }, [isOpen, loadCDM]);

  const currentContent = cdmData
    ? cdmFormat === 'kvn'
      ? cdmData.kvn_content
      : cdmData.xml_content
    : '';

  const handleCopy = async () => {
    if (!currentContent) return;
    try {
      setError(null);
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard write unavailable — select and copy text from the viewer below.');
    }
  };

  const handleDownload = () => {
    if (!cdmData || !currentContent) return;
    const ext = cdmFormat === 'kvn' ? 'cdm' : 'xml';
    const mime = cdmFormat === 'kvn' ? 'text/plain;charset=utf-8' : 'application/xml;charset=utf-8';
    const blob = new Blob([currentContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cdmData.message_id || `conjunction_${conjunction.id}`}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    try {
      setDispatching(true);
      setError(null);
      const res = await api.dispatchWebhook({
        conjunction_id: conjunction.id,
        webhook_url: webhookUrl.trim(),
        secret_token: secretToken || undefined,
        include_cdm_attachment: includeCdm,
        custom_notes: customNotes || undefined,
      });
      setDispatchResult(res);
    } catch (err: any) {
      setDispatchResult({
        success: false,
        status_code: 0,
        dispatched_at: new Date().toISOString(),
        destination_url: webhookUrl.trim(),
        message: err?.message || 'Webhook dispatch failed.',
        latency_ms: 0,
      });
    } finally {
      setDispatching(false);
    }
  };

  const formatPcPct = (pcPct?: number | null): string => {
    if (pcPct === null || pcPct === undefined || Number.isNaN(pcPct)) return 'Unavailable';
    if (pcPct === 0) return '0.0000%';
    if (pcPct < 0.0001) return `${pcPct.toExponential(2)}%`;
    return `${pcPct.toFixed(4)}%`;
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="cdm-export-title"
      maxWidthClass="max-w-5xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-space-800 bg-space-950 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/35 text-sky-400 shrink-0">
            <FileText className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="cdm-export-title" className="text-base sm:text-lg font-semibold text-slate-100">
                CCSDS Conjunction Data Message (CDM) & Dispatch
              </h2>
              <span className="px-2 py-0.5 rounded bg-space-900 border border-space-700 text-[11px] font-mono text-sky-300">
                CCSDS 508.0-B-1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {conjunction.object_a?.name || `NORAD #${conjunction.object_a_id}`} vs{' '}
              {conjunction.object_b?.name || `NORAD #${conjunction.object_b_id}`} • Event #{conjunction.id}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close CDM export dialog"
          className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Bar & Encounter Telemetry Summary */}
      <div className="bg-space-950/70 border-b border-space-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="CDM export modes" className="flex items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cdm'}
            onClick={() => setActiveTab('cdm')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'cdm'
                ? 'bg-sky-500 text-space-950 font-semibold'
                : 'bg-space-900 border border-space-800 text-slate-300 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            CDM Message Preview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dispatch'}
            onClick={() => setActiveTab('dispatch')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'dispatch'
                ? 'bg-sky-500 text-space-950 font-semibold'
                : 'bg-space-900 border border-space-800 text-slate-300 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            Webhook Dispatcher
          </button>
        </div>

        {cdmData && (
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-300">
            <span>
              TCA <strong className="text-slate-100">{formatUtcDateTime(cdmData.tca)}</strong>
            </span>
            <span>
              Miss{' '}
              <strong className="text-sky-300">
                {(cdmData.miss_distance_m / 1000).toFixed(2)} km
              </strong>
            </span>
            <span>
              Pc <strong className="text-red-300">{formatPcPct(cdmData.collision_probability)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="p-5 overflow-y-auto flex-1 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/35 text-red-200 text-xs flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadCDM}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-100 font-medium shrink-0"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {activeTab === 'cdm' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div
                role="group"
                aria-label="CDM serialization format"
                className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-800 text-xs"
              >
                <button
                  type="button"
                  onClick={() => setCdmFormat('kvn')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    cdmFormat === 'kvn'
                      ? 'bg-sky-500 text-space-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  KVN (.cdm Plain Text)
                </button>
                <button
                  type="button"
                  onClick={() => setCdmFormat('xml')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    cdmFormat === 'xml'
                      ? 'bg-sky-500 text-space-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  NDM/XML (.xml)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!currentContent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-xs font-medium text-slate-100 transition-colors disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                      Copy CDM
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!currentContent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-space-950 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Download {cdmFormat.toUpperCase()}
                </button>
              </div>
            </div>

            <div className="bg-space-950 rounded-lg border border-space-800 overflow-hidden">
              <div className="border-b border-space-800 px-3.5 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-slate-200 font-medium">
                  {cdmData?.message_id || `cdm_${conjunction.id}`}.
                  {cdmFormat === 'kvn' ? 'cdm' : 'xml'}
                </span>
                <span>Standard CCSDS 508.0-B-1 • ISO 26900</span>
              </div>

              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" aria-hidden="true" />
                  <span>Generating CCSDS 508.0-B-1 CDM...</span>
                </div>
              ) : (
                <pre className="p-4 text-xs font-mono text-sky-300/95 overflow-x-auto leading-relaxed max-h-[380px] select-all">
                  {currentContent}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleDispatch} className="space-y-4">
            <div className="bg-space-950 p-4 rounded-lg border border-space-800 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-space-800 pb-2">
                <span className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  Operator Alert Webhook Endpoint
                </span>
                <span className="text-[11px] font-mono text-slate-400">HTTPS JSON POST</span>
              </div>

              <div>
                <label
                  htmlFor="cdm-webhook-url"
                  className="block text-[11px] font-medium text-slate-300 mb-1"
                >
                  Destination Webhook URL
                </label>
                <input
                  id="cdm-webhook-url"
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://ops-webhook.example.org/conjunctions"
                  className="w-full rounded-lg bg-space-900 border border-space-700 px-3 py-2 text-slate-100 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cdm-webhook-secret"
                    className="block text-[11px] font-medium text-slate-300 mb-1"
                  >
                    Bearer Authorization / Secret Token (Optional)
                  </label>
                  <div className="relative">
                    <Lock
                      className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5"
                      aria-hidden="true"
                    />
                    <input
                      id="cdm-webhook-secret"
                      type="password"
                      value={secretToken}
                      onChange={(e) => setSecretToken(e.target.value)}
                      placeholder="Bearer token or signing secret"
                      className="w-full rounded-lg bg-space-900 border border-space-700 px-3 py-2 pl-8 text-slate-100 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-end pb-1.5">
                  <label
                    htmlFor="cdm-include-body"
                    className="inline-flex items-center gap-2 cursor-pointer text-slate-200"
                  >
                    <input
                      id="cdm-include-body"
                      type="checkbox"
                      checked={includeCdm}
                      onChange={(e) => setIncludeCdm(e.target.checked)}
                      className="custom-checkbox"
                    />
                    <span>Attach full CCSDS CDM KVN text in payload</span>
                  </label>
                </div>
              </div>

              <div>
                <label
                  htmlFor="cdm-operator-notes"
                  className="block text-[11px] font-medium text-slate-300 mb-1"
                >
                  Operator Directives / Notes (Optional)
                </label>
                <textarea
                  id="cdm-operator-notes"
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Optional operational context included in alert body..."
                  className="w-full rounded-lg bg-space-900 border border-space-700 px-3 py-2 text-slate-100 font-mono text-xs"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={dispatching || !webhookUrl.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  {dispatching ? 'Dispatching...' : 'Dispatch Alert Payload'}
                </button>
              </div>
            </div>

            {dispatchResult && (
              <div
                className={`p-4 rounded-lg border text-xs space-y-2 font-mono ${
                  dispatchResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                    : 'bg-red-500/10 border-red-500/35 text-red-200'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    {dispatchResult.success ? (
                      <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <X className="w-4 h-4 text-red-400" aria-hidden="true" />
                    )}
                    {dispatchResult.message}
                  </span>
                  <span className="tabular-nums">
                    HTTP {dispatchResult.status_code || 'ERR'} • {dispatchResult.latency_ms} ms
                  </span>
                </div>
                <div className="text-[11px] space-y-1">
                  <div>Destination: {dispatchResult.destination_url}</div>
                  <div>Dispatched: {formatUtcDateTime(dispatchResult.dispatched_at)}</div>
                  {dispatchResult.response_body && (
                    <pre className="mt-2 p-2.5 bg-space-950 rounded border border-space-800 overflow-x-auto text-[11px] text-slate-300">
                      {dispatchResult.response_body}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-space-800 px-5 py-3 bg-space-950 flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
          CCSDS 508.0-B-1 / ISO 26900 Conjunction Data Message Format
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-slate-100 text-xs font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </ModalDialog>
  );
};
