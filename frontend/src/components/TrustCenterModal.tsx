import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { api } from '../services/api';
import { formatUtcDateTime } from '../utils/utcTime';

interface TrustCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LiveStatusSummary {
  total_objects?: number;
  validated_objects?: number;
  total_conjunctions?: number;
  last_sync_utc?: string | null;
}

export const TrustCenterModal: React.FC<TrustCenterModalProps> = ({ isOpen, onClose }) => {
  const [statusSummary, setStatusSummary] = useState<LiveStatusSummary | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api
      .getValidationStatus()
      .then((res) => {
        if (!cancelled) {
          setStatusError(null);
          setStatusSummary(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusError('Live backend telemetry unavailable.');
          setStatusSummary(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="trust-center-title"
      maxWidthClass="max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-space-800 bg-space-950 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="trust-center-title" className="text-base sm:text-lg font-semibold text-slate-100">
                Engineering Architecture & Provenance Standards
              </h2>
              <span className="px-2 py-0.5 rounded bg-space-900 border border-space-700 text-[11px] font-mono text-emerald-300">
                Verification Overview
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Physical propagation formulation, covariance limitations, and data provenance commitments.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close architecture and provenance dialog"
          className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs text-slate-300">
        {/* Live Pipeline Status Strip */}
        <div className="bg-space-950 border border-space-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
          {statusSummary ? (
            <>
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Backend Validation Pipeline Active</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-300 tabular-nums">
                <span>
                  Catalog: <strong>{statusSummary.total_objects ?? 'Unavailable'}</strong>
                </span>
                <span>
                  Validated Orbits: <strong>{statusSummary.validated_objects ?? 'Unavailable'}</strong>
                </span>
                <span>
                  Screened Events: <strong>{statusSummary.total_conjunctions ?? 'Unavailable'}</strong>
                </span>
                {statusSummary.last_sync_utc && (
                  <span>Sync: {formatUtcDateTime(statusSummary.last_sync_utc, true)}</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{statusError || 'Querying live backend verification status...'}</span>
            </div>
          )}
        </div>

        {/* Section 1: Astrodynamics Foundation */}
        <section aria-labelledby="arch-physics-heading" className="space-y-2.5">
          <h3
            id="arch-physics-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 border-b border-space-800 pb-1.5"
          >
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            1. Astrodynamics & Encounter Solvers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-space-950 rounded-lg border border-space-800 space-y-1">
              <h4 className="font-semibold text-slate-100">SGP4 / SDP4 Orbit Propagation</h4>
              <p className="text-slate-400 leading-relaxed">
                Uses the Vallado / Hoots SGP4 & SDP4 perturbation implementation (WGS84 constants)
                modeling Earth zonal harmonics (J2, J3, J4), B* atmospheric drag, and deep-space
                solar-lunar perturbations.
              </p>
            </div>

            <div className="p-3.5 bg-space-950 rounded-lg border border-space-800 space-y-1">
              <h4 className="font-semibold text-slate-100">Orthogonal TCA Root-Finding</h4>
              <p className="text-slate-400 leading-relaxed">
                Refines Time of Closest Approach by numerically solving the relative-state
                orthogonality condition{' '}
                <code className="text-sky-300 font-mono">r_rel(t) · v_rel(t) = 0</code> using
                golden-section search and secant iteration.
              </p>
            </div>

            <div className="p-3.5 bg-space-950 rounded-lg border border-space-800 space-y-1">
              <h4 className="font-semibold text-slate-100">
                B-Plane Projection & Probability Models
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Projects relative miss vectors onto the encounter B-Plane and evaluates collision
                probability across Foster-2D hard-body Gaussian integration, Akella-Alfriend,
                Alfano maximum-Pc bounds, and Monte Carlo perturbation sweeps.
              </p>
            </div>

            <div className="p-3.5 bg-space-950 rounded-lg border border-space-800 space-y-1">
              <h4 className="font-semibold text-slate-100">
                Avoidance Maneuvers, Decay & Breakup Physics
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Computes RTN impulse maneuvers with Tsiolkovsky propellant sizing, King-Hele orbital
                lifetime predictions, and NASA EVOLVE 4.0 fragment distributions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Telemetry Honesty */}
        <section aria-labelledby="arch-honesty-heading" className="space-y-2.5">
          <h3
            id="arch-honesty-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-space-800 pb-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            2. Telemetry Honesty & Covariance Disclosure
          </h3>
          <div className="p-4 bg-space-950 rounded-lg border border-space-800 space-y-2">
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-slate-100">No Fabricated 6x6 Covariance:</strong> Standard
                public TLE/GP catalogs do not supply operator state covariance matrices. Analytical Pc
                calculations explicitly state assumed isotropic or scaled uncertainty bounds.
              </li>
              <li>
                <strong className="text-slate-100">Explicit Data-State Labeling:</strong> Every
                telemetry view discloses whether values originate from{' '}
                <span className="font-mono text-emerald-300">LIVE</span> catalog feeds,{' '}
                <span className="font-mono text-sky-300">SGP4</span> analytical propagation, or{' '}
                <span className="font-mono text-amber-300">DEGRADED / UNAVAILABLE</span> upstream
                services rather than substituting synthetic placeholder metrics.
              </li>
              <li>
                <strong className="text-slate-100">Source Provenance:</strong> Ephemeris synchronization
                tracks upstream sources (CelesTrak GP, Space-Track when configured, NOAA SWPC solar
                indices, Launch Library 2) together with exact TLE epochs and sync timestamps in UTC.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Standards */}
        <section aria-labelledby="arch-standards-heading" className="space-y-2">
          <h3
            id="arch-standards-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 border-b border-space-800 pb-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            3. Standards Interoperability
          </h3>
          <div className="p-3.5 bg-space-950 rounded-lg border border-space-800 text-slate-300 leading-relaxed">
            Exports conjunction alerts compliant with{' '}
            <strong className="text-slate-100">CCSDS 508.0-B-1 (ISO 26900)</strong> Conjunction Data
            Messages in both KVN plain-text and NDM/XML schemas, plus signed JSON operator webhooks.
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-space-950 border-t border-space-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>OrbitGuard SSA Core • Live Verification Details Available in Validation Center</span>
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-space-950 font-semibold text-xs transition-colors"
        >
          Close
        </button>
      </div>
    </ModalDialog>
  );
};
