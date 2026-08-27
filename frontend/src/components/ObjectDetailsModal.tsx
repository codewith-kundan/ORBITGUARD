import React, { useState, useEffect } from 'react';
import { OrbitalObject, OrbitalPosition } from '../types';
import { api } from '../services/api';
import { X, Satellite, Compass, Activity, Terminal, Rocket, Info, Radio, Flame } from 'lucide-react';
import { EvidenceFooter } from './EvidenceFooter';

interface ObjectDetailsModalProps {
  object: OrbitalObject | null;
  onClose: () => void;
  onOpenOverpass?: (obj: OrbitalObject) => void;
  onOpenDecay?: (obj: OrbitalObject) => void;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE_SATELLITE: { label: 'PAYLOAD', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  DEBRIS: { label: 'DEBRIS', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  ROCKET_BODY: { label: 'ROCKET BODY', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  UNKNOWN: { label: 'UNKNOWN', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
};

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', PRC: 'China', CIS: 'Russia/CIS', IND: 'India', JPN: 'Japan',
  ESA: 'ESA', FR: 'France', UK: 'United Kingdom', GER: 'Germany', IT: 'Italy',
  CA: 'Canada', KOR: 'South Korea', ISR: 'Israel', AU: 'Australia', BR: 'Brazil',
  ITSO: 'INTELSAT', SES: 'SES', O3B: 'O3b Networks', ORB: 'ORB Communications',
  EUME: 'EUMETSAT', NATO: 'NATO', AB: 'Saudi Arabia', IRID: 'Iridium',
  GLOB: 'Globalstar', TBD: 'TBD',
};

const InfoItem: React.FC<{ label: string; value: string | number | null | undefined; unit?: string; highlight?: boolean }> = ({ label, value, unit, highlight }) => (
  <div className="bg-space-950 p-2.5 rounded-lg border border-space-800">
    <div className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</div>
    <div className={`text-xs font-bold mt-0.5 ${highlight ? 'text-cyan-neon' : 'text-white'}`}>
      {value != null && value !== '' ? `${value}${unit ? ` ${unit}` : ''}` : <span className="text-slate-500 font-normal">NOT AVAILABLE</span>}
    </div>
  </div>
);

export const ObjectDetailsModal: React.FC<ObjectDetailsModalProps> = ({ object, onClose, onOpenOverpass, onOpenDecay }) => {
  const [livePos, setLivePos] = useState<OrbitalPosition | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!object) return;
    let isMounted = true;

    const fetchPos = async () => {
      setLoading(true);
      try {
        const pos = await api.getObjectPosition(object.norad_id);
        if (isMounted) setLivePos(pos);
      } catch (e) {
        console.error('Failed to get position:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPos();
    const interval = setInterval(fetchPos, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [object]);

  if (!object) return null;

  const typeInfo = TYPE_LABELS[object.object_type] || TYPE_LABELS.UNKNOWN;
  const countryName = object.country_code ? (COUNTRY_NAMES[object.country_code] || object.country_code) : null;
  const missionStatus = object.decay_date ? 'DECAYED' : 'ACTIVE';
  const statusColor = missionStatus === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400';

  // Data age from TLE epoch
  let dataAge = '';
  if (object.tle_epoch) {
    const epochDate = new Date(object.tle_epoch);
    const ageHours = (Date.now() - epochDate.getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) dataAge = `${ageHours.toFixed(1)}h`;
    else dataAge = `${(ageHours / 24).toFixed(1)}d`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-space-900 border border-cyan-500/40 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative font-mono text-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-space-800 pb-3 mb-4 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-neon">
              {object.object_type === 'ROCKET_BODY' ? <Rocket className="w-6 h-6" /> : <Satellite className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-wide">{object.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-space-800 text-cyan-400 border border-space-700">
                  NORAD #{object.norad_id}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {countryName ? `${countryName} • ` : ''}
                <span className={statusColor}>{missionStatus}</span>
                {object.international_designator ? ` • COSPAR: ${object.international_designator}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDecay && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDecay(object);
                }}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-xs font-bold transition"
              >
                <Flame className="w-3.5 h-3.5" />
                RE-ENTRY
              </button>
            )}

            {onOpenOverpass && (
              <button
                onClick={() => {
                  onClose();
                  onOpenOverpass(object);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-lg text-xs font-bold transition shadow-md"
              >
                <Radio className="w-3.5 h-3.5" />
                OVERPASS
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Object Identification */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400" /> Object Identification
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InfoItem label="COSPAR ID" value={object.international_designator} />
            <InfoItem label="Country / Operator" value={countryName || object.country_code} />
            <InfoItem label="RCS Size" value={object.rcs_size} />
            <InfoItem label="Classification" value={typeInfo.label} />
          </div>
        </div>

        {/* Mission Information */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5 text-cyan-400" /> Mission Information
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InfoItem label="Launch Date" value={object.launch_date} />
            <InfoItem label="Launch Site" value={object.launch_site} />
            <InfoItem label="Mission Status" value={missionStatus} />
            <InfoItem label="Decay Date" value={object.decay_date || (missionStatus === 'ACTIVE' ? 'IN ORBIT' : undefined)} />
          </div>
        </div>

        {/* Real-Time SGP4 Ephemeris */}
        <div className="mb-4">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            Real-Time SGP4 Ephemeris {loading && <span className="text-[10px] text-slate-400">(Updating...)</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InfoItem label="Latitude" value={livePos?.lat?.toFixed(4)} unit="°" highlight />
            <InfoItem label="Longitude" value={livePos?.lon?.toFixed(4)} unit="°" highlight />
            <InfoItem label="Altitude" value={livePos?.alt_km?.toFixed(1)} unit="km" highlight />
            <InfoItem label="Velocity" value={livePos?.velocity_km_s?.toFixed(3)} unit="km/s" highlight />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <InfoItem label="ECEF X" value={livePos?.x_km?.toFixed(1)} unit="km" />
            <InfoItem label="ECEF Y" value={livePos?.y_km?.toFixed(1)} unit="km" />
            <InfoItem label="ECEF Z" value={livePos?.z_km?.toFixed(1)} unit="km" />
          </div>
        </div>

        {/* Keplerian Orbital Elements */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-cyan-400" /> Keplerian Orbital Elements
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InfoItem label="Perigee" value={object.perigee_km?.toFixed(1)} unit="km" />
            <InfoItem label="Apogee" value={object.apogee_km?.toFixed(1)} unit="km" />
            <InfoItem label="Inclination" value={object.inclination?.toFixed(2)} unit="°" />
            <InfoItem label="Period" value={object.period_minutes?.toFixed(1)} unit="min" />
            <InfoItem label="Semi-Major Axis" value={object.semi_major_axis_km?.toFixed(1)} unit="km" />
            <InfoItem label="Eccentricity" value={object.eccentricity?.toFixed(6)} />
            <InfoItem label="Mean Motion" value={object.mean_motion?.toFixed(4)} unit="rev/day" />
            <InfoItem label="B* Drag" value={object.bstar != null ? object.bstar.toExponential(4) : null} />
            <InfoItem label="RAAN" value={object.raan_deg?.toFixed(2)} unit="°" />
            <InfoItem label="Arg. Pericenter" value={object.arg_pericenter_deg?.toFixed(2)} unit="°" />
            <InfoItem label="Mean Anomaly" value={object.mean_anomaly_deg?.toFixed(2)} unit="°" />
          </div>
        </div>

        {/* Data Provenance */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" /> Data Provenance
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InfoItem label="Data Source" value={object.source} />
            <InfoItem label="TLE Epoch" value={object.tle_epoch ? new Date(object.tle_epoch).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : null} />
            <InfoItem label="Data Age" value={dataAge || null} />
            <InfoItem label="Last Updated" value={object.updated_at ? new Date(object.updated_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : null} />
          </div>
        </div>

        {/* Raw TLE */}
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Raw Two-Line Element (TLE)
          </div>
          <div className="bg-space-950 p-2.5 rounded-lg border border-space-800 font-mono text-[10px] sm:text-[11px] text-slate-300 overflow-x-auto select-all">
            <div className="text-cyan-400">{object.name}</div>
            <div>{object.tle_line1}</div>
            <div>{object.tle_line2}</div>
          </div>
        </div>


        {/* Evidence & Provenance Audit */}
        <EvidenceFooter
          evidence={{
            data_state: 'CALCULATED',
            source: object.source || 'Space-Track / CelesTrak (18th SDS)',
            source_url: 'https://www.space-track.org',
            retrieved_at: object.updated_at || new Date().toISOString(),
            tle_epoch: object.tle_epoch,
            calculation_method: 'SGP4 / WGS-84 Ephemeris Engine',
            model_version: 'OrbitGuard Astrodynamics v2.4',
            confidence: object.tle_epoch ? 'HIGH' : 'MEDIUM'
          }}
        />

        {/* Scientific Disclaimer */}
        <div className="mt-4 text-[9px] text-slate-500 text-center border-t border-space-800 pt-3">
          Orbital positions are research/educational calculations based on publicly available orbital data.
          This system is not an operational collision-avoidance service.
        </div>
      </div>
    </div>
  );
};
