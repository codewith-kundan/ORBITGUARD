import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as satellite from 'satellite.js';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Globe,
  Info,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Satellite,
  Search,
  Sliders,
  X,
} from 'lucide-react';
import {
  Conjunction,
  GroundStation,
  OrbitalObject,
  OrbitalPosition,
  SystemStatistics,
} from '../types';
import { api } from '../services/api';
import { getOrbitalIconCategory } from '../utils/orbitalIcons';
import { formatUtcTime } from '../utils/utcTime';
import { SceneDensityControl } from './SceneDensityControl';

interface Map2DViewProps {
  objects: OrbitalObject[];
  selectedObject: OrbitalObject | null;
  selectedConjunction?: Conjunction | null;
  stats?: SystemStatistics | null;
  swarmDensity?: number;
  onChangeSwarmDensity?: (density: number) => void;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction?: (conj: Conjunction | null) => void;
  onOpenOverpassModal: (obj: OrbitalObject) => void;
  onOpenDetailsModal?: (obj: OrbitalObject) => void;
}

interface HoveredEntity {
  type: 'satellite' | 'station';
  name: string;
  id?: number | string;
  latitude: number;
  longitude: number;
  altitude_km?: number;
  country?: string;
  details?: string;
  screenX: number;
  screenY: number;
}

const mathRadians = (deg: number) => (deg * Math.PI) / 180.0;
const mathDegrees = (rad: number) => (rad * 180.0) / Math.PI;

