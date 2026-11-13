import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Crosshair,
  Globe,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  Sliders,
  X,
} from 'lucide-react';
import {
  Conjunction,
  GroundTrackResponse,
  ObjectType,
  OrbitalObject,
  OrbitalPosition,
  SystemStatistics,
  TrajectoryResponse,
} from '../types';
import { api } from '../services/api';
import * as satellite from 'satellite.js';
import {
  getOrbitalCanvasTexture,
  getOrbitalIconCategory,
  ICON_CATEGORIES,
  OrbitalIconCategory,
} from '../utils/orbitalIcons';
import { formatCountdownToUtc, formatUtcTime, parseUtcDate } from '../utils/utcTime';
import { SceneDensityControl } from '../components/SceneDensityControl';

interface SpaceViewProps {
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  stats?: SystemStatistics | null;
  swarmDensity?: number;
  onChangeSwarmDensity?: (density: number) => void;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction: (conj: Conjunction | null) => void;
  onOpenConjunctionDetails: (conj: Conjunction) => void;
  onNavigateTo2DTrack?: (conj: Conjunction) => void;
}

interface RenderSatEntry {
  satrec: any | null;
  pos: OrbitalPosition;
  norad_id: number;
  name: string;
  type: ObjectType;
}

const EARTH_RADIUS = 6.371; // 1 unit = 1000 km in 3D scene

const SimClockBadge: React.FC<{ simTimeRef: React.MutableRefObject<Date> }> = ({ simTimeRef }) => {
  const [label, setLabel] = useState<string>(() => formatUtcTime(simTimeRef.current));

  useEffect(() => {
    const id = window.setInterval(() => {
      setLabel(formatUtcTime(simTimeRef.current));
    }, 250);
    return () => window.clearInterval(id);
  }, [simTimeRef]);

  return (
    <div className="bg-space-900/90 backdrop-blur-md border border-space-700 px-3 py-1.5 rounded-lg font-mono text-xs text-slate-200 flex items-center gap-2 tabular-nums">
      <Clock className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
      <span>{label} UTC</span>
    </div>
  );
};

const SimHorizonSlider: React.FC<{
  simTimeRef: React.MutableRefObject<Date>;
  onJumpOffsetSeconds: (offsetSec: number) => void;
}> = ({ simTimeRef, onJumpOffsetSeconds }) => {
  const [offsetSec, setOffsetSec] = useState<number>(() =>
    Math.round((simTimeRef.current.getTime() - Date.now()) / 1000)
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const clamped = Math.max(
        -43200,
        Math.min(86400, Math.round((simTimeRef.current.getTime() - Date.now()) / 1000))
      );
      setOffsetSec(clamped);
    }, 300);
    return () => window.clearInterval(id);
  }, [simTimeRef]);

  return (
    <div className="flex items-center gap-2 flex-1 max-w-full md:max-w-md">
      <label htmlFor="sim-horizon-range" className="text-[11px] text-slate-400 whitespace-nowrap">
        EPOCH OFFSET
      </label>
      <input
        id="sim-horizon-range"
        type="range"
        min={-43200}
        max={86400}
        step={300}
        value={offsetSec}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setOffsetSec(val);
          onJumpOffsetSeconds(val);
        }}
        className="w-full h-1.5 bg-space-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
      />
      <span className="text-[11px] text-sky-300 font-medium whitespace-nowrap tabular-nums w-14 text-right">
        {offsetSec >= 0 ? '+' : ''}
        {(offsetSec / 3600).toFixed(1)}h
      </span>
    </div>
  );
};

function calculateMoonPosition(date: Date): THREE.Vector3 {
  // Simplified lunar ephemeris from Jean Meeus
  const JD = 2440587.5 + date.getTime() / 86400000;
  const T = (JD - 2451545.0) / 36525.0;
  
  // Mean elongation of the Moon
  const D = (297.8501921 + 445267.1114034 * T) % 360;
  // Sun's mean anomaly
  const M = (357.5291092 + 35999.0502909 * T) % 360;
  // Moon's mean anomaly  
  const Mp = (134.9633964 + 477198.8675055 * T) % 360;
  // Moon's mean longitude
  const L0 = (218.3164477 + 481267.88123421 * T) % 360;
  
  const toRad = Math.PI / 180;
  
  // Ecliptic longitude (simplified)
  const eclLon = (L0 + 6.289 * Math.sin(Mp * toRad)
    - 1.274 * Math.sin((2 * D - Mp) * toRad)
    + 0.658 * Math.sin(2 * D * toRad)
    - 0.214 * Math.sin(2 * Mp * toRad)
    - 0.186 * Math.sin(M * toRad)) * toRad;
    
  // Ecliptic latitude (simplified)
  const eclLat = (5.128 * Math.sin((93.272 + 483202.0175 * T) * toRad)) * toRad;
  
  // Obliquity of ecliptic
  const obliquity = 23.439 * toRad;
  
  // Convert ecliptic to equatorial
  const x = Math.cos(eclLat) * Math.cos(eclLon);
  const y = Math.cos(obliquity) * Math.cos(eclLat) * Math.sin(eclLon) - Math.sin(obliquity) * Math.sin(eclLat);
  const z = Math.sin(obliquity) * Math.cos(eclLat) * Math.sin(eclLon) + Math.cos(obliquity) * Math.sin(eclLat);
  
  // Scene distance (proportional — real is 384,400 km, Earth radius 6,371 km)
  const moonDistance = 60; // ~60 Earth radii in scene units
  return new THREE.Vector3(x * moonDistance, z * moonDistance, -y * moonDistance);
}

