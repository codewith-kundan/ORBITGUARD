import React, { useState } from 'react';
import { OrbitalObject } from '../types';
import {
  X,
  Satellite,
  Trash2,
  Rocket,
  Copy,
  Check,
  Radio,
  Flame,
  Calendar,
  Activity,
} from 'lucide-react';
import { EvidenceFooter } from './EvidenceFooter';
import { ModalDialog } from './ModalDialog';
import { formatUtcDateTime } from '../utils/utcTime';

interface ObjectDetailsModalProps {
  object: OrbitalObject;
  onClose: () => void;
  onOpenOverpass?: (obj: OrbitalObject) => void;
  onOpenDecay?: (obj: OrbitalObject) => void;
}

export const ObjectDetailsModal: React.FC<ObjectDetailsModalProps> = ({
  object,
  onClose,
  onOpenOverpass,
  onOpenDecay,
}) => {
  const [copiedTle, setCopiedTle] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const objectBadge = (() => {
    switch (object.object_type) {
      case 'ACTIVE_SATELLITE':
        return {
          label: 'Active Payload',
          cls: 'bg-sky-500/10 border-sky-500/35 text-sky-300',
          Icon: Satellite,
        };
      case 'DEBRIS':
        return {
          label: 'Debris Fragment',
          cls: 'bg-red-500/10 border-red-500/35 text-red-300',
          Icon: Trash2,
        };
      case 'ROCKET_BODY':
        return {
          label: 'Rocket Body',
          cls: 'bg-amber-500/10 border-amber-500/35 text-amber-300',
          Icon: Rocket,
        };
      default:
        return {
          label: 'Unclassified',
          cls: 'bg-space-800 border-space-700 text-slate-300',
          Icon: Activity,
        };
    }
  })();

  const TypeIcon = objectBadge.Icon;

  const formatMetric = (value?: number | null, digits: number = 2, suffix: string = ''): string => {
    if (value === null || value === undefined || Number.isNaN(value)) return 'Unavailable';
    return `${value.toFixed(digits)}${suffix}`;
  };

  const copyTle = async () => {
    try {
      setCopyError(null);
      await navigator.clipboard.writeText(`${object.tle_line1}\n${object.tle_line2}`);
      setCopiedTle(true);
      setTimeout(() => setCopiedTle(false), 2000);
    } catch {
      setCopyError('Clipboard access unavailable — select and copy the TLE block manually.');
    }
  };

  const hasVerifiedSource = Boolean(object.source && !object.source.toLowerCase().includes('mock'));
  const evidenceTimestamp =
    object.last_position_update || object.tle_epoch || new Date().toISOString();

  return (
    <ModalDialog
      isOpen={true}
      onClose={onClose}
      titleId="object-details-title"
      maxWidthClass="max-w-3xl"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-space-800 bg-space-950 px-5 py-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2 rounded-lg border shrink-0 ${objectBadge.cls}`}>
            <TypeIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="object-details-title"
                className="text-base sm:text-lg font-semibold text-slate-100 truncate"
              >
                {object.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${objectBadge.cls}`}
              >
                {objectBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs font-mono text-slate-400 flex-wrap tabular-nums">
              <span>NORAD #{object.norad_id}</span>
              {object.international_designator && (
                <span>COSPAR {object.international_designator}</span>
              )}
              {(object.country || object.country_code) && (
                <span>Registry {object.country || object.country_code}</span>
              )}
              {object.status && <span>Status {object.status}</span>}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close object telemetry dialog"
          className="p-1.5 rounded-lg bg-space-900 hover:bg-space-800 border border-space-700 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="overflow-y-auto p-5 space-y-5 flex-1">
        {/* Primary Orbital Parameters */}
        <section aria-labelledby="orbital-params-heading">
          <h3
            id="orbital-params-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5"
          >
            Osculating Orbital Geometry
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Apogee Altitude</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {formatMetric(object.apogee_km, 1, ' km')}
              </div>
            </div>
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Perigee Altitude</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {formatMetric(object.perigee_km, 1, ' km')}
              </div>
            </div>
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Inclination</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {formatMetric(object.inclination, 2, '°')}
              </div>
            </div>
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Orbital Period</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {formatMetric(object.period_minutes, 1, ' min')}
              </div>
            </div>
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Eccentricity</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {formatMetric(object.eccentricity, 5)}
              </div>
            </div>
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Mean Motion</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {formatMetric(object.mean_motion, 4, ' rev/d')}
              </div>
            </div>
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">B* Drag Term</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                {object.bstar !== null && object.bstar !== undefined
                  ? object.bstar.toExponential(2)
                  : 'Unavailable'}
              </div>
            </div>
            <div className="bg-space-950 border border-space-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400">Radar Cross Section</div>
              <div className="text-sm font-mono font-semibold text-slate-100 mt-0.5">
                {object.rcs_size || 'Unspecified'}
              </div>
            </div>
          </div>
        </section>

        {/* Classical Keplerian & Launch Metadata */}
        <section aria-labelledby="keplerian-heading">
          <h3
            id="keplerian-heading"
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5"
          >
            Classical Elements & Catalog Metadata
          </h3>
          <div className="bg-space-950 border border-space-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <caption className="sr-only">
                Keplerian orbital angles and catalog launch provenance for {object.name}
              </caption>
              <tbody className="divide-y divide-space-800/80">
                <tr>
                  <th scope="row" className="px-3.5 py-2 text-slate-400 font-medium">
                    Semi-Major Axis
                  </th>
                  <td className="px-3.5 py-2 font-mono text-slate-200 tabular-nums">
                    {formatMetric(object.semi_major_axis_km, 2, ' km')}
                  </td>
                  <th scope="row" className="px-3.5 py-2 text-slate-400 font-medium">
                    RA of Ascending Node
                  </th>
                  <td className="px-3.5 py-2 font-mono text-slate-200 tabular-nums">
                    {formatMetric(object.raan_deg, 2, '°')}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3.5 py-2 text-slate-400 font-medium">
                    Argument of Pericenter
                  </th>
                  <td className="px-3.5 py-2 font-mono text-slate-200 tabular-nums">
                    {formatMetric(object.arg_pericenter_deg, 2, '°')}
                  </td>
                  <th scope="row" className="px-3.5 py-2 text-slate-400 font-medium">
                    Mean Anomaly
                  </th>
                  <td className="px-3.5 py-2 font-mono text-slate-200 tabular-nums">
                    {formatMetric(object.mean_anomaly_deg, 2, '°')}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="px-3.5 py-2 text-slate-400 font-medium">
                    Launch Date
                  </th>
                  <td className="px-3.5 py-2 font-mono text-slate-200 tabular-nums">
                    {object.launch_date || 'Unavailable'}
                  </td>
                  <th scope="row" className="px-3.5 py-2 text-slate-400 font-medium">
                    Catalog Source
                  </th>
                  <td className="px-3.5 py-2 font-mono text-slate-200">
                    {object.source || 'Catalog GP Ephemeris'}
                    {object.source_group ? ` (${object.source_group})` : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* TLE Block */}
        <section aria-labelledby="tle-heading">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3
              id="tle-heading"
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              NORAD Two-Line Element (TLE) Ephemeris
            </h3>
            <button
              type="button"
              onClick={copyTle}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-space-700 bg-space-950 hover:bg-space-800 text-xs font-medium text-slate-200 transition-colors"
            >
              {copiedTle ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  Copied TLE
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  Copy TLE
                </>
              )}
            </button>
          </div>

          {copyError && (
            <div className="mb-2 px-3 py-2 rounded border border-amber-500/35 bg-amber-500/10 text-amber-200 text-xs">
              {copyError}
            </div>
          )}

          <pre className="p-3.5 rounded-lg bg-space-950 border border-space-800 font-mono text-xs text-sky-300 overflow-x-auto select-all leading-relaxed">
            {object.tle_line1}
            {'\n'}
            {object.tle_line2}
          </pre>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-2 text-[11px] font-mono text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              TLE Epoch: <span className="text-slate-200">{formatUtcDateTime(object.tle_epoch)}</span>
            </span>
            <span>
              Last Propagated: <span className="text-slate-200">{formatUtcDateTime(object.last_position_update)}</span>
            </span>
          </div>
        </section>

        {/* Cross-Module Workflows */}
        {(onOpenOverpass || onOpenDecay) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-space-800">
            {onOpenOverpass && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOverpass(object);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-xs font-medium text-slate-100 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                Compute Ground Station Passes
              </button>
            )}
            {onOpenDecay && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDecay(object);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-space-800 hover:bg-space-700 border border-space-700 text-xs font-medium text-slate-100 transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                Assess Atmospheric Re-entry
              </button>
            )}
          </div>
        )}

        <EvidenceFooter
          evidence={{
            data_state: hasVerifiedSource ? 'LIVE' : 'CALCULATED',
            source: object.source || 'Catalog GP Ephemeris',
            retrieved_at: evidenceTimestamp,
            tle_epoch: object.tle_epoch,
            calculation_method: 'SGP4/SDP4 General Perturbations Osculating State',
            model_version: 'SGP4-TLE',
            confidence: object.tle_epoch ? 'HIGH' : 'LOW',
          }}
        />
      </div>
    </ModalDialog>
  );
};