export const Map2DView: React.FC<Map2DViewProps> = ({
  objects,
  selectedObject,
  selectedConjunction,
  stats,
  swarmDensity: swarmDensityProp,
  onChangeSwarmDensity,
  onSelectObject,
  onSelectConjunction,
  onOpenOverpassModal,
  onOpenDetailsModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const earthImgRef = useRef<HTMLImageElement | null>(null);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFleetFilter, setActiveFleetFilter] = useState<string>('ALL');
  const [altitudeFilter, setAltitudeFilter] = useState<string>('ALL');
  const [isDebrisMode, setIsDebrisMode] = useState<boolean>(false);

  const [showFootprint, setShowFootprint] = useState<boolean>(false);
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showGrids, setShowGrids] = useState<boolean>(true);

  const [displayTime, setDisplayTime] = useState<Date>(() => new Date());
  const simTimeRef = useRef<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const isPlayingRef = useRef<boolean>(true);
  const simSpeedRef = useRef<number>(1);

  isPlayingRef.current = isPlaying;
  simSpeedRef.current = simSpeed;

  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<OrbitalObject[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState<boolean>(false);
  const [stations, setStations] = useState<GroundStation[]>([]);
  const [positions, setPositions] = useState<OrbitalPosition[]>([]);
  const [localSwarmDensity, setLocalSwarmDensity] = useState<number>(3000);
  const swarmDensity = swarmDensityProp !== undefined ? swarmDensityProp : localSwarmDensity;
  const setSwarmDensity = onChangeSwarmDensity ?? setLocalSwarmDensity;
  const [isFetchingDensity, setIsFetchingDensity] = useState<boolean>(false);
  const masterPositionsRef = useRef<OrbitalPosition[]>([]);
  const hasFullPositionsRef = useRef<boolean>(false);
  const geoCacheRef = useRef<Map<number, { lat: number; lon: number }>>(new Map());
  const propCursorRef = useRef<number>(0);
  const satrecMapRef = useRef<
    Map<number, { satrec: any; name: string; type: string; norad_id: number }>
  >(new Map());

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        setIsSearchingCatalog(true);
        const res = await api.getPaginatedObjects(1, 8, searchQuery.trim());
        if (res && res.items) {
          setSearchSuggestions(res.items);
        }
      } catch {
        setSearchSuggestions([]);
      } finally {
        setIsSearchingCatalog(false);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    api
      .getGroundStations()
      .then((data) => {
        if (Array.isArray(data)) setStations(data);
      })
      .catch(() => {});
  }, []);

  const activeObj = useMemo(() => {
    if (selectedConjunction?.object_a) return selectedConjunction.object_a;
    if (selectedObject) return selectedObject;
    if (objects.length > 0) return objects[0];
    return null;
  }, [selectedConjunction, selectedObject, objects]);

  const secondaryObj = useMemo(() => {
    if (selectedConjunction?.object_b) return selectedConjunction.object_b;
    return null;
  }, [selectedConjunction]);

  useEffect(() => {
    const dayImg = new Image();
    dayImg.src = '/textures/earth_day.jpg';
    dayImg.onload = () => {
      earthImgRef.current = dayImg;
    };
  }, []);

  useEffect(() => {
    if (objects && objects.length > 0) {
      objects.forEach((obj) => {
        if (obj.tle_line1 && obj.tle_line2) {
          try {
            const satrec = satellite.twoline2satrec(obj.tle_line1, obj.tle_line2);
            if (satrec && (satrec as any).error === 0) {
              satrecMapRef.current.set(obj.norad_id, {
                satrec,
                name: obj.name,
                type: obj.object_type,
                norad_id: obj.norad_id,
              });
            }
          } catch {}
        }
      });
    }
  }, [objects]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const poolCoversTarget =
      masterPositionsRef.current.length > 0 &&
      ((swarmDensity === 0 && hasFullPositionsRef.current) ||
        (swarmDensity > 0 && masterPositionsRef.current.length >= swarmDensity));

    if (poolCoversTarget) {
      const sliced =
        swarmDensity === 0
          ? masterPositionsRef.current
          : masterPositionsRef.current.slice(0, swarmDensity);
      setPositions(sliced);
      propCursorRef.current = 0;
    }

    const fetchPositions = async (showSpinner: boolean) => {
      if (showSpinner && isMounted) setIsFetchingDensity(true);
      try {
        const batch = await api.getBatchPositions(
          simTimeRef.current.toISOString(),
          swarmDensity,
          controller.signal
        );
        if (isMounted && batch.positions && batch.positions.length > 0) {
          setPositions(batch.positions);
          propCursorRef.current = 0;
          if (swarmDensity === 0 || batch.positions.length >= masterPositionsRef.current.length) {
            masterPositionsRef.current = batch.positions;
            if (swarmDensity === 0) hasFullPositionsRef.current = true;
          }
          batch.positions.forEach((p: OrbitalPosition) => {
            geoCacheRef.current.set(p.norad_id, { lat: p.lat, lon: p.lon });
            if (p.tle_line1 && p.tle_line2 && !satrecMapRef.current.has(p.norad_id)) {
              try {
                const rec = satellite.twoline2satrec(p.tle_line1, p.tle_line2);
                if (rec && (rec as any).error === 0) {
                  satrecMapRef.current.set(p.norad_id, {
                    satrec: rec,
                    name: p.name,
                    type: p.type,
                    norad_id: p.norad_id,
                  });
                }
              } catch {}
            }
          });
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.debug('Map2D batch fetch failed:', err);
        }
      } finally {
        if (isMounted) setIsFetchingDensity(false);
      }
    };

    fetchPositions(!poolCoversTarget);
    const pollMs = swarmDensity === 0 ? 60000 : 20000;
    const interval = window.setInterval(() => fetchPositions(false), pollMs);
    return () => {
      isMounted = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [swarmDensity]);

  const fleetCounts = useMemo(() => {
    if (stats?.fleet_breakdown) {
      return stats.fleet_breakdown;
    }

    const totalTracked = stats?.tracked_objects ?? objects.length;
    let payload = 0;
    let starlink = 0;
    let oneweb = 0;
    let gps = 0;
    let debris = 0;
    let rocket = 0;
    let iss = 0;
    let leoCount = 0;
    let meoCount = 0;
    let geoCount = 0;

    const sourceList = positions.length > 0 ? positions : objects;
    sourceList.forEach((o: any) => {
      const cat = getOrbitalIconCategory(o.name, o.type || o.object_type, o.norad_id);
      if (cat === 'DEBRIS') debris++;
      else if (cat === 'ROCKET') rocket++;
      else if (cat === 'GPS') gps++;
      else if (cat === 'STARLINK') starlink++;
      else if (cat === 'ONEWEB') oneweb++;
      else if (cat === 'ISS') iss++;
      else payload++;

      const alt = o.apogee_km || o.alt_km || 400;
      if (alt <= 2000) leoCount++;
      else if (alt <= 20000) meoCount++;
      else geoCount++;
    });

    return {
      all: totalTracked,
      operational: stats?.active_satellites ?? payload + starlink + oneweb + gps + iss,
      payload,
      starlink,
      oneweb,
      gps,
      debris: stats?.space_debris ?? debris,
      rocket: stats?.rocket_bodies ?? rocket,
      iss,
      leo: stats?.altitude_distribution?.leo ?? leoCount,
      meo: stats?.altitude_distribution?.meo ?? meoCount,
      geo: stats?.altitude_distribution?.geo ?? geoCount,
    };
  }, [objects, positions, stats]);

  const visibleSwarm = useMemo(() => {
    const list: OrbitalPosition[] =
      positions.length > 0
        ? positions
        : objects.map((o) => ({
            timestamp: '',
            norad_id: o.norad_id,
            name: o.name,
            type: o.object_type,
            lat: 0,
            lon: 0,
            alt_km: o.apogee_km || 400,
            velocity_km_s: 0,
            x_km: 0,
            y_km: 0,
            z_km: 0,
            vx_km_s: 0,
            vy_km_s: 0,
            vz_km_s: 0,
            tle_line1: o.tle_line1,
            tle_line2: o.tle_line2,
          }));

    const cappedList =
      swarmDensity === 0 ? list : list.slice(0, Math.min(swarmDensity, list.length));

    return cappedList.filter((pos) => {
      const cat = getOrbitalIconCategory(pos.name, pos.type, pos.norad_id);
      const alt = pos.alt_km || 400;

      if (isDebrisMode && cat !== 'DEBRIS') return false;
      if (activeFleetFilter === 'PAYLOAD' && (cat === 'DEBRIS' || cat === 'ROCKET')) return false;
      else if (activeFleetFilter === 'STARLINK' && cat !== 'STARLINK') return false;
      else if (activeFleetFilter === 'ONEWEB' && cat !== 'ONEWEB') return false;
      else if (activeFleetFilter === 'GPS' && cat !== 'GPS') return false;
      else if (activeFleetFilter === 'DEBRIS' && cat !== 'DEBRIS') return false;
      else if (activeFleetFilter === 'ROCKET' && cat !== 'ROCKET') return false;
      else if (activeFleetFilter === 'ISS' && cat !== 'ISS') return false;

      if (altitudeFilter === 'LEO' && alt > 2000) return false;
      if (altitudeFilter === 'MEO' && (alt <= 2000 || alt > 20000)) return false;
      if (altitudeFilter === 'GEO' && alt <= 20000) return false;

      return true;
    });
  }, [positions, objects, swarmDensity, activeFleetFilter, altitudeFilter, isDebrisMode]);

  const satrec = useMemo(() => {
    if (!activeObj?.tle_line1 || !activeObj?.tle_line2) return null;
    try {
      const rec = satellite.twoline2satrec(activeObj.tle_line1, activeObj.tle_line2);
      if (rec && !(rec as any).error) return rec;
    } catch {}
    return null;
  }, [activeObj?.norad_id, activeObj?.tle_line1, activeObj?.tle_line2]);

  const satrecB = useMemo(() => {
    if (!secondaryObj?.tle_line1 || !secondaryObj?.tle_line2) return null;
    try {
      const rec = satellite.twoline2satrec(secondaryObj.tle_line1, secondaryObj.tle_line2);
      if (rec && !(rec as any).error) return rec;
    } catch {}
    return null;
  }, [secondaryObj?.norad_id, secondaryObj?.tle_line1, secondaryObj?.tle_line2]);

  // Throttled 2Hz React clock update (decoupled from canvas FPS)
  useEffect(() => {
    const id = window.setInterval(() => {
      setDisplayTime(new Date(simTimeRef.current.getTime()));
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const livePosition = useMemo(() => {
    if (!satrec) return null;
    try {
      const gmst = satellite.gstime(displayTime);
      const pv = satellite.propagate(satrec, displayTime);
      if (pv && pv.position && typeof pv.position !== 'boolean') {
        const pEci = pv.position as satellite.EciVec3<number>;
        const vEci = pv.velocity as satellite.EciVec3<number>;
        const geodetic = satellite.eciToGeodetic(pEci, gmst);
        const lat = satellite.degreesLat(geodetic.latitude);
        const lon = satellite.degreesLong(geodetic.longitude);
        const altKm = Math.max(120, geodetic.height);
        const velKmS = vEci ? Math.sqrt(vEci.x * vEci.x + vEci.y * vEci.y + vEci.z * vEci.z) : 0;

        const R_E = 6371.0;
        const rho = Math.acos(R_E / Math.max(R_E + 10, R_E + altKm));
        return {
          latitude: lat,
          longitude: lon,
          altitude_km: altKm,
          velocity_km_s: velKmS,
          footprint_radius_km: R_E * rho,
        };
      }
    } catch {}
    return null;
  }, [satrec, displayTime]);

  // Ground tracks depend on epoch rounded to 30-second buckets to avoid 60Hz recalculation
  const trackEpochBucket = Math.floor(displayTime.getTime() / 30000);

  const liveGroundTrack = useMemo<{ lat: number; lon: number }[] | null>(() => {
    if (!satrec) return null;
    try {
      const baseTime = trackEpochBucket * 30000;
      const track: { lat: number; lon: number }[] = [];
      const periodMin = activeObj?.period_minutes || 95.0;
      const startMin = -Math.min(45, periodMin * 0.4);
      const endMin = Math.max(95, periodMin * 1.5);

      for (let m = startMin; m <= endMin; m += 1.0) {
        const t = new Date(baseTime + m * 60000);
        const gmst = satellite.gstime(t);
        const pv = satellite.propagate(satrec, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
          track.push({
            lat: satellite.degreesLat(geodetic.latitude),
            lon: satellite.degreesLong(geodetic.longitude),
          });
        }
      }
      return track;
    } catch {
      return null;
    }
  }, [satrec, trackEpochBucket, activeObj?.period_minutes]);

  const liveGroundTrackB = useMemo<{ lat: number; lon: number }[] | null>(() => {
    if (!satrecB) return null;
    try {
      const baseTime = trackEpochBucket * 30000;
      const track: { lat: number; lon: number }[] = [];
      const periodMin = secondaryObj?.period_minutes || 95.0;
      const endMin = Math.max(85, Math.min(720, periodMin - 10));

      for (let m = -10; m <= endMin; m += 1.5) {
        const t = new Date(baseTime + m * 60000);
        const gmst = satellite.gstime(t);
        const pv = satellite.propagate(satrecB, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
          track.push({
            lat: satellite.degreesLat(geodetic.latitude),
            lon: satellite.degreesLong(geodetic.longitude),
          });
        }
      }
      return track;
    } catch {
      return null;
    }
  }, [satrecB, trackEpochBucket, secondaryObj?.period_minutes]);

  // Ref snapshot so single animation loop never restarts when sliders/toggles change
  const renderStateRef = useRef({
    stations,
    visibleSwarm,
    showFootprint,
    showTerminator,
    showStations,
    showGrids,
    activeObj,
    secondaryObj,
    selectedConjunction,
    satrec,
    satrecB,
    liveGroundTrack,
    liveGroundTrackB,
  });
  renderStateRef.current = {
    stations,
    visibleSwarm,
    showFootprint,
    showTerminator,
    showStations,
    showGrids,
    activeObj,
    secondaryObj,
    selectedConjunction,
    satrec,
    satrecB,
    liveGroundTrack,
    liveGroundTrackB,
  };

  // Single Unified 2D Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let lastWall = performance.now();

    const drawOrbitPolyline = (
      track: { lat: number; lon: number }[],
      color: string,
      w: number,
      lonToX: (lon: number) => number,
      latToY: (lat: number) => number
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < track.length; i++) {
        const pt = track[i];
        const px = lonToX(pt.lon);
        const py = latToY(pt.lat);
        if (i > 0) {
          const prev = track[i - 1];
          const dLon = pt.lon - prev.lon;
          if (Math.abs(dLon) > 180) {
            const fraction = (180 - Math.min(prev.lon, pt.lon)) / (Math.abs(dLon) - 360);
            const crossLat =
              prev.lat + (pt.lat - prev.lat) * Math.max(0, Math.min(1, Math.abs(fraction)));
            const crossY = latToY(crossLat);
            if (dLon < 0) {
              ctx.lineTo(w, crossY);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(0, crossY);
            } else {
              ctx.lineTo(0, crossY);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(w, crossY);
            }
          }
        }
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    };

    const propagateLive = (rec: any, t: Date) => {
      if (!rec) return null;
      try {
        const gmst = satellite.gstime(t);
        const pv = satellite.propagate(rec, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const pEci = pv.position as satellite.EciVec3<number>;
          const vEci = pv.velocity as satellite.EciVec3<number>;
          const geodetic = satellite.eciToGeodetic(pEci, gmst);
          const altKm = Math.max(120, geodetic.height);
          const R_E = 6371.0;
          return {
            latitude: satellite.degreesLat(geodetic.latitude),
            longitude: satellite.degreesLong(geodetic.longitude),
            altitude_km: altKm,
            velocity_km_s: vEci ? Math.sqrt(vEci.x ** 2 + vEci.y ** 2 + vEci.z ** 2) : 0,
            footprint_radius_km: R_E * Math.acos(R_E / Math.max(R_E + 10, R_E + altKm)),
          };
        }
      } catch {}
      return null;
    };

    const renderFrame = (now: number) => {
      const dtSec = Math.min(0.25, Math.max(0, (now - lastWall) / 1000));
      lastWall = now;

      if (isPlayingRef.current) {
        simTimeRef.current = new Date(
          simTimeRef.current.getTime() + dtSec * 1000 * (simSpeedRef.current || 1)
        );
      }

      const simDate = simTimeRef.current;
      const st = renderStateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const lonToX = (lon: number) => ((lon + 180) / 360) * w;
      const latToY = (lat: number) => ((90 - lat) / 180) * h;

      if (earthImgRef.current && earthImgRef.current.complete) {
        ctx.drawImage(earthImgRef.current, 0, 0, w, h);
        ctx.fillStyle = 'rgba(8, 11, 16, 0.42)';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = '#080b10';
        ctx.fillRect(0, 0, w, h);
      }

      if (st.showGrids) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
        for (let lat = -60; lat <= 60; lat += 30) {
          const y = latToY(lat);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
          ctx.font = '10px monospace';
          ctx.fillText(`${lat >= 0 ? lat + 'N' : Math.abs(lat) + 'S'}`, 8, y - 4);
        }
        for (let lon = -180; lon <= 180; lon += 45) {
          const x = lonToX(lon);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
          if (lon > -180 && lon < 180) {
            ctx.fillText(`${lon >= 0 ? lon + 'E' : Math.abs(lon) + 'W'}`, x + 4, h - 10);
          }
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, latToY(0));
        ctx.lineTo(w, latToY(0));
        ctx.moveTo(lonToX(0), 0);
        ctx.lineTo(lonToX(0), h);
        ctx.stroke();
      }

      if (st.showTerminator) {
        const dayOfYear = Math.floor(
          (simDate.getTime() - new Date(simDate.getUTCFullYear(), 0, 0).getTime()) / 86400000
        );
        const sunDec = -23.44 * Math.cos(mathRadians((360 / 365) * (dayOfYear + 10)));
        const utcHours =
          simDate.getUTCHours() + simDate.getUTCMinutes() / 60 + simDate.getUTCSeconds() / 3600;
        const sunLon = (12.0 - utcHours) * 15.0;

        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.52)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const lon = (x / w) * 360 - 180;
          const dLon = mathRadians(lon - sunLon);
          const latTerm = mathDegrees(
            Math.atan(-Math.cos(dLon) / Math.tan(mathRadians(sunDec || 0.1)))
          );
          ctx.lineTo(x, latToY(latTerm));
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        const sunX = lonToX(sunLon);
        const sunY = latToY(sunDec);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('SOLAR SUB-POINT', sunX + 9, sunY + 3);
      }

      if (st.showStations) {
        st.stations.forEach((station) => {
          const sx = lonToX(station.longitude_deg);
          const sy = latToY(station.latitude_deg);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(sx, sy, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#a7f3d0';
          ctx.font = '9px monospace';
          ctx.fillText(station.name.split('(')[0].trim(), sx + 9, sy + 3);
        });
      }

      const gmst = satellite.gstime(simDate);
      const swarmList = st.visibleSwarm;
      const swarmCount = swarmList.length;

      if (swarmCount > 5000) {
        const budget = Math.min(swarmCount, 3500);
        let cursor = propCursorRef.current % swarmCount;
        for (let step = 0; step < budget; step++) {
          const item = swarmList[cursor];
          const entry = satrecMapRef.current.get(item.norad_id);
          if (entry?.satrec) {
            try {
              const pv = satellite.propagate(entry.satrec, simDate);
              if (pv && pv.position && typeof pv.position !== 'boolean') {
                const geodetic = satellite.eciToGeodetic(
                  pv.position as satellite.EciVec3<number>,
                  gmst
                );
                geoCacheRef.current.set(item.norad_id, {
                  lat: satellite.degreesLat(geodetic.latitude),
                  lon: satellite.degreesLong(geodetic.longitude),
                });
              }
            } catch {}
          }
          cursor = (cursor + 1) % swarmCount;
        }
        propCursorRef.current = cursor;
      }

      const useFastPoints = swarmCount > 6000;
      for (let i = 0; i < swarmCount; i++) {
        const pos = swarmList[i];
        if (st.activeObj?.norad_id === pos.norad_id) continue;
        let satLat = pos.lat;
        let satLon = pos.lon;
        if (swarmCount <= 5000) {
          const entry = satrecMapRef.current.get(pos.norad_id);
          if (entry?.satrec) {
            try {
              const pv = satellite.propagate(entry.satrec, simDate);
              if (pv && pv.position && typeof pv.position !== 'boolean') {
                const geodetic = satellite.eciToGeodetic(
                  pv.position as satellite.EciVec3<number>,
                  gmst
                );
                satLat = satellite.degreesLat(geodetic.latitude);
                satLon = satellite.degreesLong(geodetic.longitude);
              }
            } catch {}
          }
        } else {
          const cachedGeo = geoCacheRef.current.get(pos.norad_id);
          if (cachedGeo) {
            satLat = cachedGeo.lat;
            satLon = cachedGeo.lon;
          }
        }

        const dotX = lonToX(satLon);
        const dotY = latToY(satLat);
        const cat = getOrbitalIconCategory(pos.name, pos.type, pos.norad_id);

        if (useFastPoints) {
          ctx.fillStyle =
            cat === 'DEBRIS'
              ? '#ef4444'
              : cat === 'ROCKET'
                ? '#eab308'
                : cat === 'GPS'
                  ? '#10b981'
                  : '#38bdf8';
          ctx.fillRect(dotX - 1.5, dotY - 1.5, 3, 3);
        } else if (cat === 'DEBRIS') {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(dotX, dotY - 3);
          ctx.lineTo(dotX + 3, dotY);
          ctx.lineTo(dotX, dotY + 3);
          ctx.lineTo(dotX - 3, dotY);
          ctx.closePath();
          ctx.fill();
        } else if (cat === 'ROCKET') {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(dotX, dotY - 4);
          ctx.lineTo(dotX + 3, dotY + 3);
          ctx.lineTo(dotX - 3, dotY + 3);
          ctx.closePath();
          ctx.fill();
        } else if (cat === 'GPS') {
          ctx.fillStyle = '#10b981';
          ctx.fillRect(dotX - 2.5, dotY - 2.5, 5, 5);
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(dotX - 2, dotY - 2, 4, 4);
        }
      }

      const primaryColorHex =
        st.activeObj?.object_type === 'DEBRIS'
          ? '#ef4444'
          : st.activeObj?.object_type === 'ROCKET_BODY'
            ? '#eab308'
            : '#38bdf8';

      if (st.liveGroundTrack && st.liveGroundTrack.length > 1) {
        drawOrbitPolyline(st.liveGroundTrack, primaryColorHex, w, lonToX, latToY);
      }
      if (st.liveGroundTrackB && st.liveGroundTrackB.length > 1) {
        drawOrbitPolyline(st.liveGroundTrackB, '#ef4444', w, lonToX, latToY);
      }

      const curPosA = propagateLive(st.satrec, simDate);
      if (curPosA && st.activeObj) {
        const curX = lonToX(curPosA.longitude);
        const curY = latToY(curPosA.latitude);

        if (st.showFootprint && curPosA.footprint_radius_km > 0) {
          const footprintPx = (curPosA.footprint_radius_km / 40075.0) * w;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(curX, curY, Math.max(16, footprintPx), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle = primaryColorHex;
        ctx.beginPath();
        ctx.arc(curX, curY, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${st.activeObj.name} (#${st.activeObj.norad_id})`, curX + 12, curY - 6);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(
          `Alt ${curPosA.altitude_km.toFixed(1)} km · ${curPosA.velocity_km_s.toFixed(2)} km/s`,
          curX + 12,
          curY + 8
        );
      }

      const curPosB = propagateLive(st.satrecB, simDate);
      if (curPosB && st.secondaryObj) {
        const curX = lonToX(curPosB.longitude);
        const curY = latToY(curPosB.latitude);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(curX, curY, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(
          `${st.secondaryObj.name} (#${st.secondaryObj.norad_id})`,
          curX + 12,
          curY - 6
        );
      }

      if (
        st.selectedConjunction &&
        st.selectedConjunction.latitude_deg !== undefined &&
        st.selectedConjunction.longitude_deg !== undefined
      ) {
        const tcaX = lonToX(st.selectedConjunction.longitude_deg);
        const tcaY = latToY(st.selectedConjunction.latitude_deg);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tcaX, tcaY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(
          `TCA (${st.selectedConjunction.miss_distance_km.toFixed(2)} km)`,
          tcaX + 14,
          tcaY - 5
        );
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toUpperCase();
    const found = objects.find(
      (o) => o.name.toUpperCase().includes(query) || o.norad_id.toString() === query
    );
    if (found) {
      onSelectObject(found);
      setSearchQuery('');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const w = canvas.width;
    const h = canvas.height;
    const lonToX = (lon: number) => ((lon + 180) / 360) * w;
    const latToY = (lat: number) => ((90 - lat) / 180) * h;

    if (showStations) {
      for (const st of stations) {
        const sx = lonToX(st.longitude_deg);
        const sy = latToY(st.latitude_deg);
        if (Math.hypot(x - sx, y - sy) < 14) {
          setHoveredEntity({
            type: 'station',
            name: st.name,
            id: st.id,
            latitude: st.latitude_deg,
            longitude: st.longitude_deg,
            country: st.country,
            details: `Elev min ${st.min_elevation_deg}° · Alt ${st.altitude_m.toFixed(0)} m`,
            screenX: e.clientX - rect.left,
            screenY: e.clientY - rect.top,
          });
          return;
        }
      }
    }

    if (livePosition && activeObj) {
      const sx = lonToX(livePosition.longitude);
      const sy = latToY(livePosition.latitude);
      if (Math.hypot(x - sx, y - sy) < 16) {
        setHoveredEntity({
          type: 'satellite',
          name: activeObj.name,
          id: activeObj.norad_id,
          latitude: livePosition.latitude,
          longitude: livePosition.longitude,
          altitude_km: livePosition.altitude_km,
          details: `Vel ${livePosition.velocity_km_s.toFixed(2)} km/s · Swath ${livePosition.footprint_radius_km.toFixed(0)} km`,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
        });
        return;
      }
    }

    const curTime = simTimeRef.current;
    const gmst = satellite.gstime(curTime);
    for (const pos of visibleSwarm) {
      if (activeObj?.norad_id === pos.norad_id) continue;
      let satLat = pos.lat;
      let satLon = pos.lon;
      const entry = satrecMapRef.current.get(pos.norad_id);
      if (entry?.satrec) {
        try {
          const pv = satellite.propagate(entry.satrec, curTime);
          if (pv && pv.position && typeof pv.position !== 'boolean') {
            const geodetic = satellite.eciToGeodetic(
              pv.position as satellite.EciVec3<number>,
              gmst
            );
            satLat = satellite.degreesLat(geodetic.latitude);
            satLon = satellite.degreesLong(geodetic.longitude);
          }
        } catch {}
      }
      const sx = lonToX(satLon);
      const sy = latToY(satLat);
      if (Math.hypot(x - sx, y - sy) < 8) {
        setHoveredEntity({
          type: 'satellite',
          name: pos.name || `NORAD #${pos.norad_id}`,
          id: pos.norad_id,
          latitude: satLat,
          longitude: satLon,
          altitude_km: pos.alt_km,
          details:
            pos.velocity_km_s > 0
              ? `${pos.type} · Vel ${pos.velocity_km_s.toFixed(2)} km/s`
              : `${pos.type}`,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
        });
        return;
      }
    }

    setHoveredEntity(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const w = canvas.width;
    const h = canvas.height;
    const lonToX = (lon: number) => ((lon + 180) / 360) * w;
    const latToY = (lat: number) => ((90 - lat) / 180) * h;

    if (showStations) {
      for (const st of stations) {
        const sx = lonToX(st.longitude_deg);
        const sy = latToY(st.latitude_deg);
        if (Math.hypot(x - sx, y - sy) < 16) {
          if (activeObj) onOpenOverpassModal(activeObj);
          return;
        }
      }
    }

    if (livePosition && activeObj) {
      const sx = lonToX(livePosition.longitude);
      const sy = latToY(livePosition.latitude);
      if (Math.hypot(x - sx, y - sy) < 18) {
        if (onOpenDetailsModal) onOpenDetailsModal(activeObj);
        else onOpenOverpassModal(activeObj);
        return;
      }
    }

    const curTime = simTimeRef.current;
    const gmst = satellite.gstime(curTime);
    for (const pos of visibleSwarm) {
      let satLat = pos.lat;
      let satLon = pos.lon;
      const entry = satrecMapRef.current.get(pos.norad_id);
      if (entry?.satrec) {
        try {
          const pv = satellite.propagate(entry.satrec, curTime);
          if (pv && pv.position && typeof pv.position !== 'boolean') {
            const geodetic = satellite.eciToGeodetic(
              pv.position as satellite.EciVec3<number>,
              gmst
            );
            satLat = satellite.degreesLat(geodetic.latitude);
            satLon = satellite.degreesLong(geodetic.longitude);
          }
        } catch {}
      }
      const sx = lonToX(satLon);
      const sy = latToY(satLat);
      if (Math.hypot(x - sx, y - sy) < 9) {
        const found = objects.find((o) => o.norad_id === pos.norad_id);
        onSelectObject(
          found || {
            id: pos.norad_id,
            norad_id: pos.norad_id,
            name: pos.name || `NORAD #${pos.norad_id}`,
            object_type: (pos.type as any) || 'ACTIVE_SATELLITE',
            source: 'SGP4 Ephemeris',
            tle_line1: pos.tle_line1 || '',
            tle_line2: pos.tle_line2 || '',
            perigee_km: pos.alt_km,
            apogee_km: pos.alt_km,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        );
        return;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-space-950 text-slate-100 font-mono relative overflow-hidden rounded-xl border border-space-800 min-h-[540px] h-[calc(100dvh-76px)]"
    >
      {/* Top Toolbar */}
      <div className="bg-space-900 border-b border-space-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs z-20">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span className="font-semibold tracking-wider text-slate-100">2D GROUND TRACK</span>
          </div>

          {selectedConjunction ? (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-red-950/40 border border-red-500/40 rounded text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
              <span className="text-sky-300 font-medium">{activeObj?.name || 'Primary'}</span>
              <span className="text-slate-400">vs</span>
              <span className="text-red-300 font-medium">{secondaryObj?.name || 'Secondary'}</span>
              <span className="text-[11px] text-amber-300 tabular-nums">
                ({selectedConjunction.miss_distance_km.toFixed(1)} km)
              </span>
              {onSelectConjunction && (
                <button
                  type="button"
                  onClick={() => onSelectConjunction(null)}
                  aria-label="Clear conjunction ground track"
                  className="p-0.5 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            activeObj && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-sky-500/10 border border-sky-400/30 rounded text-xs text-sky-300">
                <Satellite className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="truncate max-w-[160px] font-medium">{activeObj.name}</span>
                <span className="text-[10px] text-slate-400 tabular-nums">#{activeObj.norad_id}</span>
              </div>
            )
          )}
        </div>

        {/* Simulation Clock */}
        <div className="flex items-center gap-2 bg-space-950 px-2.5 py-1 rounded-lg border border-space-800">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
            className="p-1 rounded border border-sky-400/35 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              simTimeRef.current = now;
              setDisplayTime(now);
            }}
            aria-label="Reset simulation time to current UTC"
            className="p-1 hover:bg-space-800 text-slate-400 hover:text-slate-100 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-200 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>{formatUtcTime(displayTime)} UTC</span>
          </div>

          <div className="flex items-center gap-0.5 border-l border-space-800 pl-2">
            {[1, 5, 15, 60, 300].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeed(spd)}
                aria-pressed={simSpeed === spd}
                className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums transition-colors ${
                  simSpeed === spd
                    ? 'bg-sky-500/20 text-sky-300 font-medium'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Layer Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFootprint(!showFootprint)}
            aria-pressed={showFootprint}
            className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
              showFootprint
                ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-slate-100'
            }`}
          >
            Footprint
          </button>
          <button
            type="button"
            onClick={() => setShowTerminator(!showTerminator)}
            aria-pressed={showTerminator}
            className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
              showTerminator
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-slate-100'
            }`}
          >
            Day/Night
          </button>
          <button
            type="button"
            onClick={() => setShowStations(!showStations)}
            aria-pressed={showStations}
            className={`px-2.5 py-1 rounded text-[11px] border transition-colors tabular-nums ${
              showStations
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-slate-100'
            }`}
          >
            Stations ({stations.length})
          </button>
          {activeObj && (
            <button
              type="button"
              onClick={() => onOpenOverpassModal(activeObj)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-[11px] font-medium transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>Predict Overpass</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative bg-space-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={2048}
          height={1024}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredEntity(null)}
          onClick={handleCanvasClick}
          className="w-full h-full object-fill block cursor-crosshair"
        />

        {/* Left Filter Dock */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-sm">
          <button
            type="button"
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            aria-expanded={isLeftPanelOpen}
            className="bg-space-900/90 backdrop-blur-md border border-space-700 px-3 py-1.5 rounded-lg font-mono text-xs text-slate-100 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span className="font-semibold">FLEET FILTERS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-950 border border-space-800 text-sky-300 tabular-nums">
                {visibleSwarm.length.toLocaleString()}
              </span>
            </div>
            {isLeftPanelOpen ? (
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
            )}
          </button>

          {isLeftPanelOpen && (
            <div className="bg-space-900/92 backdrop-blur-md border border-space-700 rounded-xl p-3 flex flex-col gap-3 font-mono text-xs shadow-2xl text-slate-200 max-h-[calc(100dvh-210px)] overflow-y-auto">
              <div className="relative">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <label htmlFor="map2d-search-input" className="sr-only">
                    Search catalog object on 2D map
                  </label>
                  <input
                    id="map2d-search-input"
                    type="text"
                    placeholder="Search object or NORAD..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-space-950 border border-space-800 rounded-lg px-3 py-1.5 pl-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400/60"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" aria-hidden="true" />
                  {isSearchingCatalog && (
                    <span className="text-[10px] text-sky-400 absolute right-2.5 top-2">...</span>
                  )}
                </form>

                {searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-space-950 border border-space-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                    {searchSuggestions.map((item) => (
                      <button
                        key={item.norad_id}
                        type="button"
                        onClick={() => {
                          onSelectObject(item);
                          setSearchQuery('');
                          setSearchSuggestions([]);
                        }}
                        className="w-full px-2.5 py-1.5 text-left hover:bg-space-800 border-b border-space-900 last:border-none flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="truncate">
                          <span className="font-sans font-medium text-slate-100 block truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            #{item.norad_id} · {item.object_type}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-900 text-sky-300 shrink-0 tabular-nums">
                          {item.inclination != null ? `${item.inclination.toFixed(1)}°` : '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <SceneDensityControl
                swarmDensity={swarmDensity}
                onChangeDensity={setSwarmDensity}
                renderedCount={visibleSwarm.length}
                totalCatalogCount={stats?.tracked_objects || positions.length || objects.length}
                isLoading={isFetchingDensity}
              />

              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Constellations &amp; Types</span>
                  <span className="text-sky-300 tabular-nums">
                    {(stats?.tracked_objects ?? fleetCounts.all).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {[
                    { key: 'ALL', label: 'All Objects', count: fleetCounts.all, accent: 'text-slate-200' },
                    { key: 'PAYLOAD', label: 'Payloads', count: fleetCounts.operational, accent: 'text-sky-300' },
                    { key: 'DEBRIS', label: 'Debris', count: fleetCounts.debris, accent: 'text-red-300' },
                    { key: 'ROCKET', label: 'Rocket Bodies', count: fleetCounts.rocket, accent: 'text-amber-300' },
                    { key: 'GPS', label: 'GNSS / GPS', count: fleetCounts.gps, accent: 'text-emerald-300' },
                    { key: 'STARLINK', label: 'Starlink', count: fleetCounts.starlink, accent: 'text-slate-200' },
                    { key: 'ONEWEB', label: 'OneWeb', count: fleetCounts.oneweb, accent: 'text-slate-200' },
                    { key: 'ISS', label: 'Stations', count: fleetCounts.iss, accent: 'text-sky-300' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setActiveFleetFilter(f.key);
                        setIsDebrisMode(false);
                      }}
                      aria-pressed={activeFleetFilter === f.key && !isDebrisMode}
                      className={`px-2 py-1.5 rounded border text-left flex items-center justify-between gap-1 transition-colors ${
                        activeFleetFilter === f.key && !isDebrisMode
                          ? 'bg-sky-500/15 border-sky-400/40 font-medium'
                          : 'bg-space-950 border-space-800 hover:border-space-700'
                      }`}
                    >
                      <span className={`truncate ${f.accent}`}>{f.label}</span>
                      <span className="text-[10px] text-slate-300 tabular-nums">
                        {(f.count ?? 0).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                  Orbital Regime
                </div>
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  {[
                    { key: 'ALL', label: 'ALL', count: fleetCounts.all },
                    { key: 'LEO', label: 'LEO', count: fleetCounts.leo },
                    { key: 'MEO', label: 'MEO', count: fleetCounts.meo },
                    { key: 'GEO', label: 'GEO', count: fleetCounts.geo },
                  ].map((alt) => (
                    <button
                      key={alt.key}
                      type="button"
                      onClick={() => setAltitudeFilter(alt.key)}
                      aria-pressed={altitudeFilter === alt.key}
                      className={`py-1 px-1 rounded border text-center transition-colors ${
                        altitudeFilter === alt.key
                          ? 'bg-sky-500/15 text-sky-300 border-sky-400/40 font-medium'
                          : 'bg-space-950 text-slate-400 hover:text-slate-100 border-space-800'
                      }`}
                    >
                      <span className="block">{alt.label}</span>
                      <span className="text-[9px] text-slate-400 tabular-nums">
                        {alt.count.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-space-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowGrids(!showGrids)}
                  aria-pressed={showGrids}
                  className={`flex-1 py-1.5 px-2 rounded text-[11px] border inline-flex items-center justify-center gap-1 transition-colors ${
                    showGrids
                      ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
                      : 'bg-space-950 text-slate-400 border-space-800 hover:text-slate-100'
                  }`}
                >
                  <Compass className="w-3 h-3" aria-hidden="true" />
                  <span>Lat/Lon Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDebrisMode(!isDebrisMode)}
                  aria-pressed={isDebrisMode}
                  className={`flex-1 py-1.5 px-2 rounded text-[11px] border inline-flex items-center justify-center gap-1 transition-colors ${
                    isDebrisMode
                      ? 'bg-red-500/20 text-red-200 border-red-500/50'
                      : 'bg-space-950 text-slate-300 border-space-800 hover:text-red-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-red-400" aria-hidden="true" />
                  <span>Debris Only</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hover Tooltip */}
        {hoveredEntity && (
          <div
            className="absolute z-40 bg-space-900/95 backdrop-blur-md border border-space-700 p-2.5 rounded-lg shadow-xl pointer-events-none text-xs space-y-1 font-mono text-slate-200 tabular-nums"
            style={{
              left: `${Math.min(hoveredEntity.screenX + 14, (containerRef.current?.clientWidth || 800) - 240)}px`,
              top: `${Math.min(hoveredEntity.screenY + 14, (containerRef.current?.clientHeight || 600) - 120)}px`,
            }}
          >
            <div className="font-sans font-semibold text-slate-100 flex items-center gap-1.5 border-b border-space-800 pb-1">
              {hoveredEntity.type === 'station' ? (
                <Radio className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Satellite className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              )}
              <span>{hoveredEntity.name}</span>
            </div>
            <div className="text-[11px] text-slate-300">
              <div>
                Lat/Lon: {hoveredEntity.latitude.toFixed(2)}°, {hoveredEntity.longitude.toFixed(2)}°
              </div>
              {hoveredEntity.altitude_km != null && (
                <div>Altitude: {hoveredEntity.altitude_km.toFixed(1)} km</div>
              )}
              {hoveredEntity.country && <div>Region: {hoveredEntity.country}</div>}
              {hoveredEntity.details && (
                <div className="text-[10px] text-sky-300">{hoveredEntity.details}</div>
              )}
            </div>
          </div>
        )}

        {/* Selected Target Card */}
        {livePosition && activeObj && (
          <div className="absolute bottom-3 right-3 z-20 bg-space-900/92 backdrop-blur-md border border-space-700 p-3 rounded-xl text-xs space-y-2 max-w-xs shadow-xl tabular-nums">
            <div className="flex items-center justify-between gap-2 border-b border-space-800 pb-1.5">
              <span className="font-sans font-semibold text-slate-100 truncate">
                {activeObj.name}
              </span>
              <span className="text-[10px] text-sky-300 px-1.5 py-0.5 rounded bg-space-950 border border-space-800 shrink-0">
                SGP4
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">SUB-LAT</span>
                <span className="text-slate-100 font-medium">{livePosition.latitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SUB-LON</span>
                <span className="text-slate-100 font-medium">{livePosition.longitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ALTITUDE</span>
                <span className="text-sky-300 font-medium">{livePosition.altitude_km.toFixed(1)} km</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">VELOCITY</span>
                <span className="text-emerald-300 font-medium">
                  {livePosition.velocity_km_s.toFixed(2)} km/s
                </span>
              </div>
            </div>
            <div className="pt-1.5 border-t border-space-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Coverage swath: {livePosition.footprint_radius_km.toFixed(0)} km</span>
            </div>
            {onOpenDetailsModal && (
              <button
                type="button"
                onClick={() => onOpenDetailsModal(activeObj)}
                className="w-full py-1.5 bg-space-950 hover:bg-space-800 text-sky-300 rounded-lg text-[11px] border border-space-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Inspect Object Telemetry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
