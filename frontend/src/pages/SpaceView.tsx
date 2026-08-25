import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Compass, 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Search, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crosshair,
  FastForward,
  Globe,
  Sliders,
  Radio
} from 'lucide-react';
import { 
  OrbitalObject, 
  ObjectType,
  Conjunction, 
  OrbitalPosition, 
  TrajectoryResponse, 
  GroundTrackResponse,
  SystemStatistics 
} from '../types';
import { api } from '../services/api';
import * as satellite from 'satellite.js';

interface SpaceViewProps {
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  stats?: SystemStatistics | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction: (conj: Conjunction | null) => void;
  onOpenConjunctionDetails: (conj: Conjunction) => void;
  onNavigateTo2DTrack?: (conj: Conjunction) => void;
}

const EARTH_RADIUS = 6.371; // 1 unit = 1000 km in 3D scene

const parseUtcDate = (dStr: string) => {
  if (!dStr) return new Date();
  let s = dStr.trim();
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('T')) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (!s.endsWith('Z') && !s.includes('+')) {
    s += 'Z';
  }
  return new Date(s);
};

const formatTcaCountdown = (tcaStr: string, currDate: Date = new Date()) => {
  const tca = parseUtcDate(tcaStr);
  const diffMs = tca.getTime() - currDate.getTime();
  if (diffMs <= 0) return 'PASSED';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `T-${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Astronomical Solar Declination & Right Ascension Calculator
function calculateSunDirection(date: Date): THREE.Vector3 {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getUTCFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10)) * (Math.PI / 180);
  const hourAngle = (hour - 12) * 15 * (Math.PI / 180);

  const x = -Math.cos(declination) * Math.sin(hourAngle);
  const y = Math.sin(declination);
  const z = Math.cos(declination) * Math.cos(hourAngle);

  return new THREE.Vector3(x, y, z).normalize();
}

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

  // Time Engine State (Default 1X for true real-time 1:1 orbital speed)
  const [simTime, setSimTime] = useState<Date>(new Date());
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
    alt_km: number;
    velocity_km_s: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Dynamic Individual Fleet & Constellation and Regime Counts
  const fleetCounts = useMemo(() => {
    if (stats?.fleet_breakdown) {
      return stats.fleet_breakdown;
    }

    let all = stats?.tracked_objects || objects.length;
    let payload = stats?.active_satellites || 0;
    let starlink = 0;
    let oneweb = 0;
    let gps = 0;
    let debris = stats?.space_debris || 0;
    let rocket = stats?.rocket_bodies || 0;
    let leo = stats?.altitude_distribution?.leo || 0;
    let meo = stats?.altitude_distribution?.meo || 0;
    let geo = stats?.altitude_distribution?.geo || 0;

    objects.forEach((o) => {
      const name = o.name.toUpperCase();
      const type = (typeof o.object_type === 'string' ? o.object_type : (o.object_type as any)?.value || '').toUpperCase();
      const apogee = o.apogee_km || o.perigee_km || 0;

      if (type === 'DEBRIS') debris++;
      else if (type === 'ROCKET_BODY' || type === 'ROCKET') rocket++;
      else payload++;

      if (name.includes('STARLINK')) starlink++;
      if (name.includes('ONEWEB')) oneweb++;
      if (name.includes('NAVSTAR') || name.includes('GPS') || name.includes('GLONASS') || name.includes('GALILEO') || name.includes('BEIDOU')) gps++;

      if (apogee <= 2000) leo++;
      else if (apogee < 35000) meo++;
      else geo++;
    });

    return { all, operational: payload, payload, starlink, oneweb, gps, debris, rocket, leo, meo, geo };
  }, [objects, stats]);

  // Mutable Refs for 60 FPS Animation & Screen-Space Raycasting
  const positionsRef = useRef<OrbitalPosition[]>([]);
  const livePositionsRef = useRef<OrbitalPosition[]>([]);
  const visiblePositionsRef = useRef<OrbitalPosition[]>([]);
  const objectsRef = useRef<OrbitalObject[]>([]);
  const isFollowModeRef = useRef<boolean>(false);
  const selectedPosRef = useRef<OrbitalPosition | null>(null);
  const isPlayingRef = useRef<boolean>(true);
  const simSpeedRef = useRef<number>(50);

  positionsRef.current = positions;
  objectsRef.current = objects;
  isFollowModeRef.current = isFollowMode;
  selectedPosRef.current = selectedPos;
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

  // Specialized 3D Instanced Meshes (Color-Coded)
  const debrisMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const satMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const starlinkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const onewebMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rocketMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const gpsMeshRef = useRef<THREE.InstancedMesh | null>(null);
  
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const groundTrackLineRef = useRef<THREE.Line | null>(null);
  const conjLineRef = useRef<THREE.Line | null>(null);
  const orbitRingsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const simTimeRef = useRef<Date>(simTime);
  const satrecMapRef = useRef<Map<number, { satrec: any; name: string; type: ObjectType; norad_id: number }>>(new Map());

  useEffect(() => {
    simTimeRef.current = simTime;
  }, [simTime]);

  // Parse Real Two-Line Elements (TLEs) into SGP4 Satrec records
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
                norad_id: obj.norad_id
              });
            }
          } catch (e) {
            // Ignore malformed TLE
          }
        }
      });
    }
  }, [objects]);

  // Fetch Batch Ephemeris Positions from Backend API
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      try {
        const batch = await api.getBatchPositions(simTime.toISOString(), 1800);
        if (isMounted && batch.positions && batch.positions.length > 0) {
          setPositions(batch.positions);
          livePositionsRef.current = batch.positions.map((p: OrbitalPosition) => ({ ...p }));
          batch.positions.forEach((p: OrbitalPosition) => {
            if (p.tle_line1 && p.tle_line2) {
              try {
                const satrec = satellite.twoline2satrec(p.tle_line1, p.tle_line2);
                if (satrec && (satrec as any).error === 0) {
                  satrecMapRef.current.set(p.norad_id, {
                    satrec,
                    name: p.name,
                    type: p.type,
                    norad_id: p.norad_id
                  });
                }
              } catch (e) {}
            }
          });
          if (selectedObject) {
            const current = batch.positions.find((p: OrbitalPosition) => p.norad_id === selectedObject.norad_id);
            if (current) setSelectedPos(current);
          }
        }
      } catch (err) {
        console.error('Failed to fetch batch positions:', err);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedObject]);

  // Simulation Clock Progression
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      if (simTimeRef.current) {
        setSimTime(new Date(simTimeRef.current.getTime()));
      }
    }, 250);
    return () => clearInterval(timer);
  }, [isPlaying]);

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
        const traj = await api.getObjectTrajectory(selectedObject.norad_id, trajectoryHours, 5);
        if (isMounted) setTrajectoryData(traj);

        if (showGroundTrack) {
          const track = await api.getObjectGroundTrack(selectedObject.norad_id, 180, 2);
          if (isMounted) setGroundTrackData(track);
        }
      } catch (err) {
        console.error('Failed to fetch detailed trajectory/ground track:', err);
      }
    };

    fetchEphemerisDetails();
    return () => { isMounted = false; };
  }, [selectedObject, trajectoryHours, showGroundTrack]);

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

    // 11. Reference Equatorial & Altitude Orbital Rings (LeoLabs Style)
    const ringsGroup = new THREE.Group();
    const ringRadii = [EARTH_RADIUS + 0.5, EARTH_RADIUS + 1.2, EARTH_RADIUS + 2.0, EARTH_RADIUS + 10.0, EARTH_RADIUS + 35.786];
    ringRadii.forEach((rad) => {
      const ringGeom = new THREE.BufferGeometry();
      const ringPts: THREE.Vector3[] = [];
      for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        ringPts.push(new THREE.Vector3(rad * Math.cos(a), 0, rad * Math.sin(a)));
      }
      ringGeom.setFromPoints(ringPts);
      const ringMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.12 });
      ringsGroup.add(new THREE.Line(ringGeom, ringMat));
    });
    scene.add(ringsGroup);
    orbitRingsGroupRef.current = ringsGroup;

    // Altitude Reference Rings (LEO, ISS, Sun-sync, GEO)
    const altRingsGroup = new THREE.Group();
    const ringDefs = [
      { alt: 420, color: 0x00f0ff, label: 'ISS ~420km' },
      { alt: 550, color: 0x8b5cf6, label: 'Starlink ~550km' },
      { alt: 800, color: 0x38bdf8, label: 'Sun-sync ~800km' },
      { alt: 20200, color: 0x3b82f6, label: 'MEO/GPS ~20,200km' },
    ];
    ringDefs.forEach(({ alt, color }) => {
      const ringRadius = EARTH_RADIUS + alt / 1000;
      const ringGeom = new THREE.RingGeometry(ringRadius - 0.01, ringRadius + 0.01, 128);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      altRingsGroup.add(ring);
    });
    scene.add(altRingsGroup);

    // 12. SPECIALIZED 3D INSTANCED MESHES (Exact Color Specification):
    const maxInst = 4500;

    // A) Operational Payloads & Active Satellites (BLUE)
    const satGeom = new THREE.OctahedronGeometry(0.20, 0);
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Vibrant Royal Blue
      emissive: 0x1d4ed8,
      roughness: 0.15,
      metalness: 0.9
    });
    const satMesh = new THREE.InstancedMesh(satGeom, satMat, maxInst);
    satMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(satMesh);
    satMeshRef.current = satMesh;

    // B) Starlink Constellation (PURPLE)
    const starlinkGeom = new THREE.OctahedronGeometry(0.18, 0);
    const starlinkMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7, // Vibrant Purple
      emissive: 0x7e22ce,
      roughness: 0.2,
      metalness: 0.85
    });
    const starlinkMesh = new THREE.InstancedMesh(starlinkGeom, starlinkMat, maxInst);
    starlinkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(starlinkMesh);
    starlinkMeshRef.current = starlinkMesh;

    // C) OneWeb Constellation (WHITE)
    const onewebGeom = new THREE.OctahedronGeometry(0.18, 0);
    const onewebMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure White
      emissive: 0xd4d4d8,
      roughness: 0.1,
      metalness: 0.95
    });
    const onewebMesh = new THREE.InstancedMesh(onewebGeom, onewebMat, maxInst);
    onewebMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(onewebMesh);
    onewebMeshRef.current = onewebMesh;

    // D) GPS / GNSS Constellation (GREEN)
    const gpsGeom = new THREE.OctahedronGeometry(0.22, 0);
    const gpsMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e, // Vibrant Green
      emissive: 0x15803d,
      roughness: 0.15,
      metalness: 0.9
    });
    const gpsMesh = new THREE.InstancedMesh(gpsGeom, gpsMat, maxInst);
    gpsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(gpsMesh);
    gpsMeshRef.current = gpsMesh;

    // E) Debris / Shattered Fragment Clouds (RED)
    const debrisGeom = new THREE.SphereGeometry(0.13, 10, 10);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Vibrant Red
      emissive: 0xb91c1c,
      roughness: 0.35,
      metalness: 0.6
    });
    const debrisMesh = new THREE.InstancedMesh(debrisGeom, debrisMat, maxInst);
    debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(debrisMesh);
    debrisMeshRef.current = debrisMesh;

    // F) Rocket Bodies & Booster Upper Stages (YELLOW)
    const rocketGeom = new THREE.CylinderGeometry(0.06, 0.12, 0.32, 8);
    const rocketMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Bright Yellow
      emissive: 0xa16207,
      roughness: 0.35,
      metalness: 0.8
    });
    const rocketMesh = new THREE.InstancedMesh(rocketGeom, rocketMat, maxInst);
    rocketMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(rocketMesh);
    rocketMeshRef.current = rocketMesh;

    // Screen-Space Distance Hit Tester (Works reliably on all dots)
    const findClosestDot = (clientX: number, clientY: number, maxScreenDistPx: number = 28) => {
      if (!camera || !renderer || visiblePositionsRef.current.length === 0) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      let closest: { pos: OrbitalPosition; dist: number } | null = null;
      const tempVec = new THREE.Vector3();

      for (const pos of visiblePositionsRef.current) {
        tempVec.set(pos.x_km / 1000, pos.z_km / 1000, -pos.y_km / 1000);
        tempVec.project(camera);

        // Discard points behind camera
        if (tempVec.z > 1.0) continue;

        const sx = (tempVec.x * 0.5 + 0.5) * w;
        const sy = (-(tempVec.y * 0.5) + 0.5) * h;

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

    // Pointer Move for Interactive Hover Tooltip
    const handlePointerMove = (e: MouseEvent) => {
      const match = findClosestDot(e.clientX, e.clientY, 24);
      if (match) {
        setHoveredObject({
          name: match.pos.name || `NORAD #${match.pos.norad_id}`,
          norad_id: match.pos.norad_id,
          type: (match.pos.type || 'ACTIVE_SATELLITE').replace('_', ' '),
          alt_km: match.pos.alt_km,
          velocity_km_s: match.pos.velocity_km_s,
          screenX: e.clientX,
          screenY: e.clientY
        });
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredObject(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    // Double-Click Selection on Any Dot (Prevents accidental selection during camera rotation and preserves zoom level)
    const handleCanvasDblClick = async (e: MouseEvent) => {
      const match = findClosestDot(e.clientX, e.clientY, 32);
      if (match) {
        const p = match.pos;
        const found = objectsRef.current.find((o) => o.norad_id === p.norad_id);
        const fallbackObj: OrbitalObject = found || {
          id: p.norad_id,
          norad_id: p.norad_id,
          name: p.name || `NORAD #${p.norad_id}`,
          object_type: (p.type as any) || 'ACTIVE_SATELLITE',
          source: 'Space-Track.org (US Space Force)',
          source_group: 'live_ephemeris',
          tle_line1: '',
          tle_line2: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        onSelectObject(fallbackObj);
        setSelectedPos(p);

        // Fetch full Keplerian details & TLE lines from backend
        try {
          const fullDetails = await api.getObjectDetails(p.norad_id);
          if (fullDetails) {
            onSelectObject(fullDetails);
          }
        } catch (err) {
          // Keep using fallback
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('dblclick', handleCanvasDblClick);

    // 60 FPS Orbit Simulation Clock
    const clock = new THREE.Clock();
    let tumbleAngle = 0;

    // Animation Loop: Real-Time SGP4 Trajectory Motion around Still Earth
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();

      const delta = Math.min(0.1, clock.getDelta());
      tumbleAngle += delta * 2.5;

      if (cloudMesh) {
        cloudMesh.rotation.y += delta * 0.015;
      }

      // Continuous 60 FPS SGP4 Orbit Simulation Clock
      if (isPlayingRef.current && simTimeRef.current) {
        const advanceMs = delta * 1000 * (simSpeedRef.current || 1);
        simTimeRef.current = new Date(simTimeRef.current.getTime() + advanceMs);
      }

      const currentSimDate = simTimeRef.current || new Date();
      const gmst = satellite.gstime(currentSimDate);
      const dummy = new THREE.Object3D();
      const currentVisible: OrbitalPosition[] = [];

      let satIdx = 0;
      let starlinkIdx = 0;
      let onewebIdx = 0;
      let gpsIdx = 0;
      let debrisIdx = 0;
      let rocketIdx = 0;

      if (satrecMapRef.current.size > 0) {
        satrecMapRef.current.forEach((item) => {
          try {
            const pv = satellite.propagate(item.satrec, currentSimDate);
            if (!pv || !pv.position || typeof pv.position === 'boolean') return;

            const pEci = pv.position;
            const vEci = pv.velocity;
            const ecf = satellite.eciToEcf(pEci, gmst);
            const geodetic = satellite.eciToGeodetic(pEci, gmst);

            const lat = satellite.degreesLat(geodetic.latitude);
            const lon = satellite.degreesLong(geodetic.longitude);
            const alt = Math.max(120, geodetic.height);

            let vx = 0, vy = 0, vz = 0, vSpeed = 7.65;
            if (vEci && typeof vEci !== 'boolean') {
              vx = vEci.x;
              vy = vEci.y;
              vz = vEci.z;
              vSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);
            }

            // Three.js coordinates mapped to stationary WGS84 Blue Marble Earth
            const x3d = ecf.x / 1000;
            const y3d = ecf.z / 1000;
            const z3d = -ecf.y / 1000;

            const pos: OrbitalPosition = {
              timestamp: currentSimDate.toISOString(),
              norad_id: item.norad_id,
              name: item.name,
              type: item.type,
              x_km: ecf.x,
              y_km: ecf.y,
              z_km: ecf.z,
              vx_km_s: vx,
              vy_km_s: vy,
              vz_km_s: vz,
              alt_km: alt,
              velocity_km_s: vSpeed,
              lat: lat,
              lon: lon
            };

            // Apply Fleet & Altitude Filters
            const nameUpper = (pos.name || '').toUpperCase();
            const isStarlink = nameUpper.includes('STARLINK');
            const isOneWeb = nameUpper.includes('ONEWEB');
            const isGps = nameUpper.includes('GPS') || nameUpper.includes('NAVSTAR') || nameUpper.includes('BEIDOU') || nameUpper.includes('GALILEO') || nameUpper.includes('GLONASS') || nameUpper.includes('QZSS') || nameUpper.includes('IRNSS');

            if (isDebrisMode && pos.type !== 'DEBRIS') return;
            if (activeFleetFilter === 'STARLINK' && !isStarlink) return;
            if (activeFleetFilter === 'ONEWEB' && !isOneWeb) return;
            if (activeFleetFilter === 'GPS' && !isGps) return;
            if (activeFleetFilter === 'DEBRIS' && pos.type !== 'DEBRIS') return;
            if (activeFleetFilter === 'PAYLOAD' && pos.type !== 'ACTIVE_SATELLITE') return;
            if (activeFleetFilter === 'ROCKET' && pos.type !== 'ROCKET_BODY') return;

            if (altitudeFilter === 'LEO' && pos.alt_km > 2000) return;
            if (altitudeFilter === 'MEO' && (pos.alt_km <= 2000 || pos.alt_km > 20000)) return;
            if (altitudeFilter === 'GEO' && pos.alt_km <= 20000) return;

            currentVisible.push(pos);

            dummy.position.set(x3d, y3d, z3d);
            const isSelected = selectedObject?.norad_id === pos.norad_id;
            const isConjunctionA = selectedConjunction && (
              pos.norad_id === selectedConjunction.object_a?.norad_id || 
              pos.norad_id === selectedConjunction.object_a_id
            );
            const isConjunctionB = selectedConjunction && (
              pos.norad_id === selectedConjunction.object_b?.norad_id || 
              pos.norad_id === selectedConjunction.object_b_id
            );

            let scale = 1.15;
            if (isSelected) scale = 3.4;
            if (isConjunctionA || isConjunctionB) {
              // Rapid high-visibility pulsing blink animation for both conjunction objects
              const pulse = Math.sin(tumbleAngle * 7.0) * 2.5 + 4.2;
              scale = Math.max(2.0, pulse);
            }
            dummy.scale.set(scale, scale, scale);

            // 1. DEBRIS -> RED
            if (pos.type === 'DEBRIS') {
              if (debrisMeshRef.current && debrisIdx < maxInst) {
                dummy.rotation.set(tumbleAngle * 0.8 + pos.norad_id, tumbleAngle * 1.2, tumbleAngle * 0.5);
                dummy.updateMatrix();
                debrisMeshRef.current.setMatrixAt(debrisIdx, dummy.matrix);
                debrisIdx++;
              }
            // 2. ROCKETS -> YELLOW
            } else if (pos.type === 'ROCKET_BODY') {
              if (rocketMeshRef.current && rocketIdx < maxInst) {
                dummy.rotation.set(0.3, tumbleAngle * 0.3 + pos.norad_id, 0);
                dummy.updateMatrix();
                rocketMeshRef.current.setMatrixAt(rocketIdx, dummy.matrix);
                rocketIdx++;
              }
            // 3. STARLINK -> PURPLE
            } else if (isStarlink) {
              if (starlinkMeshRef.current && starlinkIdx < maxInst) {
                dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
                dummy.updateMatrix();
                starlinkMeshRef.current.setMatrixAt(starlinkIdx, dummy.matrix);
                starlinkIdx++;
              }
            // 4. ONEWEB -> WHITE
            } else if (isOneWeb) {
              if (onewebMeshRef.current && onewebIdx < maxInst) {
                dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
                dummy.updateMatrix();
                onewebMeshRef.current.setMatrixAt(onewebIdx, dummy.matrix);
                onewebIdx++;
              }
            // 5. GPS / GNSS -> GREEN
            } else if (isGps) {
              if (gpsMeshRef.current && gpsIdx < maxInst) {
                dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
                dummy.updateMatrix();
                gpsMeshRef.current.setMatrixAt(gpsIdx, dummy.matrix);
                gpsIdx++;
              }
            // 6. OPERATIONAL / OTHER ACTIVE -> BLUE
            } else {
              if (satMeshRef.current && satIdx < maxInst) {
                dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
                dummy.updateMatrix();
                satMeshRef.current.setMatrixAt(satIdx, dummy.matrix);
                satIdx++;
              }
            }

            if (isSelected) {
              selectedPosRef.current = pos;
            }
          } catch (e) {
            // Ignore propagation calculation error for expired orbital epochs
          }
        });
      } else if (livePositionsRef.current.length > 0) {
        // Fallback propagation using backend SGP4 batch positions
        livePositionsRef.current.forEach((pos) => {
          const x3d = pos.x_km / 1000;
          const y3d = pos.z_km / 1000;
          const z3d = -pos.y_km / 1000;

          currentVisible.push(pos);
          dummy.position.set(x3d, y3d, z3d);
          const isSelected = selectedObject?.norad_id === pos.norad_id;
          const isConjunctionA = selectedConjunction && (
            pos.norad_id === selectedConjunction.object_a?.norad_id || 
            pos.norad_id === selectedConjunction.object_a_id
          );
          const isConjunctionB = selectedConjunction && (
            pos.norad_id === selectedConjunction.object_b?.norad_id || 
            pos.norad_id === selectedConjunction.object_b_id
          );

          let scale = 1.15;
          if (isSelected) scale = 3.4;
          if (isConjunctionA || isConjunctionB) {
            const pulse = Math.sin(tumbleAngle * 7.0) * 2.5 + 4.2;
            scale = Math.max(2.0, pulse);
          }
          dummy.scale.set(scale, scale, scale);

          const nameUpper = (pos.name || '').toUpperCase();
          const isStarlink = nameUpper.includes('STARLINK');
          const isOneWeb = nameUpper.includes('ONEWEB');
          const isGps = nameUpper.includes('GPS') || nameUpper.includes('NAVSTAR') || nameUpper.includes('BEIDOU') || nameUpper.includes('GALILEO') || nameUpper.includes('GLONASS');

          if (pos.type === 'DEBRIS') {
            if (debrisMeshRef.current && debrisIdx < maxInst) {
              dummy.rotation.set(tumbleAngle * 0.8 + pos.norad_id, tumbleAngle * 1.2, tumbleAngle * 0.5);
              dummy.updateMatrix();
              debrisMeshRef.current.setMatrixAt(debrisIdx, dummy.matrix);
              debrisIdx++;
            }
          } else if (pos.type === 'ROCKET_BODY') {
            if (rocketMeshRef.current && rocketIdx < maxInst) {
              dummy.rotation.set(0.3, tumbleAngle * 0.3 + pos.norad_id, 0);
              dummy.updateMatrix();
              rocketMeshRef.current.setMatrixAt(rocketIdx, dummy.matrix);
              rocketIdx++;
            }
          } else if (isStarlink) {
            if (starlinkMeshRef.current && starlinkIdx < maxInst) {
              dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
              dummy.updateMatrix();
              starlinkMeshRef.current.setMatrixAt(starlinkIdx, dummy.matrix);
              starlinkIdx++;
            }
          } else if (isOneWeb) {
            if (onewebMeshRef.current && onewebIdx < maxInst) {
              dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
              dummy.updateMatrix();
              onewebMeshRef.current.setMatrixAt(onewebIdx, dummy.matrix);
              onewebIdx++;
            }
          } else if (isGps) {
            if (gpsMeshRef.current && gpsIdx < maxInst) {
              dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
              dummy.updateMatrix();
              gpsMeshRef.current.setMatrixAt(gpsIdx, dummy.matrix);
              gpsIdx++;
            }
          } else {
            if (satMeshRef.current && satIdx < maxInst) {
              dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
              dummy.updateMatrix();
              satMeshRef.current.setMatrixAt(satIdx, dummy.matrix);
              satIdx++;
            }
          }
        });
      }

      visiblePositionsRef.current = currentVisible;

      if (satMeshRef.current) {
        satMeshRef.current.count = satIdx;
        satMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (starlinkMeshRef.current) {
        starlinkMeshRef.current.count = starlinkIdx;
        starlinkMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (onewebMeshRef.current) {
        onewebMeshRef.current.count = onewebIdx;
        onewebMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (gpsMeshRef.current) {
        gpsMeshRef.current.count = gpsIdx;
        gpsMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (debrisMeshRef.current) {
        debrisMeshRef.current.count = debrisIdx;
        debrisMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (rocketMeshRef.current) {
        rocketMeshRef.current.count = rocketIdx;
        rocketMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      // Follow Camera Mode
      if (isFollowModeRef.current && selectedPosRef.current && controlsRef.current && cameraRef.current) {
        const sp = selectedPosRef.current;
        const targetPos = new THREE.Vector3(
          sp.x_km / 1000,
          sp.z_km / 1000,
          -sp.y_km / 1000
        );
        const currentTarget = controlsRef.current.target.clone();
        const offset = cameraRef.current.position.clone().sub(currentTarget);
        controlsRef.current.target.copy(targetPos);
        cameraRef.current.position.copy(targetPos.clone().add(offset));
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
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
      renderer.dispose();
    };
  }, [activeFleetFilter, altitudeFilter, isDebrisMode]);

  // Update Solar Illumination Vector with Simulation Time
  useEffect(() => {
    const sunDir = calculateSunDirection(simTime);
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunDir.clone().multiplyScalar(150));
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.position.copy(sunDir.clone().multiplyScalar(150));
    }
    if (earthMeshRef.current) {
      // Earth rotation via GMST (Greenwich Mean Sidereal Time)
      const JD = 2440587.5 + simTime.getTime() / 86400000;
      const T = (JD - 2451545.0) / 36525.0;
      const gmstDeg = (280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T) % 360;
      const gmstRad = gmstDeg * (Math.PI / 180);
      earthMeshRef.current.rotation.y = gmstRad;

      // Sun direction must be in ECEF (Earth-fixed) frame to match the rotated Earth mesh
      // Compute sub-solar geographic coordinates (sun's lat/lon on Earth surface)
      const dayOfYear = Math.floor(
        (simTime.getTime() - new Date(simTime.getUTCFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
      );
      const hour = simTime.getUTCHours() + simTime.getUTCMinutes() / 60 + simTime.getUTCSeconds() / 3600;
      const sunDecDeg = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
      const sunDecRad = sunDecDeg * (Math.PI / 180);
      // Sub-solar longitude: sun is at local noon at (12 - UTChour) * 15 degrees
      const sunLonDeg = (12.0 - hour) * 15.0;
      const sunLonRad = sunLonDeg * (Math.PI / 180);

      // Convert sub-solar lat/lon to ECEF unit vector (matches Earth mesh orientation)
      // Earth mesh has rotation.y = gmstRad and initial rotation.y = -PI/2 (set during creation)
      // The shader uses worldNormal of the rotated mesh, so sunDirection must be in world space
      // after accounting for Earth mesh rotation
      const totalRotation = gmstRad; // Earth mesh rotation
      const adjustedLon = sunLonRad + totalRotation + Math.PI / 2; // compensate for initial -PI/2 rotation

      const sunEcefX = Math.cos(sunDecRad) * Math.cos(adjustedLon);
      const sunEcefY = Math.sin(sunDecRad);
      const sunEcefZ = -Math.cos(sunDecRad) * Math.sin(adjustedLon);

      const mat = earthMeshRef.current.material as THREE.ShaderMaterial;
      if (mat.uniforms?.sunDirection) {
        mat.uniforms.sunDirection.value.set(sunEcefX, sunEcefY, sunEcefZ).normalize();
      }
    }
    // Update Moon position
    if (moonMeshRef.current) {
      const moonPos = calculateMoonPosition(simTime);
      moonMeshRef.current.position.copy(moonPos);
    }
  }, [simTime]);

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

    if (trajectoryData && trajectoryData.points.length > 1) {
      const pts = trajectoryData.points.map((pt) => {
        return new THREE.Vector3(pt.x_km / 1000, pt.z_km / 1000, -pt.y_km / 1000);
      });

      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const nameUpper = (selectedObject?.name || '').toUpperCase();
      const isStarlink = nameUpper.includes('STARLINK');
      const isOneWeb = nameUpper.includes('ONEWEB');
      const isGps = nameUpper.includes('GPS') || nameUpper.includes('NAVSTAR') || nameUpper.includes('BEIDOU') || nameUpper.includes('GALILEO') || nameUpper.includes('GLONASS');

      let lineColor = 0x2563eb; // Default Operational Blue
      if (selectedObject?.object_type === 'DEBRIS') {
        lineColor = 0xef4444; // Debris Red
      } else if (selectedObject?.object_type === 'ROCKET_BODY') {
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
  }, [trajectoryData, selectedObject]);

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
    const tcaDate = new Date(conj.tca);
    setSimTime(tcaDate);
    setIsPlaying(false);

    if (conj.latitude_deg !== undefined && conj.longitude_deg !== undefined && controlsRef.current && cameraRef.current) {
      const latRad = (conj.latitude_deg * Math.PI) / 180;
      const lonRad = (conj.longitude_deg * Math.PI) / 180;
      const r = (EARTH_RADIUS + (conj.altitude_km || 500) / 1000);

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
      const pos = positions.find((p) => p.norad_id === found.norad_id);
      if (pos && controlsRef.current && cameraRef.current) {
        const target = new THREE.Vector3(pos.x_km / 1000, pos.z_km / 1000, -pos.y_km / 1000);
        controlsRef.current.target.copy(target);
        cameraRef.current.position.copy(target.clone().add(new THREE.Vector3(0, 2, 5)));
        controlsRef.current.update();
      }
    }
  };

  return (
    <div className={`relative w-full h-[calc(100vh-140px)] min-h-[580px] bg-space-950 rounded-2xl overflow-hidden border border-space-800 shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 h-screen rounded-none border-none' : ''}`}>
      {/* 3D WebGL Canvas Mounting Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* FLOATING HOVER TOOLTIP (LeoLabs Style) */}
      {hoveredObject && (
        <div 
          className="fixed pointer-events-none z-50 bg-slate-900/40 backdrop-blur-xl border border-white/10 p-2.5 rounded-xl text-xs font-mono shadow-2xl text-white animate-fade-in -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: hoveredObject.screenX, top: hoveredObject.screenY }}
        >
          <div className="font-bold text-cyan-neon flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>{hoveredObject.name}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            NORAD #{hoveredObject.norad_id} • {hoveredObject.type}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-space-800 text-[10px]">
            <div>Alt: <span className="text-white font-bold">{hoveredObject.alt_km.toFixed(1)} km</span></div>
            <div>Vel: <span className="text-cyan-400 font-bold">{hoveredObject.velocity_km_s.toFixed(2)} km/s</span></div>
          </div>
          <div className="text-[9px] text-cyan-400/80 mt-0.5 text-center">Double-click dot for full telemetry</div>
        </div>
      )}

      {/* TOP LEFT: Orbital Radar Floating Pill Badge & Expandable Multi-Fleet Dock */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-sm">
        <button
          type="button"
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="bg-slate-900/80 hover:bg-slate-900 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400 px-3.5 py-2 rounded-xl font-mono text-xs text-white shadow-2xl flex items-center justify-between gap-3 transition active:scale-95 group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400 group-hover:animate-pulse" />
            <span className="font-bold tracking-wider text-cyan-400 text-xs">ORBITAL RADAR</span>
          </div>
          {isLeftPanelOpen ? (
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white" />
          ) : (
            <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>

        {isLeftPanelOpen && (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 sm:gap-3 font-mono text-xs shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-220px)] overflow-y-auto">
            {/* Search Input & Live Suggestions Dropdown */}
            <div className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search Satellite, Starlink, Debris, NORAD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-space-950 border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {isSearchingCatalog && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute right-2.5 top-3" />
                )}
              </form>

              {/* Suggestions Dropdown */}
              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-space-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-2.5 py-1 text-[9px] text-cyan-400 uppercase tracking-wider font-bold bg-cyan-950/40 border-b border-space-800">
                    Live Catalog Matches ({searchSuggestions.length})
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
                      className="w-full px-2.5 py-1.5 text-left hover:bg-cyan-500/20 border-b border-space-900/60 last:border-none flex items-center justify-between gap-2 text-xs transition"
                    >
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400">NORAD #{item.norad_id} • {item.object_type}</span>
                      </div>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-space-900 text-cyan-300 font-mono flex-shrink-0">
                        {item.inclination ? `${item.inclination.toFixed(1)}°` : 'LEO'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* LeoLabs Fleet & Constellation Filters */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-cyan-400" />
                  Fleet & Constellations
                </span>
                <span className="text-[9px] text-cyan-400">
                  {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : (positions.length > 0 ? positions.length.toLocaleString() : objects.length.toLocaleString())} Tracked
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {[
                  { key: 'ALL', label: 'All Objects', count: fleetCounts.all, color: 'text-slate-200' },
                  { key: 'PAYLOAD', label: '◆ Operational', count: fleetCounts.operational, color: 'text-blue-400' },
                  { key: 'DEBRIS', label: '⬟ Debris Clouds', count: fleetCounts.debris, color: 'text-red-400' },
                  { key: 'STARLINK', label: '◆ Starlink', count: fleetCounts.starlink, color: 'text-purple-400' },
                  { key: 'ONEWEB', label: '◆ OneWeb', count: fleetCounts.oneweb, color: 'text-white' },
                  { key: 'ROCKET', label: '❚ Rocket Bodies', count: fleetCounts.rocket, color: 'text-yellow-400' },
                  { key: 'GPS', label: '◆ GPS / GNSS', count: fleetCounts.gps, color: 'text-green-400' }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => { setActiveFleetFilter(f.key); setIsDebrisMode(false); }}
                    className={`px-2 py-1 rounded transition text-left flex items-center justify-between gap-1 ${
                      activeFleetFilter === f.key && !isDebrisMode
                        ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                        : 'bg-space-950 text-slate-400 hover:text-slate-200 border border-space-800'
                    }`}
                  >
                    <span className={`truncate text-[11px] ${f.color}`}>{f.label}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-space-900 border border-space-800 text-slate-300 font-mono flex-shrink-0">
                      {f.count.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Altitude Shell Filter */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>Orbital Regime</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {[
                  { key: 'ALL', label: 'ALL', count: fleetCounts.all },
                  { key: 'LEO', label: 'LEO', count: fleetCounts.leo },
                  { key: 'MEO', label: 'MEO', count: fleetCounts.meo },
                  { key: 'GEO', label: 'GEO', count: fleetCounts.geo }
                ].map((alt) => (
                  <button
                    key={alt.key}
                    type="button"
                    onClick={() => setAltitudeFilter(alt.key)}
                    className={`py-1 px-1 rounded text-center flex flex-col items-center justify-center transition ${
                      altitudeFilter === alt.key
                        ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                        : 'bg-space-950 text-slate-400 hover:text-slate-200 border border-space-800'
                    }`}
                  >
                    <span className="font-bold">{alt.label}</span>
                    <span className="text-[8px] text-cyan-400/80 font-mono">{alt.count.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Overlays: Orbit Rings & Debris Mode */}
            <div className="pt-2 border-t border-space-800 flex items-center justify-between">
              <button
                onClick={() => setShowOrbitRings(!showOrbitRings)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                  showOrbitRings
                    ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/40'
                    : 'bg-space-950 text-slate-500 border-space-800'
                }`}
              >
                <Compass className="w-3 h-3" />
                ORBIT RINGS
              </button>

              <button
                onClick={() => setIsDebrisMode(!isDebrisMode)}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                  isDebrisMode
                    ? 'bg-danger-600 text-white border-danger-400 shadow-md'
                    : 'bg-space-950 text-danger-400 border-space-800'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                DEBRIS ISOLATE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TOP RIGHT: Global View Toggles & Clock (Reference Design Match) */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 flex items-center gap-2">
        {/* UTC Clock */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 px-3.5 py-2 rounded-xl font-mono text-xs text-cyan-400 shadow-2xl flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold tracking-wider">UTC: {simTime.toISOString().replace('T', ' ').substring(11, 19)}</span>
        </div>

        {/* Camera Reset & Fullscreen */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 p-1 rounded-xl flex items-center gap-1 shadow-2xl">
          <button
            onClick={handleResetCamera}
            className="p-1.5 hover:bg-space-800 rounded-lg text-slate-300 hover:text-cyan-400 transition cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-space-800 rounded-lg text-slate-300 hover:text-cyan-400 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Persistent Real-Time Collision Hazards & Hotspots HUD */}
      {isRightPanelMinimized ? (
        <button
          type="button"
          onClick={() => setIsRightPanelMinimized(false)}
          className="absolute top-14 sm:top-16 right-3 sm:right-4 z-30 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-xl border border-danger-500/60 shadow-[0_0_25px_rgba(239,68,68,0.4)] px-3.5 py-2 rounded-xl font-mono text-xs text-white flex items-center gap-2.5 transition active:scale-95 group cursor-pointer"
        >
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger-500"></span>
          </div>
          <AlertTriangle className="w-4 h-4 text-danger-400 animate-pulse" />
          <span className="font-bold tracking-wider text-danger-300 text-xs animate-pulse">
            {conjunctions.length > 0 ? `${conjunctions.length} HAZARDS` : 'ALERTS HUD'}
          </span>
          <ChevronLeft className="w-4 h-4 text-danger-400 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      ) : (
        <div className="absolute top-14 sm:top-16 right-3 sm:right-4 z-30 w-80 sm:w-96 max-w-[92vw] bg-slate-900/80 backdrop-blur-xl border border-white/10 p-3 sm:p-3.5 rounded-2xl font-mono text-[11px] shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-140px)] flex flex-col gap-2.5">
          
          {/* Header & Mode Switcher */}
          <div className="flex items-center justify-between border-b border-space-800 pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightPanelTab('ALERTS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                  rightPanelTab === 'ALERTS'
                    ? 'bg-danger-500/20 text-danger-neon border border-danger-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-500"></span>
                </div>
                <span>HOTSPOTS ({conjunctions.length})</span>
              </button>

              {selectedObject && (
                <button
                  type="button"
                  onClick={() => setRightPanelTab('TELEMETRY')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                    rightPanelTab === 'TELEMETRY'
                      ? 'bg-cyan-500/20 text-cyan-neon border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="truncate max-w-[90px]">{selectedObject.name}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsRightPanelMinimized(true)}
                className="p-1 hover:bg-space-800 rounded-lg text-slate-400 hover:text-white transition"
                title="Minimize Alerts Panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB 1: CONJUNCTION ALERTS & HOTSPOTS */}
          {rightPanelTab === 'ALERTS' && (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 custom-scrollbar">
              
              {/* Blinking Critical Hazard Alert Banner */}
              <div className="bg-danger-950/80 border border-danger-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)] rounded-xl p-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger-500"></span>
                  </div>
                  <span className="font-bold text-danger-neon text-xs tracking-wider animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    LIVE COLLISION RISK MONITOR
                  </span>
                </div>
                <div className="text-[10px] text-danger-200/90 mt-1 leading-tight">
                  {conjunctions.length > 0 ? (
                    <>
                      <span className="font-bold text-white underline">{conjunctions.length} close-approach encounters</span> detected via SGP4 propagation. High-urgency collision mitigation required.
                    </>
                  ) : (
                    'Real-time orbital propagation active. Screening 4,000+ objects for close passes.'
                  )}
                </div>
              </div>

              {/* List of All Conjunction Hotspots */}
              {(() => {
                const upcomingConjs = conjunctions.filter((c) => {
                  const tcaMs = parseUtcDate(c.tca).getTime();
                  return tcaMs > Date.now();
                });

                if (upcomingConjs.length === 0) {
                  return (
                    <div className="p-4 text-center text-slate-500 text-xs bg-space-950/40 rounded-xl border border-space-800">
                      No critical close approaches detected within current threshold.
                    </div>
                  );
                }

                return upcomingConjs.map((conj) => {
                  const isCrit = conj.risk_level === 'CRITICAL' || conj.miss_distance_km < 5;
                  const isHigh = conj.risk_level === 'HIGH' || conj.miss_distance_km < 15;
                  const tcaCountdown = formatTcaCountdown(conj.tca, simTime);
                  const isSelected = selectedConjunction?.id === conj.id;

                  return (
                    <div
                      key={conj.id}
                      className={`p-2.5 rounded-xl border transition ${
                        isSelected
                          ? 'bg-danger-950/90 border-danger-400 shadow-lg shadow-danger-500/20'
                          : isCrit
                          ? 'bg-danger-950/60 border-danger-500/50 hover:border-danger-400'
                          : isHigh
                          ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400'
                          : 'bg-space-950/70 border-space-800 hover:border-space-700'
                      }`}
                    >
                      {/* Encounter Header */}
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="truncate pr-1">
                          <div className="font-bold text-white text-xs truncate">
                            <span className="text-cyan-400">{conj.object_a?.name || 'Primary'}</span>
                            <span className="text-slate-400 mx-1">↔</span>
                            <span className="text-danger-400">{conj.object_b?.name || 'Threat'}</span>
                          </div>
                          <div className="text-[9px] text-slate-400">
                            #{conj.object_a?.norad_id} vs #{conj.object_b?.norad_id}
                          </div>
                        </div>

                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase flex-shrink-0 ${
                          isCrit
                            ? 'bg-danger-500 text-white animate-pulse'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        }`}>
                          {conj.risk_level} ({conj.risk_score})
                        </span>
                      </div>

                      {/* Telemetry Metrics */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-space-950/70 p-2 rounded-lg border border-space-800/80 mb-2 font-mono">
                        <div>
                          <span className="text-slate-400">Miss Dist: </span>
                          <span className={`font-bold ${isCrit ? 'text-danger-neon' : isHigh ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {conj.miss_distance_km.toFixed(2)} km
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Rel Speed: </span>
                          <span className="text-white font-bold">{conj.relative_velocity_km_s.toFixed(2)} km/s</span>
                        </div>
                        <div>
                          <span className="text-slate-400">TCA: </span>
                          <span className="text-white">{new Date(conj.tca).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Timer: </span>
                          <span className={`font-bold font-mono ${isCrit ? 'text-danger-400 animate-pulse' : 'text-amber-300'}`}>
                            {tcaCountdown}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => { onSelectConjunction(conj); handleJumpToTca(conj); }}
                          className="py-1 px-1 bg-danger-600 hover:bg-danger-500 text-white rounded-lg font-bold text-[9px] sm:text-[10px] flex items-center justify-center gap-0.5 sm:gap-1 shadow transition active:scale-95 cursor-pointer"
                          title="Focus 3D Scene and blink both encounter objects"
                        >
                          <FastForward className="w-3 h-3" />
                          FOCUS 3D
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateTo2DTrack) {
                              onNavigateTo2DTrack(conj);
                            }
                          }}
                          className="py-1 px-1 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-lg font-bold text-[9px] sm:text-[10px] flex items-center justify-center gap-0.5 sm:gap-1 shadow transition active:scale-95 cursor-pointer"
                          title="View both objects' ground tracks together on 2D map"
                        >
                          <Compass className="w-3 h-3" />
                          2D TRACK
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenConjunctionDetails(conj)}
                          className="py-1 px-1 bg-space-900 hover:bg-space-800 text-cyan-400 border border-cyan-500/40 rounded-lg font-bold text-[9px] sm:text-[10px] flex items-center justify-center gap-0.5 sm:gap-1 transition cursor-pointer"
                          title="Open Conjunction CDM Report"
                        >
                          <Radio className="w-3 h-3" />
                          REPORT
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* TAB 2: SELECTED OBJECT TELEMETRY */}
          {rightPanelTab === 'TELEMETRY' && selectedObject && (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 custom-scrollbar">
              <div className="flex items-start justify-between border-b border-space-800 pb-1.5">
                <div>
                  <div className="font-bold text-cyan-neon text-xs truncate max-w-[220px]">{selectedObject.name}</div>
                  <div className="text-[9px] text-slate-400">
                    NORAD #{selectedObject.norad_id} • <span className="text-cyan-400">{selectedObject.object_type.replace('_', ' ')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onSelectObject(null); setRightPanelTab('ALERTS'); }}
                  className="p-1 hover:bg-space-800 rounded text-slate-400 hover:text-white"
                  title="Deselect Satellite"
                >
                  ✕
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFollowMode(!isFollowMode)}
                  className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition flex items-center justify-center gap-1 ${
                    isFollowMode
                      ? 'bg-cyan-500 text-space-950 border-cyan-400 shadow-md'
                      : 'bg-space-900 text-cyan-400 border-cyan-500/30 hover:bg-space-800'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  {isFollowMode ? 'TRACKING' : 'LOCK ORBIT'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGroundTrack(!showGroundTrack)}
                  className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition flex items-center justify-center gap-1 ${
                    showGroundTrack
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-space-900 text-slate-400 border-space-800 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  GROUND TRACK
                </button>
              </div>

              {/* Live Real-Time SGP4 Coordinates */}
              <div className="space-y-1 bg-space-950/70 p-2 rounded-lg border border-space-800 text-[10px]">
                <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
                  <span>LIVE SGP4 TELEMETRY</span>
                  <span className="text-emerald-400 text-[8px]">● REALTIME</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Altitude:</span>
                  <span className="text-white font-bold">{selectedPos ? `${selectedPos.alt_km.toFixed(1)} km` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Velocity:</span>
                  <span className="text-cyan-400 font-bold">{selectedPos ? `${selectedPos.velocity_km_s.toFixed(2)} km/s` : '7.65 km/s'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lat / Lon:</span>
                  <span className="text-slate-200">{selectedPos ? `${selectedPos.lat.toFixed(2)}°, ${selectedPos.lon.toFixed(2)}°` : '—'}</span>
                </div>
              </div>

              {/* Orbital Elements */}
              <div className="space-y-1 bg-space-950/70 p-2 rounded-lg border border-space-800 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Inclination:</span>
                  <span className="text-slate-200">{selectedObject.inclination != null ? `${selectedObject.inclination.toFixed(2)}°` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Perigee / Apogee:</span>
                  <span className="text-slate-200">
                    {selectedObject.perigee_km ? `${selectedObject.perigee_km.toFixed(0)} - ${selectedObject.apogee_km?.toFixed(0)} km` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Period:</span>
                  <span className="text-slate-200">{selectedObject.period_minutes ? `${selectedObject.period_minutes.toFixed(1)} min` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data Source:</span>
                  <span className="text-cyan-400 font-bold">{selectedObject.source || 'Space-Track'}</span>
                </div>
              </div>

              {/* Orbit Ribbon Controls */}
              <div className="pt-1">
                <div className="text-[9px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>ORBIT RIBBON:</span>
                  <span className="text-cyan-400 font-bold">+{trajectoryHours}H</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 6, 12, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTrajectoryHours(h)}
                      className={`py-0.5 rounded text-[9px] font-bold transition ${
                        trajectoryHours === h
                          ? 'bg-cyan-500 text-space-950'
                          : 'bg-space-900 text-slate-400 hover:text-white border border-space-800'
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

      {/* BOTTOM BAR: Astrodynamics Mission Control Dock */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20 bg-slate-900/40 backdrop-blur-xl border border-white/10 p-2 sm:p-2.5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4 font-mono text-xs shadow-2xl">
        {/* Play/Pause & Speed Multipliers */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 sm:p-1.5 bg-cyan-500 text-space-950 font-bold rounded-lg hover:bg-cyan-400 transition"
              title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <div className="flex items-center gap-0.5 sm:gap-1 bg-space-950 p-1 rounded-lg border border-space-800">
              {[1, 10, 50, 200, 1000].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                    simSpeed === spd
                      ? 'bg-cyan-500 text-space-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}X
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setSimTime(new Date()); setSimSpeed(50); }}
            className="px-2 sm:px-2.5 py-1 bg-space-950 hover:bg-space-800 text-cyan-400 border border-space-700 rounded-lg text-[9px] sm:text-[10px] font-bold transition"
          >
            NOW
          </button>
        </div>

        {/* Timeline Horizon Scrubber */}
        <div className="flex items-center gap-2 flex-1 max-w-full md:max-w-md">
          <span className="text-[9px] sm:text-[10px] text-slate-400">PROPAGATE:</span>
          <input
            type="range"
            min="0"
            max="86400"
            step="300"
            value={(simTime.getTime() - new Date().getTime()) / 1000}
            onChange={(e) => {
              const offsetSec = parseFloat(e.target.value);
              setSimTime(new Date(Date.now() + offsetSec * 1000));
            }}
            className="w-full h-1.5 bg-space-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="text-[10px] text-cyan-400 font-bold whitespace-nowrap">
            {((simTime.getTime() - Date.now()) / 3600000).toFixed(1)}h
          </span>
        </div>

        {/* Quick Conjunction Encounter List */}
        {conjunctions.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[10px] text-danger-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              HOTSPOTS:
            </span>
            {conjunctions.slice(0, 2).map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelectConjunction(c); handleJumpToTca(c); }}
                className="px-2 py-0.5 bg-danger-500/20 text-danger-300 border border-danger-500/40 rounded text-[10px] font-bold hover:bg-danger-500/30 transition"
              >
                {c.miss_distance_km.toFixed(1)} km ({new Date(c.tca).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