export const SpaceView: React.FC<SpaceViewProps> = ({
  objects,
  conjunctions,
  selectedObject,
  selectedConjunction,
  stats,
  swarmDensity: swarmDensityProp,
  onChangeSwarmDensity,
  onSelectObject,
  onSelectConjunction,
  onOpenConjunctionDetails,
  onNavigateTo2DTrack
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // UI State (LeoLabs Style Multi-Filter & Search Dock)
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(false);
  const [isRightPanelMinimized, setIsRightPanelMinimized] = useState<boolean>(true);
  const [rightPanelTab, setRightPanelTab] = useState<'ALERTS' | 'TELEMETRY'>('ALERTS');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<OrbitalObject[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState<boolean>(false);
  const [activeFleetFilter, setActiveFleetFilter] = useState<string>('ALL');
  const [altitudeFilter, setAltitudeFilter] = useState<string>('ALL');
  const [isDebrisMode, setIsDebrisMode] = useState<boolean>(false);
  const [isFollowMode, setIsFollowMode] = useState<boolean>(false);
  const [showGroundTrack, setShowGroundTrack] = useState<boolean>(true);
  const [showOrbitRings, setShowOrbitRings] = useState<boolean>(true);
  const [localSwarmDensity, setLocalSwarmDensity] = useState<number>(3000);
  const swarmDensity = swarmDensityProp !== undefined ? swarmDensityProp : localSwarmDensity;
  const setSwarmDensity = onChangeSwarmDensity ?? setLocalSwarmDensity;
  const [isFetchingDensity, setIsFetchingDensity] = useState<boolean>(false);
  const [renderedNodeCount, setRenderedNodeCount] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut '/' to focus search, and 'Escape' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        // Prevent typing '/' into another field if already typing
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        setSearchSuggestions([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced live suggestions from full 32,282 catalog API
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingCatalog(true);
        const res = await api.getPaginatedObjects(1, 8, searchQuery.trim());
        if (res && res.items) {
          setSearchSuggestions(res.items);
        }
      } catch (err) {
        console.debug('Search suggestion error:', err);
      } finally {
        setIsSearchingCatalog(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync right panel tab on selected object
  useEffect(() => {
    if (selectedObject) {
      setRightPanelTab('TELEMETRY');
      setIsRightPanelMinimized(false);
    }
  }, [selectedObject]);

  // Simulation Epoch State (1X real-time default)
  const [simEpochVersion, setSimEpochVersion] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [trajectoryHours, setTrajectoryHours] = useState<number>(12);

  // Ephemeris State
  const [positions, setPositions] = useState<OrbitalPosition[]>([]);
  const [selectedPos, setSelectedPos] = useState<OrbitalPosition | null>(null);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryResponse | null>(null);
  const [_groundTrackData, setGroundTrackData] = useState<GroundTrackResponse | null>(null);

  // Hover Tooltip State
  const [hoveredObject, setHoveredObject] = useState<{
    name: string;
    norad_id: number;
    type: string;
    category: OrbitalIconCategory;
    badge: string;
    categoryLabel: string;
    alt_km: number;
    velocity_km_s: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Fleet & Regime Counts (without double-adding stats + sample objects)
  const fleetCounts = useMemo(() => {
    if (stats?.fleet_breakdown) {
      return stats.fleet_breakdown;
    }

    const all = stats?.tracked_objects || objects.length;
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

    objects.forEach((o) => {
      const cat = getOrbitalIconCategory(o.name, o.object_type, o.norad_id);
      const apogee = o.apogee_km || o.perigee_km || 0;

      if (cat === 'DEBRIS') debris++;
      else if (cat === 'ROCKET') rocket++;
      else if (cat === 'GPS') gps++;
      else if (cat === 'STARLINK') starlink++;
      else if (cat === 'ONEWEB') oneweb++;
      else if (cat === 'ISS') iss++;
      else payload++;

      if (apogee <= 2000) leoCount++;
      else if (apogee < 35000) meoCount++;
      else geoCount++;
    });

    return {
      all,
      operational: stats?.active_satellites ?? payload,
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
  }, [objects, stats]);

  // Mutable Refs for 60 FPS Animation (decoupled from React renders)
  const positionsRef = useRef<OrbitalPosition[]>([]);
  const livePositionsRef = useRef<OrbitalPosition[]>([]);
  const visiblePositionsRef = useRef<OrbitalPosition[]>([]);
  const objectsRef = useRef<OrbitalObject[]>([]);
  const isFollowModeRef = useRef<boolean>(false);
  const selectedPosRef = useRef<OrbitalPosition | null>(null);
  const selectedObjectRef = useRef<OrbitalObject | null>(null);
  const selectedConjunctionRef = useRef<Conjunction | null>(null);
  const activeFleetFilterRef = useRef<string>('ALL');
  const altitudeFilterRef = useRef<string>('ALL');
  const isDebrisModeRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(true);
  const simSpeedRef = useRef<number>(1);

  positionsRef.current = positions;
  objectsRef.current = objects;
  isFollowModeRef.current = isFollowMode;
  selectedObjectRef.current = selectedObject;
  selectedConjunctionRef.current = selectedConjunction;
  activeFleetFilterRef.current = activeFleetFilter;
  altitudeFilterRef.current = altitudeFilter;
  isDebrisModeRef.current = isDebrisMode;
  isPlayingRef.current = isPlaying;
  simSpeedRef.current = simSpeed;

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);

  const debrisMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const satMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const starlinkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const onewebMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rocketMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const gpsMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const issMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const targetReticleRef = useRef<THREE.Mesh | null>(null);

  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const groundTrackLineRef = useRef<THREE.Line | null>(null);
  const conjLineRef = useRef<THREE.Line | null>(null);
  const orbitRingsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const simTimeRef = useRef<Date>(new Date());
  const swarmDensityRef = useRef<number>(swarmDensity);
  swarmDensityRef.current = swarmDensity;

  const satrecMapRef = useRef<Map<number, { satrec: any; name: string; type: ObjectType; norad_id: number }>>(
    new Map()
  );
  const satrecCacheRef = useRef<Map<number, { tle1: string; tle2: string; satrec: any }>>(new Map());
  const orderedSwarmRef = useRef<RenderSatEntry[]>([]);
  const masterPoolRef = useRef<RenderSatEntry[]>([]);
  const hasFullPoolRef = useRef<boolean>(false);
  const hasBatchPositionsRef = useRef<boolean>(false);
  const propCursorRef = useRef<number>(0);
  const lastReportedNodeCountRef = useRef<number>(-1);
  const lastRenderCountSyncMsRef = useRef<number>(0);

  const getOrParseSatrec = (noradId: number, tle1?: string | null, tle2?: string | null) => {
    if (!tle1 || !tle2) return null;
    const cached = satrecCacheRef.current.get(noradId);
    if (cached && cached.tle1 === tle1 && cached.tle2 === tle2) {
      return cached.satrec;
    }
    try {
      const satrec = satellite.twoline2satrec(tle1, tle2);
      if (satrec && (satrec as any).error === 0) {
        satrecCacheRef.current.set(noradId, { tle1, tle2, satrec });
        return satrec;
      }
    } catch {
      // Ignore malformed TLE
    }
    return null;
  };

  // Sync selectedPos cleanly without triggering a 3,000-object batch fetch
  useEffect(() => {
    if (!selectedObject) {
      setSelectedPos(null);
      selectedPosRef.current = null;
      return;
    }
    const existing = livePositionsRef.current.find((p) => p.norad_id === selectedObject.norad_id);
    if (existing) {
      setSelectedPos(existing);
      selectedPosRef.current = existing;
    } else {
      const id = window.setInterval(() => {
        if (selectedPosRef.current && selectedPosRef.current.norad_id === selectedObject.norad_id) {
          setSelectedPos({ ...selectedPosRef.current });
        }
      }, 1000);
      return () => window.clearInterval(id);
    }
    const telemetryTimer = window.setInterval(() => {
      if (selectedPosRef.current && selectedPosRef.current.norad_id === selectedObject.norad_id) {
        setSelectedPos({ ...selectedPosRef.current });
      }
    }, 1000);
    return () => window.clearInterval(telemetryTimer);
  }, [selectedObject]);

  // Parse Real Two-Line Elements (TLEs) into SGP4 Satrec lookup cache
  useEffect(() => {
    if (objects && objects.length > 0) {
      const seedEntries: RenderSatEntry[] = [];
      objects.forEach((obj) => {
        const satrec = getOrParseSatrec(obj.norad_id, obj.tle_line1, obj.tle_line2);
        if (satrec) {
          satrecMapRef.current.set(obj.norad_id, {
            satrec,
            name: obj.name,
            type: obj.object_type,
            norad_id: obj.norad_id,
          });
          if (!hasBatchPositionsRef.current) {
            seedEntries.push({
              satrec,
              norad_id: obj.norad_id,
              name: obj.name,
              type: obj.object_type,
              pos: {
                timestamp: simTimeRef.current.toISOString(),
                norad_id: obj.norad_id,
                name: obj.name,
                type: obj.object_type,
                x_km: 6771,
                y_km: 0,
                z_km: 0,
                vx_km_s: 0,
                vy_km_s: 7.5,
                vz_km_s: 0,
                alt_km: obj.apogee_km || obj.perigee_km || 500,
                velocity_km_s: 7.5,
                lat: 0,
                lon: 0,
              },
            });
          }
        }
      });
      if (!hasBatchPositionsRef.current && seedEntries.length > 0) {
        orderedSwarmRef.current = seedEntries;
        lastReportedNodeCountRef.current = -1;
      }
    }
  }, [objects]);

  // Force immediate rendered node readout update when density or visibility filters change
  useEffect(() => {
    lastReportedNodeCountRef.current = -1;
  }, [swarmDensity, activeFleetFilter, altitudeFilter, isDebrisMode]);

  // Fetch Batch Ephemeris Positions when swarmDensity changes (with immediate cache slice & abort)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const poolCoversTarget =
      masterPoolRef.current.length > 0 &&
      ((swarmDensity === 0 && hasFullPoolRef.current) ||
        (swarmDensity > 0 && masterPoolRef.current.length >= swarmDensity));

    if (poolCoversTarget) {
      orderedSwarmRef.current = masterPoolRef.current;
      propCursorRef.current = 0;
      lastReportedNodeCountRef.current = -1;
      const sliced =
        swarmDensity === 0
          ? masterPoolRef.current.map((e) => e.pos)
          : masterPoolRef.current.slice(0, swarmDensity).map((e) => e.pos);
      setPositions(sliced);
      livePositionsRef.current = sliced;
    }

    const fetchPositions = async (showSpinner: boolean) => {
      if (showSpinner && isMounted) {
        setIsFetchingDensity(true);
      }
      try {
        const batch = await api.getBatchPositions(
          simTimeRef.current.toISOString(),
          swarmDensity,
          controller.signal
        );
        if (!isMounted || !batch.positions) return;

        const nextEntries: RenderSatEntry[] = batch.positions.map((p: OrbitalPosition) => {
          const satrec = getOrParseSatrec(p.norad_id, p.tle_line1, p.tle_line2);
          if (satrec) {
            satrecMapRef.current.set(p.norad_id, {
              satrec,
              name: p.name,
              type: p.type,
              norad_id: p.norad_id,
            });
          }
          return {
            satrec,
            pos: { ...p },
            norad_id: p.norad_id,
            name: p.name,
            type: p.type,
          };
        });

        hasBatchPositionsRef.current = true;
        orderedSwarmRef.current = nextEntries;
        propCursorRef.current = 0;
        lastReportedNodeCountRef.current = -1;

        if (swarmDensity === 0 || nextEntries.length >= masterPoolRef.current.length) {
          masterPoolRef.current = nextEntries;
          if (swarmDensity === 0) hasFullPoolRef.current = true;
        }

        setPositions(batch.positions);
        livePositionsRef.current = batch.positions.map((p: OrbitalPosition) => ({ ...p }));
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Failed to fetch batch positions:', err);
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

  // Fetch Trajectory & Ground Track on Selected Object Change
  useEffect(() => {
    if (!selectedObject) {
      setTrajectoryData(null);
      setGroundTrackData(null);
      return;
    }

    let isMounted = true;
    const fetchEphemerisDetails = async () => {
      try {
        if (!selectedObject.tle_line1 || !selectedObject.tle_line2) {
          try {
            const details = await api.getObjectDetails(selectedObject.norad_id);
            if (isMounted && details && details.tle_line1 && details.tle_line2) {
              const satrec = satellite.twoline2satrec(details.tle_line1, details.tle_line2);
              if (satrec && (satrec as any).error === 0) {
                satrecMapRef.current.set(details.norad_id, {
                  satrec,
                  name: details.name,
                  type: details.object_type,
                  norad_id: details.norad_id,
                });
              }
            }
          } catch {}
        }

        const isoNow = simTimeRef.current.toISOString();
        const traj = await api.getObjectTrajectory(
          selectedObject.norad_id,
          trajectoryHours,
          5,
          isoNow
        );
        if (isMounted) setTrajectoryData(traj);

        if (showGroundTrack) {
          const track = await api.getObjectGroundTrack(selectedObject.norad_id, 180, 2, isoNow);
          if (isMounted) setGroundTrackData(track);
        }
      } catch (err) {
        console.error('Failed to fetch detailed trajectory/ground track:', err);
      }
    };

    fetchEphemerisDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedObject, trajectoryHours, showGroundTrack, simEpochVersion]);

  // Initialize Three.js WebGL Scene (LeoLabs Aesthetics)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2500
    );
    camera.position.set(0, 11, 27);
    cameraRef.current = camera;

    // 3. WebGL Renderer with ACES Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = EARTH_RADIUS + 0.3;
    controls.maxDistance = 300;
    controls.rotateSpeed = 0.7;
    controlsRef.current = controls;

    // 5. Deep Space High-Density Starfield
    const starGeom = new THREE.BufferGeometry();
    const starCount = 5000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 700 + Math.random() * 350;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = radius * Math.cos(phi);

      const tint = 0.85 + Math.random() * 0.15;
      starColors[i] = tint;
      starColors[i + 1] = tint * 0.95;
      starColors[i + 2] = tint * 1.15;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starGeom, starMat));

    // 6. Real Sun Mesh & Directional Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const sunGeom = new THREE.SphereGeometry(2.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff6d6 });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    const ambLight = new THREE.AmbientLight(0x283b5e, 0.48);
    scene.add(ambLight);

    // 7. LeoLabs Photorealistic Live Earth Textures (STATIONARY GLOBE)
    const texLoader = new THREE.TextureLoader();
    const dayTexture = texLoader.load('/textures/earth_day.jpg');
    const nightTexture = texLoader.load('/textures/earth_night.jpg');

    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 worldNormal = normalize(vWorldPosition);
          float cosine = dot(worldNormal, normalize(sunDirection));
          float dayMix = smoothstep(-0.25, 0.35, cosine);
          
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          
          // Realistic Night: city lights + ambient oceanic & land relief
          vec3 nightAmbient = dayColor.rgb * 0.30 + nightColor.rgb * 1.8;
          vec3 finalColor = mix(nightAmbient, dayColor.rgb * 1.25, dayMix);
          
          // Atmospheric Rayleigh blue limb scattering
          float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
          finalColor += vec3(0.08, 0.65, 1.0) * pow(rim, 3.0) * 0.6;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMesh = new THREE.Mesh(earthGeom, earthShaderMat);
    earthMesh.rotation.y = -Math.PI / 2; // Precise WGS84 ECEF Prime Meridian alignment
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 8. High-Altitude Atmospheric Cloud Layer
    const cloudsTexture = texLoader.load('/textures/earth_clouds.jpg');
    const cloudsGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const cloudMesh = new THREE.Mesh(cloudsGeom, cloudsMat);
    cloudMesh.rotation.y = -Math.PI / 2;
    scene.add(cloudMesh);

    // 9. Atmospheric Rayleigh Outer Glow Shell
    const atmosGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.04, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeom, atmosMat));

    // 10. Lunar Satellite Body
    const moonTexture = texLoader.load('/textures/moon.jpg');
    const moonGeom = new THREE.SphereGeometry(1.737, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.9 });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    scene.add(moonMesh);
    // Moon position is updated in the animation loop via calculateMoonPosition()
    if (moonMeshRef) moonMeshRef.current = moonMesh;

    // 11. Reference Equatorial & Altitude Orbital Rings
    const ringsGroup = new THREE.Group();
    const ringRadii = [EARTH_RADIUS + 0.5, EARTH_RADIUS + 1.2, EARTH_RADIUS + 2.0, EARTH_RADIUS + 10.0, EARTH_RADIUS + 35.786];
    ringRadii.forEach((rad) => {
      const ringGeom = new THREE.BufferGeometry();
      const ringPts: THREE.Vector3[] = [];
      for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        ringPts.push(new THREE.Vector3(rad * Math.cos(a), 0, rad * Math.sin(a)));
      }
      ringGeom.setFromPoints(ringPts);
      const ringMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.14 });
      ringsGroup.add(new THREE.Line(ringGeom, ringMat));
    });

    // Altitude Reference Rings (ISS, Starlink, Sun-sync, MEO, GEO)
    const ringDefs = [
      { alt: 420, color: 0x38bdf8 },
      { alt: 550, color: 0x8b5cf6 },
      { alt: 800, color: 0x0ea5e9 },
      { alt: 20200, color: 0x3b82f6 },
      { alt: 35786, color: 0xeab308 },
    ];
    ringDefs.forEach(({ alt, color }) => {
      const ringRadius = EARTH_RADIUS + alt / 1000;
      const ringGeom = new THREE.RingGeometry(ringRadius - 0.015, ringRadius + 0.015, 128);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ringsGroup.add(ring);
    });

    // LEO Density Shell Reference (850 km)
    const leoShellGeom = new THREE.SphereGeometry(EARTH_RADIUS + 0.85, 64, 32);
    const leoShellMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.03,
      wireframe: true,
    });
    ringsGroup.add(new THREE.Mesh(leoShellGeom, leoShellMat));

    // Geostationary Ring Belt Volume (GEO)
    const geoRingGeom = new THREE.RingGeometry(EARTH_RADIUS + 35.5, EARTH_RADIUS + 36.1, 128);
    const geoRingMat = new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    const geoRing = new THREE.Mesh(geoRingGeom, geoRingMat);
    geoRing.rotation.x = -Math.PI / 2;
    ringsGroup.add(geoRing);

    scene.add(ringsGroup);
    orbitRingsGroupRef.current = ringsGroup;

    // 12. HIGH-PERFORMANCE BILLBOARD INSTANCED MESHES (Vector-Crisp Icon Notations):
    // Creates camera-aligned billboard quads so every icon always faces the operator perfectly
    const createBillboardMaterial = (texture: THREE.CanvasTexture): THREE.MeshBasicMaterial => {
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.01,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
      });

      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `
          #ifdef USE_INSTANCING
            vec4 instanceCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec4 mvPosition = modelViewMatrix * instanceCenter;
            float scaleX = length(vec3(instanceMatrix[0].xyz));
            float scaleY = length(vec3(instanceMatrix[1].xyz));
            mvPosition.xy += transformed.xy * vec2(scaleX, scaleY) * 0.45;
            gl_Position = projectionMatrix * mvPosition;
          #else
            vec4 mvPosition = vec4( transformed, 1.0 );
            mvPosition = modelViewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
          #endif
          `
        );
      };

      return mat;
    };

    const maxInst = 25000;
    const quadGeom = new THREE.PlaneGeometry(1.0, 1.0);

    const createCategoryMesh = (
      category: OrbitalIconCategory,
      targetRef: React.MutableRefObject<THREE.InstancedMesh | null>
    ) => {
      const tex = getOrbitalCanvasTexture(category, 128);
      const mat = createBillboardMaterial(tex);
      const mesh = new THREE.InstancedMesh(quadGeom, mat, maxInst);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      scene.add(mesh);
      targetRef.current = mesh;
      return mesh;
    };

    createCategoryMesh('PAYLOAD', satMeshRef);
    createCategoryMesh('STARLINK', starlinkMeshRef);
    createCategoryMesh('ONEWEB', onewebMeshRef);
    createCategoryMesh('GPS', gpsMeshRef);
    createCategoryMesh('DEBRIS', debrisMeshRef);
    createCategoryMesh('ROCKET', rocketMeshRef);
    createCategoryMesh('ISS', issMeshRef);

    // H) Target Lock HUD Reticle Marker
    const targetTex = getOrbitalCanvasTexture('TARGET', 128);
    const targetMat = new THREE.MeshBasicMaterial({
      map: targetTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const targetMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), targetMat);
    targetMesh.visible = false;
    scene.add(targetMesh);
    targetReticleRef.current = targetMesh;

    // Pre-allocated helpers to eliminate per-frame heap pressure
    const dummy = new THREE.Object3D();
    const rayTempVec = new THREE.Vector3();
    const camFollowTarget = new THREE.Vector3();
    const camFollowOffset = new THREE.Vector3();
    const reticleVec = new THREE.Vector3();
    const sunDirECEF = new THREE.Vector3();

    // Screen-Space Distance Hit Tester (Works cleanly across all instanced icons)
    const findClosestDot = (clientX: number, clientY: number, maxScreenDistPx: number = 28) => {
      if (!camera || !renderer || visiblePositionsRef.current.length === 0) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      let closest: { pos: OrbitalPosition; dist: number } | null = null;

      for (const pos of visiblePositionsRef.current) {
        rayTempVec.set(pos.x_km / 1000, pos.z_km / 1000, -pos.y_km / 1000);
        rayTempVec.project(camera);

        if (rayTempVec.z > 1.0) continue;

        const sx = (rayTempVec.x * 0.5 + 0.5) * w;
        const sy = (-(rayTempVec.y * 0.5) + 0.5) * h;

        const dx = mouseX - sx;
        const dy = mouseY - sy;
        const dPx = Math.sqrt(dx * dx + dy * dy);

        if (dPx <= maxScreenDistPx) {
          if (!closest || dPx < closest.dist) {
            closest = { pos, dist: dPx };
          }
        }
      }

      return closest;
    };

    const handlePointerMove = (e: MouseEvent) => {
      const match = findClosestDot(e.clientX, e.clientY, 24);
      if (match) {
        const cat = getOrbitalIconCategory(match.pos.name, match.pos.type, match.pos.norad_id);
        const meta = ICON_CATEGORIES[cat] || ICON_CATEGORIES.PAYLOAD;
        setHoveredObject({
          name: match.pos.name || `NORAD #${match.pos.norad_id}`,
          norad_id: match.pos.norad_id,
          type: (match.pos.type || 'ACTIVE_SATELLITE').replace('_', ' '),
          category: cat,
          badge: meta.badge,
          categoryLabel: meta.label,
          alt_km: match.pos.alt_km,
          velocity_km_s: match.pos.velocity_km_s,
          screenX: e.clientX,
          screenY: e.clientY,
        });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredObject(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleCanvasDblClick = async (e: MouseEvent) => {
      const match = findClosestDot(e.clientX, e.clientY, 32);
      if (match) {
        const p = match.pos;
        const found = objectsRef.current.find((o) => o.norad_id === p.norad_id);
        const stubObj: OrbitalObject = found || {
          id: p.norad_id,
          norad_id: p.norad_id,
          name: p.name || `NORAD #${p.norad_id}`,
          object_type: (p.type as any) || 'ACTIVE_SATELLITE',
          source: 'CelesTrak GP',
          source_group: 'live_ephemeris',
          tle_line1: '',
          tle_line2: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        onSelectObject(stubObj);
        setSelectedPos(p);
        selectedPosRef.current = p;

        try {
          const fullDetails = await api.getObjectDetails(p.norad_id);
          if (fullDetails) {
            onSelectObject(fullDetails);
          }
        } catch {}
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('dblclick', handleCanvasDblClick);

    const clock = new THREE.Clock();
    let tumbleAngle = 0;
    let lastSolarUpdateMs = 0;

    const updateCelestialLighting = (simDate: Date) => {
      const dayOfYear = Math.floor(
        (simDate.getTime() - new Date(simDate.getUTCFullYear(), 0, 0).getTime()) / 86400000
      );
      const hour =
        simDate.getUTCHours() + simDate.getUTCMinutes() / 60 + simDate.getUTCSeconds() / 3600;
      const sunDecRad = (-23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10)) * Math.PI) / 180;
      const sunLonRad = (((12.0 - hour) * 15.0) * Math.PI) / 180;

      sunDirECEF
        .set(
          Math.cos(sunDecRad) * Math.sin(sunLonRad),
          Math.sin(sunDecRad),
          Math.cos(sunDecRad) * Math.cos(sunLonRad)
        )
        .normalize();

      if (sunLightRef.current) {
        sunLightRef.current.position.copy(sunDirECEF).multiplyScalar(150);
      }
      if (sunMeshRef.current) {
        sunMeshRef.current.position.copy(sunDirECEF).multiplyScalar(150);
      }
      if (earthMeshRef.current) {
        const shaderMat = earthMeshRef.current.material as THREE.ShaderMaterial;
        if (shaderMat.uniforms?.sunDirection) {
          shaderMat.uniforms.sunDirection.value.copy(sunDirECEF);
        }
      }
      if (moonMeshRef.current) {
        moonMeshRef.current.position.copy(calculateMoonPosition(simDate));
      }
    };

    updateCelestialLighting(simTimeRef.current);

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();

      const delta = Math.min(0.1, clock.getDelta());
      tumbleAngle += delta * 2.5;

      if (cloudMesh) {
        cloudMesh.rotation.y += delta * 0.015;
      }

      if (isPlayingRef.current && simTimeRef.current) {
        const advanceMs = delta * 1000 * (simSpeedRef.current || 1);
        simTimeRef.current = new Date(simTimeRef.current.getTime() + advanceMs);
      }
      const currentSimDate = simTimeRef.current || new Date();

      const nowWall = performance.now();
      if (nowWall - lastSolarUpdateMs > 400) {
        lastSolarUpdateMs = nowWall;
        updateCelestialLighting(currentSimDate);
      }

      const gmst = satellite.gstime(currentSimDate);
      const currentVisible: OrbitalPosition[] = [];

      const activeFleet = activeFleetFilterRef.current;
      const activeAlt = altitudeFilterRef.current;
      const debrisOnly = isDebrisModeRef.current;
      const selObj = selectedObjectRef.current;
      const selConj = selectedConjunctionRef.current;

      let satIdx = 0;
      let starlinkIdx = 0;
      let onewebIdx = 0;
      let gpsIdx = 0;
      let debrisIdx = 0;
      let rocketIdx = 0;
      let issIdx = 0;

      const pushVisibleMatrix = (pos: OrbitalPosition) => {
        const cat = getOrbitalIconCategory(pos.name, pos.type, pos.norad_id);

        if (debrisOnly && cat !== 'DEBRIS') return;
        if (activeFleet === 'STARLINK' && cat !== 'STARLINK') return;
        if (activeFleet === 'ONEWEB' && cat !== 'ONEWEB') return;
        if (activeFleet === 'GPS' && cat !== 'GPS') return;
        if (activeFleet === 'DEBRIS' && cat !== 'DEBRIS') return;
        if (activeFleet === 'PAYLOAD' && cat !== 'PAYLOAD' && cat !== 'ISS') return;
        if (activeFleet === 'ROCKET' && cat !== 'ROCKET') return;
        if (activeFleet === 'ISS' && cat !== 'ISS') return;

        if (activeAlt === 'LEO' && pos.alt_km > 2000) return;
        if (activeAlt === 'MEO' && (pos.alt_km <= 2000 || pos.alt_km > 20000)) return;
        if (activeAlt === 'GEO' && pos.alt_km <= 20000) return;

        currentVisible.push(pos);

        dummy.position.set(pos.x_km / 1000, pos.z_km / 1000, -pos.y_km / 1000);
        const isSelected = selObj?.norad_id === pos.norad_id;
        const isConjunctionA =
          selConj &&
          (pos.norad_id === selConj.object_a?.norad_id || pos.norad_id === selConj.object_a_id);
        const isConjunctionB =
          selConj &&
          (pos.norad_id === selConj.object_b?.norad_id || pos.norad_id === selConj.object_b_id);

        let scale = 0.88;
        if (cat === 'DEBRIS') scale = 0.78;
        else if (cat === 'ROCKET' || cat === 'GPS') scale = 0.96;
        else if (cat === 'ISS') scale = 1.35;

        if (isSelected) scale = 2.4;
        if (isConjunctionA || isConjunctionB) scale = 2.6;

        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        if (cat === 'DEBRIS') {
          if (debrisMeshRef.current && debrisIdx < maxInst) {
            debrisMeshRef.current.setMatrixAt(debrisIdx++, dummy.matrix);
          }
        } else if (cat === 'ROCKET') {
          if (rocketMeshRef.current && rocketIdx < maxInst) {
            rocketMeshRef.current.setMatrixAt(rocketIdx++, dummy.matrix);
          }
        } else if (cat === 'GPS') {
          if (gpsMeshRef.current && gpsIdx < maxInst) {
            gpsMeshRef.current.setMatrixAt(gpsIdx++, dummy.matrix);
          }
        } else if (cat === 'STARLINK') {
          if (starlinkMeshRef.current && starlinkIdx < maxInst) {
            starlinkMeshRef.current.setMatrixAt(starlinkIdx++, dummy.matrix);
          }
        } else if (cat === 'ONEWEB') {
          if (onewebMeshRef.current && onewebIdx < maxInst) {
            onewebMeshRef.current.setMatrixAt(onewebIdx++, dummy.matrix);
          }
        } else if (cat === 'ISS') {
          if (issMeshRef.current && issIdx < maxInst) {
            issMeshRef.current.setMatrixAt(issIdx++, dummy.matrix);
          }
        } else if (satMeshRef.current && satIdx < maxInst) {
          satMeshRef.current.setMatrixAt(satIdx++, dummy.matrix);
        }

        if (isSelected) {
          selectedPosRef.current = pos;
        }
      };

      const propagateEntry = (
        satrec: any,
        noradId: number,
        name: string,
        type: ObjectType
      ): OrbitalPosition | null => {
        if (!satrec) return null;
        try {
          const pv = satellite.propagate(satrec, currentSimDate);
          if (!pv || !pv.position || typeof pv.position === 'boolean') return null;

          const pEci = pv.position;
          const vEci = pv.velocity;
          const ecf = satellite.eciToEcf(pEci, gmst);
          const geodetic = satellite.eciToGeodetic(pEci, gmst);

          let vx = 0;
          let vy = 0;
          let vz = 0;
          let vSpeed = 0;
          if (vEci && typeof vEci !== 'boolean') {
            vx = vEci.x;
            vy = vEci.y;
            vz = vEci.z;
            vSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);
          }

          return {
            timestamp: currentSimDate.toISOString(),
            norad_id: noradId,
            name,
            type,
            x_km: ecf.x,
            y_km: ecf.y,
            z_km: ecf.z,
            vx_km_s: vx,
            vy_km_s: vy,
            vz_km_s: vz,
            alt_km: Math.max(120, geodetic.height),
            velocity_km_s: vSpeed,
            lat: satellite.degreesLat(geodetic.latitude),
            lon: satellite.degreesLong(geodetic.longitude),
          };
        } catch {
          return null;
        }
      };

      const pool = orderedSwarmRef.current;
      const densityLimit = swarmDensityRef.current;
      const cap = densityLimit === 0 ? pool.length : Math.min(densityLimit, pool.length);

      let selDrawn = !selObj;
      let conjADrawn = !selConj;
      let conjBDrawn = !selConj;

      if (cap > 0) {
        if (cap <= 5000) {
          for (let i = 0; i < cap; i++) {
            const entry = pool[i];
            const propagated = propagateEntry(entry.satrec, entry.norad_id, entry.name, entry.type);
            if (propagated) {
              entry.pos = propagated;
            }
          }
        } else {
          // Time-sliced SGP4 propagation preserves 60 FPS even with 22k+ objects in All mode
          const batchBudget = simSpeedRef.current > 10 ? 6000 : 4000;
          let cursor = propCursorRef.current % cap;
          for (let step = 0; step < batchBudget; step++) {
            const entry = pool[cursor];
            const propagated = propagateEntry(entry.satrec, entry.norad_id, entry.name, entry.type);
            if (propagated) {
              entry.pos = propagated;
            }
            cursor = (cursor + 1) % cap;
          }
          propCursorRef.current = cursor;
        }

        for (let i = 0; i < cap; i++) {
          const entry = pool[i];
          if (selObj && entry.norad_id === selObj.norad_id) {
            selDrawn = true;
            if (cap > 5000) {
              const pinned = propagateEntry(entry.satrec, entry.norad_id, entry.name, entry.type);
              if (pinned) entry.pos = pinned;
            }
          }
          if (
            selConj &&
            (entry.norad_id === selConj.object_a?.norad_id || entry.norad_id === selConj.object_a_id)
          ) {
            conjADrawn = true;
          }
          if (
            selConj &&
            (entry.norad_id === selConj.object_b?.norad_id || entry.norad_id === selConj.object_b_id)
          ) {
            conjBDrawn = true;
          }
          pushVisibleMatrix(entry.pos);
        }
      } else if (livePositionsRef.current.length > 0) {
        const fallbackCap =
          densityLimit === 0
            ? livePositionsRef.current.length
            : Math.min(densityLimit, livePositionsRef.current.length);
        for (let i = 0; i < fallbackCap; i++) {
          pushVisibleMatrix(livePositionsRef.current[i]);
        }
      }

      // Ensure pinned target/conjunction objects remain visible even when outside a Lite/Standard cap
      const pushPinnedNorad = (noradId?: number | null) => {
        if (!noradId) return;
        const item = satrecMapRef.current.get(noradId);
        if (!item) return;
        const p = propagateEntry(item.satrec, item.norad_id, item.name, item.type);
        if (p) pushVisibleMatrix(p);
      };
      if (!selDrawn && selObj) pushPinnedNorad(selObj.norad_id);
      if (!conjADrawn && selConj) pushPinnedNorad(selConj.object_a?.norad_id ?? selConj.object_a_id);
      if (!conjBDrawn && selConj) pushPinnedNorad(selConj.object_b?.norad_id ?? selConj.object_b_id);

      visiblePositionsRef.current = currentVisible;
      if (
        currentVisible.length !== lastReportedNodeCountRef.current &&
        (lastReportedNodeCountRef.current === -1 || nowWall - lastRenderCountSyncMsRef.current >= 120)
      ) {
        lastReportedNodeCountRef.current = currentVisible.length;
        lastRenderCountSyncMsRef.current = nowWall;
        setRenderedNodeCount(currentVisible.length);
      }

      const updateMesh = (mesh: THREE.InstancedMesh | null, count: number) => {
        if (!mesh) return;
        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;
      };
      updateMesh(satMeshRef.current, satIdx);
      updateMesh(starlinkMeshRef.current, starlinkIdx);
      updateMesh(onewebMeshRef.current, onewebIdx);
      updateMesh(gpsMeshRef.current, gpsIdx);
      updateMesh(debrisMeshRef.current, debrisIdx);
      updateMesh(rocketMeshRef.current, rocketIdx);
      updateMesh(issMeshRef.current, issIdx);

      if (targetReticleRef.current) {
        if (selectedPosRef.current && cameraRef.current) {
          const sp = selectedPosRef.current;
          reticleVec.set(sp.x_km / 1000, sp.z_km / 1000, -sp.y_km / 1000);
          targetReticleRef.current.visible = true;
          targetReticleRef.current.position.copy(reticleVec);
          targetReticleRef.current.quaternion.copy(cameraRef.current.quaternion);
          targetReticleRef.current.rotateZ(tumbleAngle * 0.5);
        } else {
          targetReticleRef.current.visible = false;
        }
      }

      if (isFollowModeRef.current && selectedPosRef.current && controlsRef.current && cameraRef.current) {
        const sp = selectedPosRef.current;
        camFollowTarget.set(sp.x_km / 1000, sp.z_km / 1000, -sp.y_km / 1000);
        camFollowOffset.copy(cameraRef.current.position).sub(controlsRef.current.target);
        controlsRef.current.target.copy(camFollowTarget);
        cameraRef.current.position.copy(camFollowTarget).add(camFollowOffset);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', handlePointerMove);
        renderer.domElement.removeEventListener('dblclick', handleCanvasDblClick);
      }
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as any).geometry) {
          (obj as any).geometry.dispose();
        }
        const mat = (obj as any).material;
        if (mat) {
          const mats = Array.isArray(mat) ? mat : [mat];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      dayTexture.dispose();
      nightTexture.dispose();
      cloudsTexture.dispose();
      moonTexture.dispose();
      renderer.dispose();
    };
  }, []);

  // Toggle Orbit Reference Rings
  useEffect(() => {
    if (orbitRingsGroupRef.current) {
      orbitRingsGroupRef.current.visible = showOrbitRings;
    }
  }, [showOrbitRings]);

  // Update Trajectory Ribbon for Selected Object (LeoLabs Glowing Track)
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (trajectoryLineRef.current) {
      scene.remove(trajectoryLineRef.current);
      trajectoryLineRef.current.geometry.dispose();
      trajectoryLineRef.current = null;
    }

    if (!selectedObject) return;

    let pts: THREE.Vector3[] = [];
    const currentSimDate = simTimeRef.current || new Date();
    const gmstNow = satellite.gstime(currentSimDate);

    // 1. Direct client-side SGP4 orbital propagation for 100% position lock & zero latency
    let satrec = satrecMapRef.current.get(selectedObject.norad_id)?.satrec;
    if (!satrec && selectedObject.tle_line1 && selectedObject.tle_line2) {
      try {
        const parsed = satellite.twoline2satrec(selectedObject.tle_line1, selectedObject.tle_line2);
        if (parsed && (parsed as any).error === 0) satrec = parsed;
      } catch (e) {}
    }

    if (satrec && !(satrec as any).error) {
      const meanMotionRadMin = satrec.no_kozai || satrec.no_unkozai || 0.06;
      const periodMinutes = Math.max(10, Math.min(1440, (2 * Math.PI) / meanMotionRadMin));
      const totalDurationMinutes = Math.max(periodMinutes, trajectoryHours * 60);
      const numSteps = 240;

      for (let i = 0; i <= numSteps; i++) {
        const tOffsetMs = (i / numSteps) * totalDurationMinutes * 60 * 1000;
        const pointDate = new Date(currentSimDate.getTime() + tOffsetMs);
        const pv = satellite.propagate(satrec, pointDate);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const ecf = satellite.eciToEcf(pv.position, gmstNow);
          pts.push(new THREE.Vector3(ecf.x / 1000, ecf.z / 1000, -ecf.y / 1000));
        }
      }
    } else if (trajectoryData && trajectoryData.points && trajectoryData.points.length > 1 && trajectoryData.norad_id === selectedObject.norad_id) {
      // 2. Fallback to backend SGP4 trajectory points
      pts = trajectoryData.points.map((pt) => {
        return new THREE.Vector3(pt.x_km / 1000, pt.z_km / 1000, -pt.y_km / 1000);
      });
    }

    if (pts.length > 1) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const nameUpper = (selectedObject.name || '').toUpperCase();
      const isStarlink = nameUpper.includes('STARLINK');
      const isOneWeb = nameUpper.includes('ONEWEB');
      const isGps = nameUpper.includes('GPS') || nameUpper.includes('NAVSTAR') || nameUpper.includes('BEIDOU') || nameUpper.includes('GALILEO') || nameUpper.includes('GLONASS');

      let lineColor = 0x00f0ff; // Default Cyan for Operational Satellite
      if (selectedObject.object_type === 'DEBRIS') {
        lineColor = 0xef4444; // Debris Red
      } else if (selectedObject.object_type === 'ROCKET_BODY') {
        lineColor = 0xeab308; // Rocket Yellow
      } else if (isStarlink) {
        lineColor = 0xa855f7; // Starlink Purple
      } else if (isOneWeb) {
        lineColor = 0xffffff; // OneWeb White
      } else if (isGps) {
        lineColor = 0x22c55e; // GPS Green
      }

      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.95,
        linewidth: 2
      });

      const line = new THREE.Line(lineGeom, lineMat);
      scene.add(line);
      trajectoryLineRef.current = line;
    }
  }, [trajectoryData, selectedObject, trajectoryHours]);

  // Update Ground Track Ribbon on Earth Surface
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (groundTrackLineRef.current) {
      scene.remove(groundTrackLineRef.current);
      groundTrackLineRef.current.geometry.dispose();
      groundTrackLineRef.current = null;
    }

    if (_groundTrackData && _groundTrackData.points.length > 1 && showGroundTrack) {
      const pts = _groundTrackData.points.map((pt) => {
        const latRad = (pt.lat * Math.PI) / 180;
        const lonRad = (pt.lon * Math.PI) / 180;
        const r = EARTH_RADIUS * 1.002;
        return new THREE.Vector3(
          r * Math.cos(latRad) * Math.cos(lonRad),
          r * Math.sin(latRad),
          -r * Math.cos(latRad) * Math.sin(lonRad)
        );
      });

      const nameUpper = (selectedObject?.name || '').toUpperCase();
      const isStarlink = nameUpper.includes('STARLINK');
      const isOneWeb = nameUpper.includes('ONEWEB');
      const isGps = nameUpper.includes('GPS') || nameUpper.includes('NAVSTAR') || nameUpper.includes('BEIDOU') || nameUpper.includes('GALILEO') || nameUpper.includes('GLONASS');

      let groundColor = 0x2563eb; // Operational Blue
      if (selectedObject?.object_type === 'DEBRIS') {
        groundColor = 0xef4444; // Debris Red
      } else if (selectedObject?.object_type === 'ROCKET_BODY') {
        groundColor = 0xeab308; // Rocket Yellow
      } else if (isStarlink) {
        groundColor = 0xa855f7; // Starlink Purple
      } else if (isOneWeb) {
        groundColor = 0xffffff; // OneWeb White
      } else if (isGps) {
        groundColor = 0x22c55e; // GPS Green
      }

      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineDashedMaterial({
        color: groundColor,
        dashSize: 0.2,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.8
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.computeLineDistances();
      scene.add(line);
      groundTrackLineRef.current = line;
    }
  }, [_groundTrackData, showGroundTrack, selectedObject]);

  // Update Visual Conjunction Vector Line
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (conjLineRef.current) {
      scene.remove(conjLineRef.current);
      conjLineRef.current.geometry.dispose();
      conjLineRef.current = null;
    }

    if (selectedConjunction && positions.length > 0) {
      const posA = positions.find((p) => p.norad_id === selectedConjunction.object_a?.norad_id);
      const posB = positions.find((p) => p.norad_id === selectedConjunction.object_b?.norad_id);

      if (posA && posB) {
        const vA = new THREE.Vector3(posA.x_km / 1000, posA.z_km / 1000, -posA.y_km / 1000);
        const vB = new THREE.Vector3(posB.x_km / 1000, posB.z_km / 1000, -posB.y_km / 1000);

        const lineGeom = new THREE.BufferGeometry().setFromPoints([vA, vB]);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xff0044,
          dashSize: 0.3,
          gapSize: 0.15,
          linewidth: 3
        });
        const line = new THREE.Line(lineGeom, lineMat);
        line.computeLineDistances();
        scene.add(line);
        conjLineRef.current = line;
      }
    }
  }, [selectedConjunction, positions]);

  // Camera Reset
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    setIsFollowMode(false);
    cameraRef.current.position.set(0, 11, 27);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  // Jump to TCA Action
  const handleJumpToTca = (conj: Conjunction) => {
    const parsed = parseUtcDate(conj.tca) || new Date();
    simTimeRef.current = parsed;
    setSimEpochVersion((v) => v + 1);
    setIsPlaying(false);

    if (
      conj.latitude_deg !== undefined &&
      conj.longitude_deg !== undefined &&
      controlsRef.current &&
      cameraRef.current
    ) {
      const latRad = (conj.latitude_deg * Math.PI) / 180;
      const lonRad = (conj.longitude_deg * Math.PI) / 180;
      const r = EARTH_RADIUS + (conj.altitude_km || 500) / 1000;

      const targetX = r * Math.cos(latRad) * Math.cos(lonRad);
      const targetY = r * Math.sin(latRad);
      const targetZ = -r * Math.cos(latRad) * Math.sin(lonRad);

      controlsRef.current.target.set(targetX, targetY, targetZ);
      cameraRef.current.position.set(targetX * 1.6, targetY * 1.6, targetZ * 1.6);
      controlsRef.current.update();
    }
  };

  // Search Filter Handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toUpperCase();
    const found = objects.find(
      (o) => o.name.toUpperCase().includes(query) || o.norad_id.toString() === query
    );
    if (found) {
      onSelectObject(found);
      const pos = visiblePositionsRef.current.find((p) => p.norad_id === found.norad_id) ||
        livePositionsRef.current.find((p) => p.norad_id === found.norad_id);
      if (pos && controlsRef.current && cameraRef.current) {
        const target = new THREE.Vector3(pos.x_km / 1000, pos.z_km / 1000, -pos.y_km / 1000);
        controlsRef.current.target.copy(target);
        cameraRef.current.position.copy(target.clone().add(new THREE.Vector3(0, 2, 5)));
        controlsRef.current.update();
      }
    }
  };

  return (
    <div
      className={`relative w-full h-[calc(100dvh-76px)] min-h-[540px] bg-space-950 rounded-xl overflow-hidden border border-space-800 ${
        isFullscreen ? 'fixed inset-0 z-50 h-dvh rounded-none border-none' : ''
      }`}
    >
      {/* Empty / Initializing Canvas State */}
      {positions.length === 0 && objects.length === 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-950/85 backdrop-blur-sm font-mono text-xs text-slate-300 p-6 select-none">
          <div className="w-10 h-10 rounded-full border-2 border-space-700 border-t-sky-400 animate-spin mb-3" />
          <div className="text-sm font-sans font-medium text-slate-100">
            Waiting for SGP4 Orbital State Vectors
          </div>
          <div className="text-xs text-slate-400 mt-1 max-w-sm text-center font-sans">
            Synchronize the CelesTrak ephemeris catalog or check System Diagnostics to populate the 3D WebGL scene.
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
        style={{ touchAction: 'none' }}
      />

      {/* Hover Tooltip */}
      {hoveredObject && (
        <div
          className="fixed pointer-events-none z-50 bg-space-900/95 backdrop-blur-md border border-space-700 p-3 rounded-lg text-xs font-mono shadow-xl text-slate-100 -translate-x-1/2 -translate-y-full mb-3 min-w-[220px] tabular-nums"
          style={{ left: hoveredObject.screenX, top: hoveredObject.screenY }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-space-800 pb-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <span className="px-1.5 py-0.5 rounded border border-space-700 bg-space-950 text-[10px] text-sky-300 font-semibold">
                {hoveredObject.badge}
              </span>
              <span className="truncate font-sans font-semibold text-slate-100">
                {hoveredObject.name}
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-950 border border-space-800 text-slate-300 shrink-0">
              {hoveredObject.categoryLabel}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>NORAD #{hoveredObject.norad_id}</span>
            <span
              className={
                hoveredObject.category === 'DEBRIS' ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'
              }
            >
              {hoveredObject.category === 'DEBRIS' ? 'DEBRIS HAZARD' : 'TRACKED ASSET'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1.5 pt-1.5 border-t border-space-800 text-[11px]">
            <div>
              Alt: <span className="text-slate-100 font-medium">{hoveredObject.alt_km.toFixed(1)} km</span>
            </div>
            <div>
              Vel: <span className="text-sky-300 font-medium">{hoveredObject.velocity_km_s.toFixed(2)} km/s</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-space-800 text-center">
            Double-click node to inspect orbit
          </div>
        </div>
      )}

      {/* TOP LEFT: Radar Filter Dock */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-sm">
        <button
          type="button"
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          aria-expanded={isLeftPanelOpen}
          className="bg-space-900/90 hover:bg-space-900 backdrop-blur-md border border-space-700 hover:border-sky-400/40 px-3 py-1.5 rounded-lg font-mono text-xs text-slate-100 shadow-lg flex items-center justify-between gap-3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span className="font-semibold tracking-wider text-xs">RADAR FILTERS</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-950 border border-space-800 text-sky-300 tabular-nums">
              {renderedNodeCount > 0
                ? renderedNodeCount.toLocaleString()
                : swarmDensity === 0
                  ? 'All'
                  : swarmDensity.toLocaleString()}
            </span>
          </div>
          {isLeftPanelOpen ? (
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
          )}
        </button>

        {isLeftPanelOpen && (
          <div className="bg-space-900/92 backdrop-blur-md border border-space-700 rounded-xl p-3 flex flex-col gap-3 font-mono text-xs shadow-2xl text-slate-200 max-h-[calc(100dvh-210px)] overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <label htmlFor="space-radar-search" className="sr-only">
                  Search tracked objects by name or NORAD ID
                </label>
                <input
                  id="space-radar-search"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search object or NORAD... (/)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-space-950 border border-space-800 rounded-lg px-3 py-1.5 pl-8 pr-8 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400/60"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" aria-hidden="true" />
                <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 bg-space-900 px-1.5 py-0.5 rounded border border-space-800 pointer-events-none">
                  {isSearchingCatalog ? '...' : '/'}
                </span>
              </form>

              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-space-950 border border-space-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-2.5 py-1 text-[10px] text-sky-300 uppercase tracking-wider bg-space-900 border-b border-space-800">
                    Matches ({searchSuggestions.length})
                  </div>
                  {searchSuggestions.map((item) => (
                    <button
                      key={item.norad_id}
                      type="button"
                      onClick={() => {
                        onSelectObject(item);
                        setSearchQuery('');
                        setSearchSuggestions([]);
                      }}
                      className="w-full px-2.5 py-1.5 text-left hover:bg-space-800 border-b border-space-900 last:border-none flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="truncate">
                        <span className="font-sans font-medium text-slate-100 block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          #{item.norad_id} · {item.object_type}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-900 border border-space-800 text-sky-300 shrink-0 tabular-nums">
                        {item.inclination != null ? `${item.inclination.toFixed(1)}°` : '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rendering Cap */}
            <SceneDensityControl
              swarmDensity={swarmDensity}
              onChangeDensity={setSwarmDensity}
              renderedCount={renderedNodeCount}
              totalCatalogCount={stats?.tracked_objects || positions.length || objects.length}
              isLoading={isFetchingDensity}
            />

            {/* Fleet & Constellations */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-sky-400" aria-hidden="true" />
                  Constellations &amp; Types
                </span>
                <span className="text-[10px] text-sky-300 tabular-nums">
                  {(stats?.tracked_objects || positions.length || objects.length).toLocaleString()} total
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
                ].map((f) => {
                  const isActive = activeFleetFilter === f.key && !isDebrisMode;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setActiveFleetFilter(f.key);
                        setIsDebrisMode(false);
                      }}
                      aria-pressed={isActive}
                      className={`px-2 py-1.5 rounded border transition-colors text-left flex items-center justify-between gap-1 ${
                        isActive
                          ? 'bg-sky-500/15 border-sky-400/40 font-medium'
                          : 'bg-space-950 border-space-800 hover:border-space-700'
                      }`}
                    >
                      <span className={`truncate ${f.accent}`}>{f.label}</span>
                      <span className="text-[10px] px-1 rounded bg-space-900 border border-space-800 text-slate-300 tabular-nums shrink-0">
                        {(f.count ?? 0).toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Orbital Regimes */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-sky-400" aria-hidden="true" />
                <span>Orbital Regime</span>
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
                        : 'bg-space-950 text-slate-400 hover:text-slate-200 border-space-800'
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

            {/* Overlays */}
            <div className="pt-2 border-t border-space-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowOrbitRings(!showOrbitRings)}
                aria-pressed={showOrbitRings}
                className={`flex-1 py-1.5 px-2 rounded text-[11px] font-medium border transition-colors inline-flex items-center justify-center gap-1.5 ${
                  showOrbitRings
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
                    : 'bg-space-950 text-slate-400 border-space-800 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3 h-3" aria-hidden="true" />
                <span>Orbit Rings</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDebrisMode(!isDebrisMode)}
                aria-pressed={isDebrisMode}
                className={`flex-1 py-1.5 px-2 rounded text-[11px] font-medium border transition-colors inline-flex items-center justify-center gap-1.5 ${
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

      {/* TOP RIGHT: UTC Clock & Camera Actions */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <SimClockBadge simTimeRef={simTimeRef} />

        <div className="bg-space-900/90 backdrop-blur-md border border-space-700 p-1 rounded-lg flex items-center gap-1">
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-sky-300 transition-colors"
            title="Reset camera view"
            aria-label="Reset camera view"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-sky-300 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen 3D viewport'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Telemetry & Encounters HUD */}
      {isRightPanelMinimized ? (
        <button
          type="button"
          onClick={() => setIsRightPanelMinimized(false)}
          className="absolute top-14 right-3 z-30 bg-space-900/90 hover:bg-space-900 backdrop-blur-md border border-space-700 hover:border-sky-400/40 px-3 py-1.5 rounded-lg font-mono text-xs text-slate-100 flex items-center gap-2 transition-colors"
        >
          <Crosshair className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
          <span className="font-medium">
            {selectedObject
              ? selectedObject.name
              : selectedConjunction
                ? 'Encounter Telemetry'
                : `Encounters (${conjunctions.length})`}
          </span>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        </button>
      ) : (
        <div className="absolute top-14 right-3 z-30 w-80 sm:w-96 max-w-[92vw] bg-space-900/92 backdrop-blur-md border border-space-700 p-3 rounded-xl font-mono text-xs shadow-2xl text-slate-200 max-h-[calc(100dvh-190px)] flex flex-col gap-2.5">
          {/* Header & Tabs */}
          <div className="flex items-center justify-between border-b border-space-800 pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightPanelTab('ALERTS')}
                aria-pressed={rightPanelTab === 'ALERTS'}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 border ${
                  rightPanelTab === 'ALERTS'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/35'
                    : 'text-slate-400 hover:text-slate-100 border-transparent'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Encounters ({conjunctions.length})</span>
              </button>

              {selectedObject && (
                <button
                  type="button"
                  onClick={() => setRightPanelTab('TELEMETRY')}
                  aria-pressed={rightPanelTab === 'TELEMETRY'}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                    rightPanelTab === 'TELEMETRY'
                      ? 'bg-sky-500/15 text-sky-300 border-sky-400/35'
                      : 'text-slate-400 hover:text-slate-100 border-transparent'
                  }`}
                >
                  <span className="truncate max-w-[110px] block">{selectedObject.name}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRightPanelMinimized(true)}
              className="p-1 hover:bg-space-800 rounded text-slate-400 hover:text-slate-100 transition-colors"
              title="Minimize panel"
              aria-label="Minimize telemetry panel"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {rightPanelTab === 'ALERTS' && (
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {(() => {
                const nowMs = simTimeRef.current.getTime();
                const upcomingConjs = conjunctions
                  .map((c) => ({
                    ...c,
                    _tcaMs: parseUtcDate(c.tca)?.getTime() ?? 0,
                  }))
                  .filter((c) => c._tcaMs > nowMs - 15 * 60 * 1000)
                  .sort((a, b) => a._tcaMs - b._tcaMs);

                if (upcomingConjs.length === 0) {
                  return (
                    <div className="p-4 text-center text-slate-400 text-xs bg-space-950/60 rounded-lg border border-space-800 font-sans">
                      No upcoming conjunctions in active screening buffer.
                    </div>
                  );
                }

                return upcomingConjs.map((conj) => {
                  const isCrit = conj.risk_level === 'CRITICAL' || conj.miss_distance_km < 5;
                  const isHigh = conj.risk_level === 'HIGH' || conj.miss_distance_km < 15;
                  const tcaCountdown = formatCountdownToUtc(conj._tcaMs, nowMs);
                  const isSelected = selectedConjunction?.id === conj.id;

                  return (
                    <div
                      key={conj.id}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-sky-500/12 border-sky-400/50'
                          : isCrit
                            ? 'bg-red-950/30 border-red-500/40'
                            : isHigh
                              ? 'bg-amber-950/20 border-amber-500/35'
                              : 'bg-space-950/70 border-space-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <div className="font-sans font-medium text-slate-100 text-xs truncate">
                            {conj.object_a?.name || `#${conj.object_a_id}`} vs{' '}
                            {conj.object_b?.name || `#${conj.object_b_id}`}
                          </div>
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            #{conj.object_a?.norad_id || conj.object_a_id} / #
                            {conj.object_b?.norad_id || conj.object_b_id}
                          </div>
                        </div>

                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 tabular-nums ${
                            isCrit
                              ? 'bg-red-500/15 border-red-500/40 text-red-300'
                              : isHigh
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-space-900 border-space-700 text-slate-300'
                          }`}
                        >
                          {conj.risk_level} ({conj.risk_score.toFixed(0)})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-space-950/80 p-2 rounded border border-space-800 mb-2 tabular-nums">
                        <div>
                          <span className="text-slate-400">Miss: </span>
                          <span className={isCrit ? 'text-red-300 font-medium' : 'text-sky-300'}>
                            {conj.miss_distance_km.toFixed(2)} km
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Rel: </span>
                          <span className="text-slate-100">{conj.relative_velocity_km_s.toFixed(2)} km/s</span>
                        </div>
                        <div>
                          <span className="text-slate-400">TCA: </span>
                          <span className="text-slate-200">{formatUtcTime(conj.tca, false)} UTC</span>
                        </div>
                        <div>
                          <span className="text-slate-400">ETA: </span>
                          <span className="text-amber-300 font-medium">{tcaCountdown}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {onNavigateTo2DTrack && (
                          <button
                            type="button"
                            onClick={() => onNavigateTo2DTrack(conj)}
                            className="py-1 px-2 rounded border border-space-700 bg-space-900 hover:bg-space-800 text-slate-200 text-[11px] flex items-center justify-center gap-1 transition-colors"
                          >
                            <Compass className="w-3 h-3 text-sky-400" aria-hidden="true" />
                            <span>2D Track</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenConjunctionDetails(conj)}
                          className="py-1 px-2 rounded border border-sky-400/35 bg-sky-500/12 hover:bg-sky-500/20 text-sky-300 text-[11px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <Radio className="w-3 h-3" aria-hidden="true" />
                          <span>Details</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {rightPanelTab === 'TELEMETRY' && selectedObject && (
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
              <div className="flex items-start justify-between border-b border-space-800 pb-2">
                <div className="min-w-0">
                  <div className="font-sans font-semibold text-slate-100 text-xs truncate">
                    {selectedObject.name}
                  </div>
                  <div className="text-[10px] text-slate-400 tabular-nums">
                    NORAD #{selectedObject.norad_id} · {selectedObject.object_type.replace('_', ' ')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectObject(null);
                    setRightPanelTab('ALERTS');
                  }}
                  aria-label="Clear selected object"
                  className="p-1 hover:bg-space-800 rounded text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFollowMode(!isFollowMode)}
                  aria-pressed={isFollowMode}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border transition-colors flex items-center justify-center gap-1 ${
                    isFollowMode
                      ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
                      : 'bg-space-950 text-slate-300 border-space-800 hover:border-space-700'
                  }`}
                >
                  <Crosshair className="w-3 h-3" aria-hidden="true" />
                  <span>{isFollowMode ? 'Following' : 'Follow'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGroundTrack(!showGroundTrack)}
                  aria-pressed={showGroundTrack}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border transition-colors flex items-center justify-center gap-1 ${
                    showGroundTrack
                      ? 'bg-sky-500/15 text-sky-300 border-sky-400/40'
                      : 'bg-space-950 text-slate-400 border-space-800 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3 h-3" aria-hidden="true" />
                  <span>Ground Track</span>
                </button>
              </div>

              <div className="space-y-1.5 bg-space-950/80 p-2.5 rounded-lg border border-space-800 text-[11px] tabular-nums">
                <div className="text-[10px] font-medium text-sky-300 uppercase tracking-wider">
                  Instantaneous State Vector
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Altitude</span>
                  <span className="text-slate-100 font-medium">
                    {selectedPos ? `${selectedPos.alt_km.toFixed(1)} km` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Velocity</span>
                  <span className="text-sky-300 font-medium">
                    {selectedPos ? `${selectedPos.velocity_km_s.toFixed(2)} km/s` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sub-Satellite</span>
                  <span className="text-slate-200">
                    {selectedPos
                      ? `${selectedPos.lat.toFixed(2)}°, ${selectedPos.lon.toFixed(2)}°`
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 bg-space-950/80 p-2.5 rounded-lg border border-space-800 text-[11px] tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-400">Inclination</span>
                  <span className="text-slate-200">
                    {selectedObject.inclination != null ? `${selectedObject.inclination.toFixed(2)}°` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Perigee / Apogee</span>
                  <span className="text-slate-200">
                    {selectedObject.perigee_km != null && selectedObject.apogee_km != null
                      ? `${selectedObject.perigee_km.toFixed(0)} – ${selectedObject.apogee_km.toFixed(0)} km`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Period</span>
                  <span className="text-slate-200">
                    {selectedObject.period_minutes != null
                      ? `${selectedObject.period_minutes.toFixed(1)} min`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Catalog Feed</span>
                  <span className="text-slate-200 truncate max-w-[160px]">
                    {selectedObject.source || 'CelesTrak'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>ORBIT ARC HORIZON</span>
                  <span className="text-sky-300 font-medium tabular-nums">+{trajectoryHours}h</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 6, 12, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTrajectoryHours(h)}
                      aria-pressed={trajectoryHours === h}
                      className={`py-1 rounded border text-[11px] transition-colors ${
                        trajectoryHours === h
                          ? 'bg-sky-500/15 text-sky-300 border-sky-400/40 font-medium'
                          : 'bg-space-950 text-slate-400 hover:text-slate-200 border-space-800'
                      }`}
                    >
                      {h}H
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM BAR: Simulation Epoch Controls */}
      <div className="absolute bottom-3 left-3 right-3 z-20 bg-space-900/90 backdrop-blur-md border border-space-700 px-3 py-2 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 font-mono text-xs shadow-xl">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 transition-colors"
              title={isPlaying ? 'Pause SGP4 simulation' : 'Resume SGP4 simulation'}
              aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <div className="flex items-center gap-0.5 bg-space-950 p-0.5 rounded border border-space-800">
              {[1, 10, 50, 200, 1000].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  aria-pressed={simSpeed === spd}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors tabular-nums ${
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

          <button
            type="button"
            onClick={() => {
              simTimeRef.current = new Date();
              setSimEpochVersion((v) => v + 1);
            }}
            className="px-2.5 py-1 bg-space-950 hover:bg-space-800 text-sky-300 border border-space-700 rounded text-[11px] transition-colors"
          >
            LIVE NOW
          </button>
        </div>

        <SimHorizonSlider
          simTimeRef={simTimeRef}
          onJumpOffsetSeconds={(offsetSec) => {
            simTimeRef.current = new Date(Date.now() + offsetSec * 1000);
            setSimEpochVersion((v) => v + 1);
          }}
        />

        {conjunctions.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">HOTSPOTS</span>
            {conjunctions.slice(0, 2).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectConjunction(c);
                  handleJumpToTca(c);
                }}
                className="px-2 py-1 bg-red-950/40 text-red-200 border border-red-500/35 rounded text-[11px] hover:bg-red-950/60 transition-colors tabular-nums"
              >
                {c.miss_distance_km.toFixed(1)} km · {formatUtcTime(c.tca, false)} UTC
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
