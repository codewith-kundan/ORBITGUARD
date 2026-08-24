import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  AlertTriangle,
  Clock, 
  Crosshair, 
  FastForward, 
  Share2, 
  Sliders,
  Compass
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
}

const EARTH_RADIUS = 6.371; // 1 unit = 1000 km in 3D scene

// Known Phased-Array Space Radars (LeoLabs & Global SSA Network)
const RADAR_STATIONS = [
  { name: 'Kiwi Space Radar', lat: -45.03, lon: 169.68, country: 'New Zealand', color: 0xef4444, maxAlt: 2.2, span: 1.2 },
  { name: 'Costa Rica Space Radar', lat: 10.02, lon: -84.18, country: 'Costa Rica', color: 0xf97316, maxAlt: 2.0, span: 1.1 },
  { name: 'Alaska Space Radar', lat: 64.84, lon: -147.72, country: 'United States', color: 0xef4444, maxAlt: 2.2, span: 1.3 },
  { name: 'Texas Space Radar', lat: 31.96, lon: -99.90, country: 'United States', color: 0xf59e0b, maxAlt: 1.8, span: 1.0 },
  { name: 'Azores Space Radar', lat: 38.72, lon: -27.22, country: 'Portugal', color: 0xef4444, maxAlt: 2.1, span: 1.2 },
  { name: 'West Australia Radar', lat: -29.04, lon: 115.34, country: 'Australia', color: 0xef4444, maxAlt: 2.0, span: 1.1 },
];

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
  const JD = 2440587.5 + date.getTime() / 86400000;
  const T = (JD - 2451545.0) / 36525.0;
  
  const D = (297.8501921 + 445267.1114034 * T) % 360;
  const M = (357.5291092 + 35999.0502909 * T) % 360;
  const Mp = (134.9633964 + 477198.8675055 * T) % 360;
  const L0 = (218.3164477 + 481267.88123421 * T) % 360;
  
  const toRad = Math.PI / 180;
  
  const eclLon = (L0 + 6.289 * Math.sin(Mp * toRad)
    - 1.274 * Math.sin((2 * D - Mp) * toRad)
    + 0.658 * Math.sin(2 * D * toRad)
    - 0.214 * Math.sin(2 * Mp * toRad)
    - 0.186 * Math.sin(M * toRad)) * toRad;
    
  const eclLat = (5.128 * Math.sin((93.272 + 483202.0175 * T) * toRad)) * toRad;
  const obliquity = 23.439 * toRad;
  
  const x = Math.cos(eclLat) * Math.cos(eclLon);
  const y = Math.cos(obliquity) * Math.cos(eclLat) * Math.sin(eclLon) - Math.sin(obliquity) * Math.sin(eclLat);
  const z = Math.sin(obliquity) * Math.cos(eclLat) * Math.sin(eclLon) + Math.cos(obliquity) * Math.sin(eclLat);
  
  const moonDistance = 60;
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
  onOpenConjunctionDetails
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // UI State (LeoLabs Style Multi-Filter & Control Dock)
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // LeoLabs Checkbox Toggles
  const [showDebris, setShowDebris] = useState<boolean>(true);
  const [showBeams, setShowBeams] = useState<boolean>(true);
  const [showInstruments, setShowInstruments] = useState<boolean>(true);
  const [followEarth, setFollowEarth] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // LeoLabs Views selector
  const [activeView, setActiveView] = useState<'type' | 'perigee' | 'period' | 'inclination' | 'country'>('type');

  // LeoLabs Filters
  const [minPerigee, setMinPerigee] = useState<string>('');
  const [maxPerigee, setMaxPerigee] = useState<string>('');

  const [isFollowMode, setIsFollowMode] = useState<boolean>(false);
  const [showGroundTrack, setShowGroundTrack] = useState<boolean>(true);
  const [showOrbitRings] = useState<boolean>(true);

  // Time Engine State
  const [simTime, setSimTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(25);
  const [trajectoryHours] = useState<number>(12);

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

  // Share link feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Live Position synchronization refs
  const positionsRef = useRef<OrbitalPosition[]>([]);
  const livePositionsRef = useRef<OrbitalPosition[]>([]);
  const visiblePositionsRef = useRef<OrbitalPosition[]>([]);
  const objectsRef = useRef<OrbitalObject[]>([]);
  const isFollowModeRef = useRef<boolean>(false);
  const selectedPosRef = useRef<OrbitalPosition | null>(null);
  const isPlayingRef = useRef<boolean>(true);
  const simSpeedRef = useRef<number>(25);
  const showDebrisRef = useRef<boolean>(true);
  const minPerigeeRef = useRef<number | null>(null);
  const maxPerigeeRef = useRef<number | null>(null);

  positionsRef.current = positions;
  objectsRef.current = objects;
  isFollowModeRef.current = isFollowMode;
  selectedPosRef.current = selectedPos;
  isPlayingRef.current = isPlaying;
  simSpeedRef.current = simSpeed;
  showDebrisRef.current = showDebris;
  minPerigeeRef.current = minPerigee ? parseFloat(minPerigee) : null;
  maxPerigeeRef.current = maxPerigee ? parseFloat(maxPerigee) : null;

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const radarGroupRef = useRef<THREE.Group | null>(null);

  // LeoLabs Instanced Meshes (Color-coded by type)
  const satMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const starlinkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const debrisMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rocketMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const unknownMeshRef = useRef<THREE.InstancedMesh | null>(null);
  
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const groundTrackLineRef = useRef<THREE.Line | null>(null);
  const conjLineRef = useRef<THREE.Line | null>(null);
  const orbitRingsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const simTimeRef = useRef<Date>(simTime);
  const satrecMapRef = useRef<Map<number, { satrec: any; name: string; type: ObjectType; norad_id: number; perigee_km?: number; period_min?: number; inclination?: number; country?: string }>>(new Map());

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
                norad_id: obj.norad_id,
                perigee_km: obj.perigee_km,
                period_min: obj.period_minutes,
                inclination: obj.inclination,
                country: obj.country_code || obj.country
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
        const batch = await api.getBatchPositions(simTime.toISOString(), 2500);
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
    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(fetchPositions, 30000);
    }
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Fetch Trajectory Ribbon
  useEffect(() => {
    if (!selectedObject) {
      setTrajectoryData(null);
      setGroundTrackData(null);
      return;
    }

    let isMounted = true;
    const fetchTrajectoryAndTrack = async () => {
      try {
        const [traj, track] = await Promise.all([
          api.getObjectTrajectory(selectedObject.norad_id, trajectoryHours, 4, simTime.toISOString()).catch(() => null),
          api.getObjectGroundTrack(selectedObject.norad_id, 180, 2, simTime.toISOString()).catch(() => null)
        ]);

        if (isMounted) {
          if (traj) setTrajectoryData(traj);
          if (track) setGroundTrackData(track);
        }
      } catch (err) {
        console.error('Failed to fetch telemetry tracks:', err);
      }
    };

    fetchTrajectoryAndTrack();
    return () => { isMounted = false; };
  }, [selectedObject, trajectoryHours]);

  // SGP4 High-Speed Astrodynamics Time Propagator
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setSimTime((prev) => new Date(prev.getTime() + (simSpeedRef.current * 1000) / 10));
    }, 100);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Toggle Radar Beams visibility in Three.js scene
  useEffect(() => {
    if (radarGroupRef.current) {
      radarGroupRef.current.visible = showBeams;
    }
  }, [showBeams]);

  // Toggle Orbit Rings
  useEffect(() => {
    if (orbitRingsGroupRef.current) {
      orbitRingsGroupRef.current.visible = showOrbitRings;
    }
  }, [showOrbitRings]);

  // INITIALIZE THREE.JS PHOTOREALISTIC SPACE ENVIRONMENT
  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene & Depth Configuration
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020611); // Deepest space black-blue
    sceneRef.current = scene;

    // 2. High-Precision Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      2500
    );
    camera.position.set(0, 11, 27);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Dynamic Range
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Smooth Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = EARTH_RADIUS + 0.35;
    controls.maxDistance = 220;
    controls.autoRotate = false;
    controlsRef.current = controls;

    // 5. Deep Space Milky Way Starfield
    const starsCount = 4000;
    const starsGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 900 + Math.random() * 300;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      starColors[i * 3] = brightness * 0.9;
      starColors[i * 3 + 1] = brightness * 0.95;
      starColors[i * 3 + 2] = brightness;
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starsGeom, starsMat));

    // 6. Solar Illuminator
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunLight.position.set(120, 20, 90);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const sunGeom = new THREE.SphereGeometry(3.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.position.copy(sunLight.position);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    scene.add(new THREE.AmbientLight(0x1a2638, 0.45));

    // 7. Photorealistic Earth Body with Day/Night Shader
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
          
          vec3 nightAmbient = dayColor.rgb * 0.30 + nightColor.rgb * 1.8;
          vec3 finalColor = mix(nightAmbient, dayColor.rgb * 1.25, dayMix);
          
          float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
          finalColor += vec3(0.08, 0.65, 1.0) * pow(rim, 3.0) * 0.6;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMesh = new THREE.Mesh(earthGeom, earthShaderMat);
    earthMesh.rotation.y = -Math.PI / 2;
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 8. Atmospheric Clouds Layer
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
    cloudsMeshRef.current = cloudMesh;

    // 9. Atmospheric Glow
    const atmosGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.04, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeom, atmosMat));

    // 10. Lunar Body
    const moonTexture = texLoader.load('/textures/moon.jpg');
    const moonGeom = new THREE.SphereGeometry(1.737, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.9 });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    scene.add(moonMesh);
    if (moonMeshRef) moonMeshRef.current = moonMesh;

    // 11. LeoLabs Radar Beams Group & Ground Pins
    const radarGroup = new THREE.Group();
    RADAR_STATIONS.forEach(site => {
      const latRad = (site.lat * Math.PI) / 180;
      const lonRad = (site.lon * Math.PI) / 180;
      
      const r0 = EARTH_RADIUS;
      const origin = new THREE.Vector3(
        r0 * Math.cos(latRad) * Math.cos(lonRad),
        r0 * Math.sin(latRad),
        -r0 * Math.cos(latRad) * Math.sin(lonRad)
      );
      
      const normal = origin.clone().normalize();
      const segments = 16;
      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      
      const up = Math.abs(normal.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const tangent = new THREE.Vector3().crossVectors(normal, up).normalize();
      const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      
      vertices.push(origin.x, origin.y, origin.z);
      uvs.push(0.5, 0);
      
      const halfSpan = site.span * 0.5;
      for (let i = 0; i <= segments; i++) {
        const frac = i / segments;
        const angle = (frac - 0.5) * halfSpan;
        
        const dir = normal.clone()
          .add(tangent.clone().multiplyScalar(Math.sin(angle) * 0.9))
          .add(bitangent.clone().multiplyScalar(Math.cos(angle) * 0.1))
          .normalize();
          
        const topPt = origin.clone().add(dir.multiplyScalar(site.maxAlt));
        vertices.push(topPt.x, topPt.y, topPt.z);
        uvs.push(frac, 1.0);
      }
      
      for (let i = 1; i <= segments; i++) {
        indices.push(0, i, i + 1);
      }
      
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      
      const mat = new THREE.MeshBasicMaterial({
        color: site.color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      const fanMesh = new THREE.Mesh(geom, mat);
      radarGroup.add(fanMesh);
      
      // Ground Instrument Station Pin Marker
      const pinGeom = new THREE.RingGeometry(0.06, 0.12, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
      const pinMesh = new THREE.Mesh(pinGeom, pinMat);
      pinMesh.position.copy(origin.clone().multiplyScalar(1.002));
      pinMesh.lookAt(origin.clone().add(normal));
      radarGroup.add(pinMesh);
    });
    scene.add(radarGroup);
    radarGroupRef.current = radarGroup;

    // 12. Reference Orbital Altitude Rings
    const ringsGroup = new THREE.Group();
    const ringDefs = [
      { alt: 420, color: 0x22c55e, label: 'ISS ~420km' },
      { alt: 550, color: 0x4ade80, label: 'Starlink ~550km' },
      { alt: 800, color: 0x38bdf8, label: 'Sun-sync ~800km' },
      { alt: 20200, color: 0x3b82f6, label: 'MEO/GPS ~20,200km' },
    ];
    ringDefs.forEach(({ alt, color }) => {
      const ringRadius = EARTH_RADIUS + alt / 1000;
      const ringGeom = new THREE.RingGeometry(ringRadius - 0.01, ringRadius + 0.01, 128);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ringsGroup.add(ring);
    });
    scene.add(ringsGroup);
    orbitRingsGroupRef.current = ringsGroup;

    // 13. LEOLABS COLOR-CODED INSTANCED MESHES:
    const maxInst = 2500;

    // A) Payload / Active Satellite (LeoLabs Green #22c55e)
    const satGeom = new THREE.OctahedronGeometry(0.19, 0);
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x054415,
      roughness: 0.15,
      metalness: 0.9
    });
    const satMesh = new THREE.InstancedMesh(satGeom, satMat, maxInst);
    satMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(satMesh);
    satMeshRef.current = satMesh;

    // B) Megaconstellations (LeoLabs Light Green #4ade80)
    const starlinkGeom = new THREE.OctahedronGeometry(0.18, 0);
    const starlinkMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x104420,
      roughness: 0.15,
      metalness: 0.9
    });
    const starlinkMesh = new THREE.InstancedMesh(starlinkGeom, starlinkMat, maxInst);
    starlinkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(starlinkMesh);
    starlinkMeshRef.current = starlinkMesh;

    // C) Debris Fragments (LeoLabs Vivid Red #ef4444)
    const debrisGeom = new THREE.DodecahedronGeometry(0.17, 0);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x660505,
      roughness: 0.25,
      metalness: 0.8
    });
    const debrisMesh = new THREE.InstancedMesh(debrisGeom, debrisMat, maxInst);
    debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(debrisMesh);
    debrisMeshRef.current = debrisMesh;

    // D) Rocket Bodies (LeoLabs Amber/Orange #f59e0b)
    const rocketGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.36, 8);
    const rocketMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x553300,
      roughness: 0.3,
      metalness: 0.8
    });
    const rocketMesh = new THREE.InstancedMesh(rocketGeom, rocketMat, maxInst);
    rocketMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(rocketMesh);
    rocketMeshRef.current = rocketMesh;

    // E) Unknown / Uncorrelated Objects (LeoLabs Blue #3b82f6)
    const unknownGeom = new THREE.OctahedronGeometry(0.17, 0);
    const unknownMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x052266,
      roughness: 0.2,
      metalness: 0.8
    });
    const unknownMesh = new THREE.InstancedMesh(unknownGeom, unknownMat, maxInst);
    unknownMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(unknownMesh);
    unknownMeshRef.current = unknownMesh;

    // Screen-Space Distance Hit Tester
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

    // Click Detection
    const handleClick = (e: MouseEvent) => {
      const match = findClosestDot(e.clientX, e.clientY, 28);
      if (match) {
        const found = objectsRef.current.find((o) => o.norad_id === match.pos.norad_id);
        if (found) {
          onSelectObject(found);
          setSelectedPos(match.pos);
        } else {
          onSelectObject({
            id: match.pos.norad_id,
            norad_id: match.pos.norad_id,
            name: match.pos.name,
            object_type: match.pos.type,
            source: 'Space-Track',
            tle_line1: match.pos.tle_line1 || '',
            tle_line2: match.pos.tle_line2 || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          setSelectedPos(match.pos);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousemove', handlePointerMove);
    domElem.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let tumbleAngle = 0;

    // Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();

      const delta = clock.getDelta();
      tumbleAngle += delta * 2.5;

      const currentSimDate = simTimeRef.current || new Date();
      const gmst = satellite.gstime(currentSimDate);
      const dummy = new THREE.Object3D();
      const currentVisible: OrbitalPosition[] = [];

      let satIdx = 0;
      let starlinkIdx = 0;
      let debrisIdx = 0;
      let rocketIdx = 0;
      let unknownIdx = 0;

      const showDeb = showDebrisRef.current;
      const minP = minPerigeeRef.current;
      const maxP = maxPerigeeRef.current;

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

            // LeoLabs Filter Rules
            if (!showDeb && pos.type === 'DEBRIS') return;
            if (minP != null && alt < minP) return;
            if (maxP != null && alt > maxP) return;

            const nameUpper = (pos.name || '').toUpperCase();
            const isStarlink = nameUpper.includes('STARLINK');
            const isOneWeb = nameUpper.includes('ONEWEB');

            currentVisible.push(pos);

            dummy.position.set(x3d, y3d, z3d);
            const isSelected = selectedObject?.norad_id === pos.norad_id;
            const scale = isSelected ? 3.2 : 1.1;
            dummy.scale.set(scale, scale, scale);

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
            } else if (isStarlink || isOneWeb) {
              if (starlinkMeshRef.current && starlinkIdx < maxInst) {
                dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
                dummy.updateMatrix();
                starlinkMeshRef.current.setMatrixAt(starlinkIdx, dummy.matrix);
                starlinkIdx++;
              }
            } else if (pos.type === 'UNKNOWN') {
              if (unknownMeshRef.current && unknownIdx < maxInst) {
                dummy.rotation.set(0, tumbleAngle * 0.4 + pos.norad_id, 0);
                dummy.updateMatrix();
                unknownMeshRef.current.setMatrixAt(unknownIdx, dummy.matrix);
                unknownIdx++;
              }
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
            // Skip invalid propagation frame
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
      if (debrisMeshRef.current) {
        debrisMeshRef.current.count = debrisIdx;
        debrisMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (rocketMeshRef.current) {
        rocketMeshRef.current.count = rocketIdx;
        rocketMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (unknownMeshRef.current) {
        unknownMeshRef.current.count = unknownIdx;
        unknownMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      // Follow Camera
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

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('mousemove', handlePointerMove);
      domElem.removeEventListener('click', handleClick);
      renderer.dispose();
      if (mountRef.current && domElem) {
        mountRef.current.removeChild(domElem);
      }
    };
  }, []);

  // Update Earth Rotation, Solar Lighting & Lunar Coordinates
  useEffect(() => {
    const sunDir = calculateSunDirection(simTime);
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunDir.clone().multiplyScalar(150));
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.position.copy(sunDir.clone().multiplyScalar(150));
    }
    if (earthMeshRef.current) {
      const mat = earthMeshRef.current.material as THREE.ShaderMaterial;
      if (mat.uniforms?.sunDirection) {
        mat.uniforms.sunDirection.value.copy(sunDir);
      }
    }
    if (moonMeshRef.current) {
      const moonPos = calculateMoonPosition(simTime);
      moonMeshRef.current.position.copy(moonPos);
    }
  }, [simTime]);

  // Update Trajectory Ribbon
  useEffect(() => {
    if (!sceneRef.current) return;
    if (trajectoryLineRef.current) {
      sceneRef.current.remove(trajectoryLineRef.current);
      trajectoryLineRef.current.geometry.dispose();
      trajectoryLineRef.current = null;
    }

    if (trajectoryData && trajectoryData.points.length > 0) {
      const pts: THREE.Vector3[] = [];
      const currentSimDate = simTimeRef.current || new Date();
      const gmst = satellite.gstime(currentSimDate);

      trajectoryData.points.forEach((pt) => {
        const xEci = pt.x_km;
        const yEci = pt.y_km;
        const zEci = pt.z_km;
        const ecf = satellite.eciToEcf({ x: xEci, y: yEci, z: zEci }, gmst);
        pts.push(new THREE.Vector3(ecf.x / 1000, ecf.z / 1000, -ecf.y / 1000));
      });

      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const isDebris = trajectoryData.object_type === 'DEBRIS';
      const lineMat = new THREE.LineBasicMaterial({
        color: isDebris ? 0xef4444 : 0x22c55e,
        transparent: true,
        opacity: 0.85,
        linewidth: 2
      });
      const line = new THREE.Line(lineGeom, lineMat);
      sceneRef.current.add(line);
      trajectoryLineRef.current = line;
    }
  }, [trajectoryData, simTime]);

  // Update Ground Track Ribbon
  useEffect(() => {
    if (!sceneRef.current) return;
    if (groundTrackLineRef.current) {
      sceneRef.current.remove(groundTrackLineRef.current);
      groundTrackLineRef.current.geometry.dispose();
      groundTrackLineRef.current = null;
    }

    if (showGroundTrack && _groundTrackData && _groundTrackData.points.length > 0) {
      const pts: THREE.Vector3[] = [];
      _groundTrackData.points.forEach((pt) => {
        const latRad = (pt.lat * Math.PI) / 180;
        const lonRad = (pt.lon * Math.PI) / 180;
        const r = EARTH_RADIUS * 1.002;
        pts.push(new THREE.Vector3(
          r * Math.cos(latRad) * Math.cos(lonRad),
          r * Math.sin(latRad),
          -r * Math.cos(latRad) * Math.sin(lonRad)
        ));
      });

      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x00f0ff,
        dashSize: 0.15,
        gapSize: 0.08,
        transparent: true,
        opacity: 0.65
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.computeLineDistances();
      sceneRef.current.add(line);
      groundTrackLineRef.current = line;
    }
  }, [showGroundTrack, _groundTrackData]);

  // Update Conjunction Vector Indicator
  useEffect(() => {
    if (!sceneRef.current) return;
    if (conjLineRef.current) {
      sceneRef.current.remove(conjLineRef.current);
      conjLineRef.current.geometry.dispose();
      conjLineRef.current = null;
    }

    if (selectedConjunction) {
      const posA = positions.find((p) => p.norad_id === selectedConjunction.object_a_id);
      const posB = positions.find((p) => p.norad_id === selectedConjunction.object_b_id);

      if (posA && posB) {
        const p1 = new THREE.Vector3(posA.x_km / 1000, posA.z_km / 1000, -posA.y_km / 1000);
        const p2 = new THREE.Vector3(posB.x_km / 1000, posB.z_km / 1000, -posB.y_km / 1000);

        const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xff0044,
          dashSize: 0.3,
          gapSize: 0.15,
          linewidth: 3
        });
        const line = new THREE.Line(lineGeom, lineMat);
        line.computeLineDistances();
        sceneRef.current.add(line);
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

  const handleCopyShare = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className={`relative w-full h-[calc(100vh-140px)] min-h-[580px] bg-[#020611] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 h-screen rounded-none border-none' : ''}`}>
      {/* 3D WebGL Canvas Mounting Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* FLOATING HOVER TOOLTIP */}
      {hoveredObject && (
        <div 
          className="fixed pointer-events-none z-50 bg-slate-900/90 backdrop-blur-xl border border-white/20 p-2.5 rounded-xl text-xs font-mono shadow-2xl text-white animate-fade-in -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: hoveredObject.screenX, top: hoveredObject.screenY }}
        >
          <div className="font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{hoveredObject.name}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            NORAD #{hoveredObject.norad_id} • {hoveredObject.type}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-slate-800 text-[10px]">
            <div>Alt: <span className="text-white font-bold">{hoveredObject.alt_km.toFixed(1)} km</span></div>
            <div>Vel: <span className="text-emerald-400 font-bold">{hoveredObject.velocity_km_s.toFixed(2)} km/s</span></div>
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5 text-center">Click for detailed telemetry</div>
        </div>
      )}

      {/* TOP LEFT: Exact LeoLabs Control & Multi-View Dock */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-xs">
        {isLeftPanelOpen ? (
          <div className="bg-slate-950/85 backdrop-blur-xl border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 font-sans text-xs shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-210px)] overflow-y-auto w-72 sm:w-80">
            {/* 1. Search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium w-14">Search</span>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter a satellite name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </form>

            {/* 2. Speed Slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-medium w-14">Speed</span>
              <input
                type="range"
                min="1"
                max="200"
                value={simSpeed}
                onChange={(e) => setSimSpeed(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-cyan-400 font-mono text-xs w-8 text-right">{simSpeed}</span>
            </div>

            {/* 3. Checkboxes (Exact LeoLabs options) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/80">
              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white select-none">
                <span>Debris</span>
                <input
                  type="checkbox"
                  checked={showDebris}
                  onChange={(e) => setShowDebris(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white select-none">
                <span>Beams</span>
                <input
                  type="checkbox"
                  checked={showBeams}
                  onChange={(e) => setShowBeams(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white select-none">
                <span>Instruments</span>
                <input
                  type="checkbox"
                  checked={showInstruments}
                  onChange={(e) => setShowInstruments(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white select-none">
                <span>Follow Earth</span>
                <input
                  type="checkbox"
                  checked={followEarth}
                  onChange={(e) => setFollowEarth(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white select-none">
                <span>Auto Refresh</span>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            {/* 4. Views Selection Box */}
            <div className="pt-1.5 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-semibold text-center mb-1 bg-slate-900/60 py-0.5 rounded">Views</div>
              <div className="flex flex-col bg-slate-900/80 rounded border border-slate-800 overflow-hidden text-xs">
                {[
                  { key: 'type', label: 'Object Type' },
                  { key: 'perigee', label: 'Perigee' },
                  { key: 'period', label: 'Period' },
                  { key: 'inclination', label: 'Inclination' },
                  { key: 'country', label: 'Country of Origin' }
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setActiveView(v.key as any)}
                    className={`px-3 py-1.5 text-left transition ${
                      activeView === v.key
                        ? 'bg-slate-700/60 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Filters Section */}
            <div className="pt-1.5 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-semibold text-center mb-1.5 bg-slate-900/60 py-0.5 rounded">Filters</div>
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Perigee</div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="min km"
                    value={minPerigee}
                    onChange={(e) => setMinPerigee(e.target.value)}
                    className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white placeholder-slate-500"
                  />
                  <input
                    type="number"
                    placeholder="max km"
                    value={maxPerigee}
                    onChange={(e) => setMaxPerigee(e.target.value)}
                    className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* 6. Footer Controls */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 text-[11px] text-slate-400">
              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="text-left text-slate-400 hover:text-white py-0.5 font-medium transition"
              >
                Hide Menu
              </button>
              
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500/80" />
                <span>Special events are not shown</span>
              </div>

              <button
                onClick={handleCopyShare}
                className="text-left text-slate-400 hover:text-cyan-400 flex items-center gap-1 text-[10px] transition"
              >
                <Share2 className="w-3 h-3" />
                <span>{copiedLink ? 'Copied to clipboard!' : 'Copy link to share'}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsLeftPanelOpen(true)}
            className="bg-slate-950/85 backdrop-blur-xl border border-slate-800 px-3 py-1.5 rounded-xl font-sans text-xs text-slate-300 hover:text-white shadow-xl flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Show Menu</span>
          </button>
        )}
      </div>

      {/* TOP RIGHT: Exact LeoLabs Object Type Legend */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 flex flex-col items-end gap-2">
        {/* Global Action Bar */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 p-1 rounded-xl shadow-xl">
          <div className="hidden sm:flex items-center gap-1.5 px-2 font-mono text-[11px] text-emerald-400">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>UTC: {simTime.toISOString().substring(11, 19)}</span>
          </div>

          <button
            onClick={handleResetCamera}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-emerald-400 transition"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-emerald-400 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* LeoLabs Object Type Floating Card */}
        <div className="bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 rounded-xl p-2.5 sm:p-3 font-sans text-xs text-slate-200 shadow-2xl w-40 sm:w-44">
          <div className="text-slate-300 font-semibold text-xs mb-2 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>Object Type</span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {stats?.tracked_objects ? `${stats.tracked_objects.toLocaleString()}` : 'LIVE'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#22c55e] shadow-sm"></span>
              <span className="text-slate-200">Payload</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#f59e0b] shadow-sm"></span>
              <span className="text-slate-200">Rocket Body</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#ef4444] shadow-sm"></span>
              <span className="text-slate-200">Debris</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#3b82f6] shadow-sm"></span>
              <span className="text-slate-200">Unknown</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Selected Telemetry Card */}
      {selectedObject && (
        <div className="absolute top-44 right-3 sm:right-4 z-30 w-72 sm:w-80 max-w-[88vw] bg-slate-950/90 backdrop-blur-xl border border-slate-800 p-3.5 rounded-xl font-mono text-[11px] shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-260px)] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="pr-2">
              <div className="font-bold text-white text-xs sm:text-sm truncate max-w-[200px]" title={selectedObject.name}>
                {selectedObject.name}
              </div>
              <div className="text-[9px] text-slate-400">
                NORAD #{selectedObject.norad_id} • <span className="text-emerald-400">{selectedObject.object_type.replace('_', ' ')}</span>
              </div>
            </div>
            <button
              onClick={() => onSelectObject(null)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Close Panel"
            >
              ✕
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            <button
              onClick={() => setIsFollowMode(!isFollowMode)}
              className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition flex items-center justify-center gap-1 ${
                isFollowMode
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                  : 'bg-slate-900 text-emerald-400 border-emerald-500/30 hover:bg-slate-800'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              {isFollowMode ? 'TRACKING' : 'LOCK ORBIT'}
            </button>

            <button
              onClick={() => setShowGroundTrack(!showGroundTrack)}
              className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition flex items-center justify-center gap-1 ${
                showGroundTrack
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3 h-3" />
              GROUND TRACK
            </button>
          </div>

          {/* Live Real-Time SGP4 Coordinates */}
          <div className="space-y-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800 mb-2">
            <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>SGP4 TELEMETRY</span>
              <span className="text-emerald-400 text-[8px]">● REALTIME</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Altitude:</span>
              <span className="text-white font-bold">{selectedPos ? `${selectedPos.alt_km.toFixed(1)} km` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Velocity:</span>
              <span className="text-emerald-400 font-bold">{selectedPos ? `${selectedPos.velocity_km_s.toFixed(2)} km/s` : '7.65 km/s'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lat / Lon:</span>
              <span className="text-slate-200">{selectedPos ? `${selectedPos.lat.toFixed(2)}°, ${selectedPos.lon.toFixed(2)}°` : '—'}</span>
            </div>
          </div>

          {/* Orbital Parameters */}
          <div className="space-y-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10px] mb-2">
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
              <span className="text-emerald-400 font-bold">{selectedObject.source || 'Space-Track'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Conjunction Encounter Overlay */}
      {selectedConjunction && (
        <div className="absolute top-44 right-3 sm:right-4 z-30 w-72 sm:w-80 max-w-[88vw] bg-slate-950/90 backdrop-blur-xl border border-red-500/40 p-3 rounded-xl font-mono text-[11px] shadow-2xl text-slate-200 animate-fade-in">
          <div className="flex items-center justify-between border-b border-red-500/30 pb-1.5 mb-1.5">
            <div className="font-bold text-red-400 flex items-center gap-1.5 text-xs">
              <Crosshair className="w-3.5 h-3.5 text-red-400" />
              <span>CONJUNCTION ALERT</span>
            </div>
            <button
              onClick={() => onSelectConjunction(null)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="text-white font-semibold truncate">{selectedConjunction.object_a?.name || 'Object A'} ↔ {selectedConjunction.object_b?.name || 'Object B'}</div>
            <div className="text-slate-400">TCA: <span className="text-white">{selectedConjunction.tca} UTC</span></div>
            <div className="text-slate-400">Miss Distance: <span className="text-red-400 font-bold">{selectedConjunction.miss_distance_km} km</span></div>
            <div className="text-slate-400">Relative Velocity: <span className="text-amber-400">{selectedConjunction.relative_velocity_km_s} km/s</span></div>
            <div className="text-slate-400">Risk Score: <span className="text-red-400 font-bold">{selectedConjunction.risk_score} / 100 ({selectedConjunction.risk_level})</span></div>
            
            <div className="grid grid-cols-2 gap-1.5 mt-2 pt-1.5 border-t border-red-500/20">
              <button
                onClick={() => handleJumpToTca(selectedConjunction)}
                className="py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-[10px] flex items-center justify-center gap-1 shadow-lg transition"
              >
                <FastForward className="w-3 h-3" />
                JUMP TCA
              </button>
              <button
                onClick={() => onOpenConjunctionDetails(selectedConjunction)}
                className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-[10px] transition"
              >
                DETAILS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BAR: Astrodynamics Time Control Dock */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20 bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-2 sm:p-2.5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4 font-mono text-xs shadow-2xl">
        {/* Play/Pause & Speed Multipliers */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 sm:p-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition"
              title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {[1, 10, 25, 50, 200].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${
                    simSpeed === spd
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}X
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setSimTime(new Date()); setSimSpeed(25); }}
            className="px-2 sm:px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 rounded-lg text-[9px] sm:text-[10px] font-bold transition"
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
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap">
            {((simTime.getTime() - Date.now()) / 3600000).toFixed(1)}h
          </span>
        </div>

        {/* Quick Conjunction Hotspots */}
        {conjunctions.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              HOTSPOTS:
            </span>
            {conjunctions.slice(0, 2).map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelectConjunction(c); handleJumpToTca(c); }}
                className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 rounded text-[10px] font-bold hover:bg-red-500/30 transition"
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
