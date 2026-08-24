import React, { useEffect, useRef, useState } from 'react';
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
  Sliders
} from 'lucide-react';
import { 
  OrbitalObject, 
  ObjectType,
  Conjunction, 
  OrbitalPosition, 
  TrajectoryResponse, 
  GroundTrackResponse 
} from '../types';
import { api } from '../services/api';
import * as satellite from 'satellite.js';

interface SpaceViewProps {
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction: (conj: Conjunction | null) => void;
  onOpenConjunctionDetails: (conj: Conjunction) => void;
}

const EARTH_RADIUS = 6.371; // 1 unit = 1000 km in 3D scene

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

export const SpaceView: React.FC<SpaceViewProps> = ({
  objects,
  conjunctions,
  selectedObject,
  selectedConjunction,
  onSelectObject,
  onSelectConjunction,
  onOpenConjunctionDetails
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // UI State (LeoLabs Style Multi-Filter & Search Dock)
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFleetFilter, setActiveFleetFilter] = useState<string>('ALL');
  const [altitudeFilter, setAltitudeFilter] = useState<string>('ALL');
  const [isDebrisMode, setIsDebrisMode] = useState<boolean>(false);
  const [isFollowMode, setIsFollowMode] = useState<boolean>(false);
  const [showGroundTrack, setShowGroundTrack] = useState<boolean>(true);
  const [showOrbitRings, setShowOrbitRings] = useState<boolean>(true);

  // Time Engine State (Default 50X for noticeable real-time orbital revolution)
  const [simTime, setSimTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(50);
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

  // Specialized LeoLabs 3D Instanced Meshes
  const debrisMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const satMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const starlinkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rocketMeshRef = useRef<THREE.InstancedMesh | null>(null);
  
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
        const batch = await api.getBatchPositions(simTime.toISOString(), 1500);
        if (isMounted && batch.positions && batch.positions.length > 0) {
          setPositions(batch.positions);
          livePositionsRef.current = batch.positions.map((p: OrbitalPosition) => ({ ...p }));
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
      setSimTime((prev) => new Date(prev.getTime() + 1000 * simSpeed));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, simSpeed]);

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
    moonMesh.position.set(45, 10, -25);
    scene.add(moonMesh);

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

    // 12. LEOLABS SPECIALIZED 3D INSTANCED MESHES:
    const maxInst = 2500;

    // A) Operational Payloads & Active Satellites (Cyan/Electric Blue Octahedron Diamond)
    const satGeom = new THREE.OctahedronGeometry(0.20, 0);
    const satMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x004466,
      roughness: 0.2,
      metalness: 0.9
    });
    const satMesh = new THREE.InstancedMesh(satGeom, satMat, maxInst);
    satMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(satMesh);
    satMeshRef.current = satMesh;

    // B) Megaconstellations (e.g. Starlink, OneWeb - Violet/Purple Diamond)
    const starlinkGeom = new THREE.OctahedronGeometry(0.18, 0);
    const starlinkMat = new THREE.MeshStandardMaterial({
      color: 0xaa55ff,
      emissive: 0x331166,
      roughness: 0.2,
      metalness: 0.9
    });
    const starlinkMesh = new THREE.InstancedMesh(starlinkGeom, starlinkMat, maxInst);
    starlinkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(starlinkMesh);
    starlinkMeshRef.current = starlinkMesh;

    // C) Debris / Shattered Destroyed Satellite Fragments (Jagged Faceted Dodecahedron)
    const debrisGeom = new THREE.DodecahedronGeometry(0.18, 0);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0xff3355,
      emissive: 0x550011,
      roughness: 0.35,
      metalness: 0.8
    });
    const debrisMesh = new THREE.InstancedMesh(debrisGeom, debrisMat, maxInst);
    debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(debrisMesh);
    debrisMeshRef.current = debrisMesh;

    // D) Rocket Bodies & Booster Upper Stages (Cylindrical Fuselage)
    const rocketGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.38, 8);
    const rocketMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0x442200,
      roughness: 0.4,
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

    // Instant Click Selection on Any Dot
    const handleCanvasClick = async (e: MouseEvent) => {
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

        const targetVec = new THREE.Vector3(
          p.x_km / 1000,
          p.z_km / 1000,
          -p.y_km / 1000
        );
        controls.target.copy(targetVec);
        camera.position.copy(targetVec.clone().add(new THREE.Vector3(0, 3, 7)));
        controls.update();
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 60 FPS Orbit Simulation Clock
    const clock = new THREE.Clock();
    let tumbleAngle = 0;

    // Animation Loop: Real-Time SGP4 Trajectory Motion around Still Earth
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();

      const delta = clock.getDelta();
      tumbleAngle += delta * 2.5;

      // SGP4 LIVE EPHEMERIS PROPAGATION AT 60 FPS
      const currentSimDate = simTimeRef.current || new Date();
      const gmst = satellite.gstime(currentSimDate);
      const dummy = new THREE.Object3D();
      const currentVisible: OrbitalPosition[] = [];

      let satIdx = 0;
      let starlinkIdx = 0;
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
            const isGps = nameUpper.includes('GPS') || nameUpper.includes('NAVSTAR') || nameUpper.includes('BEIDOU') || nameUpper.includes('GALILEO');

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
            const scale = isSelected ? 3.4 : 1.15;
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
          const scale = isSelected ? 3.4 : 1.15;
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
        renderer.domElement.removeEventListener('click', handleCanvasClick);
      }
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      renderer.dispose();
    };
  }, [activeFleetFilter, altitudeFilter, isDebrisMode, selectedObject]);

  // Update Solar Illumination Vector with Simulation Time
  useEffect(() => {
    const sunDir = calculateSunDirection(simTime);
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunDir.clone().multiplyScalar(70));
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.position.copy(sunDir.clone().multiplyScalar(70));
    }
    if (earthMeshRef.current && (earthMeshRef.current.material as THREE.ShaderMaterial).uniforms) {
      (earthMeshRef.current.material as THREE.ShaderMaterial).uniforms.sunDirection.value = sunDir;
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
      const isDebris = selectedObject?.object_type === 'DEBRIS';
      const lineColor = isDebris ? 0xff3344 : 0x00f0ff;

      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.9,
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

      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x00ffff,
        dashSize: 0.2,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.7
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.computeLineDistances();
      scene.add(line);
      groundTrackLineRef.current = line;
    }
  }, [_groundTrackData, showGroundTrack]);

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
          className="fixed pointer-events-none z-50 bg-space-950/95 backdrop-blur-md border border-cyan-500/50 p-2.5 rounded-xl text-xs font-mono shadow-2xl text-white animate-fade-in -translate-x-1/2 -translate-y-full mb-3"
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
          <div className="text-[9px] text-slate-500 mt-0.5 text-center">Click dot for full telemetry</div>
        </div>
      )}

      {/* TOP LEFT: LeoLabs Style Multi-Fleet Filter & Search Dock */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-sm">
        <div className="bg-space-900/90 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-space-700 font-mono text-xs text-white shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-neon animate-pulse" />
            <span className="font-bold tracking-wider text-cyan-neon text-[11px] sm:text-xs">ORBITAL RADAR</span>
          </div>
          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className="p-1 hover:bg-space-800 rounded text-slate-400 hover:text-white"
            title={isLeftPanelOpen ? 'Collapse HUD' : 'Expand HUD'}
          >
            {isLeftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {isLeftPanelOpen && (
          <div className="bg-space-900/95 backdrop-blur-md border border-space-700/80 rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 sm:gap-3 font-mono text-xs shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-220px)] overflow-y-auto">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search Satellite, Starlink, Debris, NORAD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-space-950 border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            {/* LeoLabs Fleet & Constellation Filters */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-cyan-400" />
                  Fleet & Constellations
                </span>
                <span className="text-[9px] text-cyan-400">19,578 Tracked</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {[
                  { key: 'ALL', label: 'All Objects', color: 'text-white' },
                  { key: 'PAYLOAD', label: '◆ Operational', color: 'text-cyan-400' },
                  { key: 'STARLINK', label: '◆ Starlink Fleet', color: 'text-purple-400' },
                  { key: 'ONEWEB', label: '◆ OneWeb', color: 'text-purple-400' },
                  { key: 'GPS', label: '◆ GPS / GNSS', color: 'text-emerald-400' },
                  { key: 'DEBRIS', label: '⬟ Debris Clouds', color: 'text-danger-400' },
                  { key: 'ROCKET', label: '❚ Rocket Bodies', color: 'text-warning-400' }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setActiveFleetFilter(f.key); setIsDebrisMode(false); }}
                    className={`px-2 py-1 rounded transition text-left ${
                      activeFleetFilter === f.key && !isDebrisMode
                        ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                        : 'bg-space-950 text-slate-400 hover:text-slate-200 border border-space-800'
                    }`}
                  >
                    <span className={f.color}>{f.label}</span>
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
                  { key: 'ALL', label: 'ALL' },
                  { key: 'LEO', label: 'LEO' },
                  { key: 'MEO', label: 'MEO' },
                  { key: 'GEO', label: 'GEO' }
                ].map((alt) => (
                  <button
                    key={alt.key}
                    onClick={() => setAltitudeFilter(alt.key)}
                    className={`py-1 rounded text-center ${
                      altitudeFilter === alt.key
                        ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                        : 'bg-space-950 text-slate-400 hover:text-slate-200 border border-space-800'
                    }`}
                  >
                    {alt.label}
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

      {/* TOP RIGHT: Global View Toggles & Clock */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2">
        {/* UTC Clock (hidden on very small screens) */}
        <div className="hidden sm:flex bg-space-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-space-700 font-mono text-[11px] sm:text-xs text-cyan-400 shadow-xl items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>UTC: {simTime.toISOString().replace('T', ' ').substring(11, 19)}</span>
        </div>

        {/* Camera Reset & Fullscreen */}
        <div className="bg-space-900/90 backdrop-blur-md p-1 rounded-xl border border-space-700 flex items-center gap-1 shadow-xl">
          <button
            onClick={handleResetCamera}
            className="p-1 sm:p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 sm:p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: LeoLabs Style Mission Diagnostics & Telemetry Drawer */}
      {selectedObject && (
        <div className="absolute top-14 sm:top-16 right-2 sm:right-4 z-20 w-[calc(100vw-16px)] sm:w-88 bg-space-900/95 backdrop-blur-md border border-cyan-500/40 p-3 sm:p-4 rounded-2xl font-mono text-xs shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-190px)] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-space-700 pb-2.5 mb-2.5">
            <div>
              <div className="font-bold text-cyan-neon text-sm">{selectedObject.name}</div>
              <div className="text-[10px] text-slate-400">NORAD ID: {selectedObject.norad_id} • {selectedObject.object_type.replace('_', ' ')}</div>
            </div>
            <button
              onClick={() => onSelectObject(null)}
              className="p-1 hover:bg-space-800 rounded text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Action Toolbar: Follow, Ground Track */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <button
              onClick={() => setIsFollowMode(!isFollowMode)}
              className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition flex items-center justify-center gap-1 ${
                isFollowMode
                  ? 'bg-cyan-500 text-space-950 border-cyan-400 shadow-lg'
                  : 'bg-space-950 text-cyan-400 border-cyan-500/30 hover:bg-space-800'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              {isFollowMode ? 'TRACKING ON' : 'LOCK ORBIT'}
            </button>

            <button
              onClick={() => setShowGroundTrack(!showGroundTrack)}
              className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition flex items-center justify-center gap-1 ${
                showGroundTrack
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-space-950 text-slate-400 border-space-800 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              GROUND TRACK
            </button>
          </div>

          {/* Real Telemetry Table */}
          <div className="space-y-1.5 text-[11px] bg-space-950 p-2.5 rounded-xl border border-space-800">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Live SGP4 Ephemeris</span>
              <span className="text-emerald-400 text-[9px]">● PROPAGATING</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Altitude:</span>
              <span className="text-white font-bold">{selectedPos ? `${selectedPos.alt_km.toFixed(1)} km` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Orbital Speed:</span>
              <span className="text-cyan-400 font-bold">{selectedPos ? `${selectedPos.velocity_km_s.toFixed(2)} km/s` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lat / Lon:</span>
              <span className="text-slate-200">{selectedPos ? `${selectedPos.lat.toFixed(2)}°, ${selectedPos.lon.toFixed(2)}°` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TEME (X, Y, Z):</span>
              <span className="text-[10px] text-slate-300">
                {selectedPos ? `${selectedPos.x_km.toFixed(0)}, ${selectedPos.y_km.toFixed(0)}, ${selectedPos.z_km.toFixed(0)}` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Keplerian Orbital Elements */}
          <div className="space-y-1.5 text-[11px] bg-space-950 p-2.5 rounded-xl border border-space-800 mt-2">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">Keplerian Elements</div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inclination:</span>
              <span>{selectedObject.inclination != null ? `${selectedObject.inclination.toFixed(2)}°` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Eccentricity:</span>
              <span>{selectedObject.eccentricity != null ? selectedObject.eccentricity.toFixed(6) : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Period:</span>
              <span>{selectedObject.period_minutes != null ? `${selectedObject.period_minutes.toFixed(1)} min` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Perigee / Apogee:</span>
              <span>{selectedObject.perigee_km && selectedObject.apogee_km ? `${selectedObject.perigee_km.toFixed(0)} - ${selectedObject.apogee_km.toFixed(0)} km` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Data Source:</span>
              <span className="text-emerald-400">{selectedObject.source}</span>
            </div>
          </div>

          {/* Trajectory Prediction Window Controls */}
          <div className="mt-2.5 pt-2 border-t border-space-800">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
              <span>SGP4 TRAJECTORY RIBBON:</span>
              <span className="text-cyan-400 font-bold">{trajectoryHours}H</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 6, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => setTrajectoryHours(h)}
                  className={`py-0.5 rounded text-[10px] ${
                    trajectoryHours === h
                      ? 'bg-cyan-500 text-space-950 font-bold'
                      : 'bg-space-950 text-slate-300 hover:bg-space-800'
                  }`}
                >
                  {h}H
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conjunction Encounter Overlay */}
      {selectedConjunction && (
        <div className="absolute top-16 right-4 z-20 w-88 bg-space-900/95 backdrop-blur-md border border-danger-500/50 p-4 rounded-2xl font-mono text-xs shadow-2xl text-slate-200 animate-pulse">
          <div className="flex items-center justify-between border-b border-danger-500/30 pb-2 mb-2">
            <div className="font-bold text-danger-neon flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-danger-neon" />
              <span>CONJUNCTION ENCOUNTER</span>
            </div>
            <button
              onClick={() => onSelectConjunction(null)}
              className="p-1 hover:bg-space-800 rounded text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="text-white font-semibold">{selectedConjunction.object_a?.name || 'Object A'} ↔ {selectedConjunction.object_b?.name || 'Object B'}</div>
            <div className="text-slate-400">TCA: <span className="text-white">{selectedConjunction.tca} UTC</span></div>
            <div className="text-slate-400">Miss Distance: <span className="text-danger-400 font-bold">{selectedConjunction.miss_distance_km} km</span></div>
            <div className="text-slate-400">Relative Velocity: <span className="text-warning-400">{selectedConjunction.relative_velocity_km_s} km/s</span></div>
            <div className="text-slate-400">Risk Score: <span className="text-danger-neon font-bold">{selectedConjunction.risk_score} / 100 ({selectedConjunction.risk_level})</span></div>
            
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-danger-500/20">
              <button
                onClick={() => handleJumpToTca(selectedConjunction)}
                className="py-1.5 bg-danger-600 hover:bg-danger-500 text-white rounded font-bold text-[11px] flex items-center justify-center gap-1 shadow-lg transition"
              >
                <FastForward className="w-3.5 h-3.5" />
                JUMP TO TCA
              </button>
              <button
                onClick={() => onOpenConjunctionDetails(selectedConjunction)}
                className="py-1.5 bg-space-950 hover:bg-space-800 text-cyan-400 border border-cyan-500/40 rounded font-bold text-[11px] flex items-center justify-center transition"
              >
                FULL ANALYSIS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM BAR: Astrodynamics Mission Control Dock */}
      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20 bg-space-900/95 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-space-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4 font-mono text-xs shadow-2xl">
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
