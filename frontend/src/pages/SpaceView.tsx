import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Activity, 
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
  Sliders
} from 'lucide-react';
import { 
  OrbitalObject, 
  Conjunction, 
  OrbitalPosition, 
  TrajectoryResponse, 
  GroundTrackResponse 
} from '../types';
import { api } from '../services/api';

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

// Procedural Real Earth Day Texture
function createEarthDayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a2342';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1c4424';
  ctx.strokeStyle = '#2d6a36';
  ctx.lineWidth = 4;

  // Americas
  ctx.beginPath();
  ctx.ellipse(520, 360, 190, 130, -0.3, 0, Math.PI * 2);
  ctx.ellipse(640, 680, 120, 200, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eurasia
  ctx.beginPath();
  ctx.ellipse(1380, 320, 380, 170, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Africa
  ctx.beginPath();
  ctx.ellipse(1120, 560, 180, 230, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sahara Desert / Middle East
  ctx.fillStyle = '#6e5d2b';
  ctx.beginPath();
  ctx.ellipse(1130, 430, 130, 70, 0, 0, Math.PI * 2);
  ctx.ellipse(1320, 420, 90, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // India
  ctx.fillStyle = '#234a26';
  ctx.beginPath();
  ctx.moveTo(1420, 400);
  ctx.lineTo(1470, 560);
  ctx.lineTo(1370, 450);
  ctx.closePath();
  ctx.fill();

  // Australia
  ctx.fillStyle = '#5c4322';
  ctx.beginPath();
  ctx.ellipse(1680, 720, 130, 95, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Polar Ice Caps
  ctx.fillStyle = '#e8f4f8';
  ctx.fillRect(0, 0, canvas.width, 75);
  ctx.fillRect(0, canvas.height - 75, canvas.width, 75);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Procedural Real Earth Night-Lights Texture
function createEarthNightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#020308';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffcc66';
  const drawCityHub = (x: number, y: number, radius: number, density: number) => {
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 1.8) * radius;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      ctx.globalAlpha = 0.3 + Math.random() * 0.7;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  };

  drawCityHub(380, 270, 70, 180);
  drawCityHub(270, 290, 50, 120);
  drawCityHub(630, 680, 60, 140);
  drawCityHub(1080, 260, 80, 250);
  drawCityHub(1430, 470, 90, 320);
  drawCityHub(1620, 380, 90, 300);
  drawCityHub(1680, 730, 50, 90);

  ctx.globalAlpha = 1.0;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Cloud Texture
function createEarthCloudsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const rad = 25 + Math.random() * 65;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Moon Texture
function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8e9094';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#55585e';
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    const cx = (i * 47) % canvas.width;
    const cy = (i * 31) % canvas.height;
    ctx.arc(cx, cy, 8 + (i % 20), 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
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
  
  // UI State
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [altitudeFilter, setAltitudeFilter] = useState<string>('ALL');
  const [isDebrisMode, setIsDebrisMode] = useState<boolean>(false);
  const [isFollowMode, setIsFollowMode] = useState<boolean>(false);
  const [showGroundTrack, setShowGroundTrack] = useState<boolean>(false);

  // Time Engine State
  const [simTime, setSimTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [trajectoryHours, setTrajectoryHours] = useState<number>(12);

  // Real-time Ephemeris State
  const [positions, setPositions] = useState<OrbitalPosition[]>([]);
  const [selectedPos, setSelectedPos] = useState<OrbitalPosition | null>(null);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryResponse | null>(null);
  const [_groundTrackData, setGroundTrackData] = useState<GroundTrackResponse | null>(null);

  // Hover Tooltip / Floating Card State
  const [hoveredObject, setHoveredObject] = useState<{
    name: string;
    norad_id: number;
    type: string;
    alt_km: number;
    velocity_km_s: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Synchronized Mutable Refs for High-Speed Raycasting
  const positionsRef = useRef<OrbitalPosition[]>([]);
  const visiblePositionsRef = useRef<OrbitalPosition[]>([]);
  const objectsRef = useRef<OrbitalObject[]>([]);
  const isFollowModeRef = useRef<boolean>(false);
  const selectedPosRef = useRef<OrbitalPosition | null>(null);
  
  positionsRef.current = positions;
  objectsRef.current = objects;
  isFollowModeRef.current = isFollowMode;
  selectedPosRef.current = selectedPos;

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const conjLineRef = useRef<THREE.Line | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const raycaster = useRef(new THREE.Raycaster());

  // Set Raycaster Precision for Clicking Small Dots
  useEffect(() => {
    raycaster.current.params.Points = { threshold: 0.35 };
  }, []);

  // Fetch Batch Ephemeris Positions
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      try {
        const batch = await api.getBatchPositions(simTime.toISOString(), 1200);
        if (isMounted && batch.positions) {
          setPositions(batch.positions);
          if (selectedObject) {
            const current = batch.positions.find((p) => p.norad_id === selectedObject.norad_id);
            if (current) setSelectedPos(current);
          }
        }
      } catch (err) {
        console.error('Failed to fetch batch positions:', err);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, isPlaying && simSpeed > 1 ? 5000 : 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [simSpeed, isPlaying, selectedObject]);

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

  // Initialize Three.js WebGL Scene
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
      2000
    );
    camera.position.set(0, 8, 26);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = EARTH_RADIUS + 0.5;
    controls.maxDistance = 250;
    controls.rotateSpeed = 0.7;
    controlsRef.current = controls;

    // 5. Starfield & Deep Space Skybox
    const starGeom = new THREE.BufferGeometry();
    const starCount = 4500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 600 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = radius * Math.cos(phi);

      const tint = 0.8 + Math.random() * 0.2;
      starColors[i] = tint;
      starColors[i + 1] = tint * 0.95;
      starColors[i + 2] = tint * 1.1;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.9 });
    scene.add(new THREE.Points(starGeom, starMat));

    // 6. Real Sun Mesh & Solar Directional Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const sunGeom = new THREE.SphereGeometry(2.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff4cc });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    const ambLight = new THREE.AmbientLight(0x1a233a, 0.35);
    scene.add(ambLight);

    // 7. Earth Mesh with GLSL Day/Night Terminator Shader
    const dayTexture = createEarthDayTexture();
    const nightTexture = createEarthNightTexture();

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
          float dayMix = smoothstep(-0.15, 0.25, cosine);
          
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          
          vec3 finalColor = mix(nightColor.rgb * 1.8, dayColor.rgb, dayMix);
          
          // Atmospheric edge glow
          float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
          finalColor += vec3(0.0, 0.45, 0.9) * pow(rim, 3.5) * 0.45;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMesh = new THREE.Mesh(earthGeom, earthShaderMat);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 8. Rotating Cloud Layer
    const cloudsTexture = createEarthCloudsTexture();
    const cloudsGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const cloudMesh = new THREE.Mesh(cloudsGeom, cloudsMat);
    scene.add(cloudMesh);
    cloudMeshRef.current = cloudMesh;

    // 9. Atmospheric Rim Glow Layer
    const atmosGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeom, atmosMat));

    // 10. Realistic Moon
    const moonTexture = createMoonTexture();
    const moonGeom = new THREE.SphereGeometry(1.737, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.9 });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    moonMesh.position.set(45, 10, -25);
    scene.add(moonMesh);

    // 11. GPU-Instanced Mesh for Orbital Objects (Up to 3,000 instanced dots)
    const maxObjects = 3000;
    const instGeom = new THREE.SphereGeometry(0.14, 12, 12);
    const instMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instMesh = new THREE.InstancedMesh(instGeom, instMat, maxObjects);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instMesh);
    instancedMeshRef.current = instMesh;

    // Screen-Space Distance Hit Tester (Works reliably on all devices & screen sizes)
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

    // Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();

      if (earthMeshRef.current) earthMeshRef.current.rotation.y += 0.0004;
      if (cloudMeshRef.current) cloudMeshRef.current.rotation.y += 0.0006;

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
  }, []);

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

  // Update Instanced Orbital Objects & Maintain visiblePositionsRef Mapping
  useEffect(() => {
    if (!instancedMeshRef.current || positions.length === 0) return;
    const mesh = instancedMeshRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const currentVisible: OrbitalPosition[] = [];
    let visibleCount = 0;

    positions.forEach((pos) => {
      // Apply Filters
      if (isDebrisMode && pos.type !== 'DEBRIS') return;
      if (typeFilter !== 'ALL' && pos.type !== typeFilter) return;
      if (altitudeFilter === 'LEO' && pos.alt_km > 2000) return;
      if (altitudeFilter === 'MEO' && (pos.alt_km <= 2000 || pos.alt_km > 20000)) return;
      if (altitudeFilter === 'GEO' && pos.alt_km <= 20000) return;

      const x = pos.x_km / 1000;
      const y = pos.z_km / 1000;
      const z = -pos.y_km / 1000;

      dummy.position.set(x, y, z);
      const isSelected = selectedObject?.norad_id === pos.norad_id;
      const scale = isSelected ? 3.0 : 1.1;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(visibleCount, dummy.matrix);

      if (isSelected) {
        color.setHex(0x00ffff); // Glowing Cyan for Selected Object
      } else if (pos.type === 'DEBRIS') {
        color.setHex(0xff3355); // Red/Crimson for Debris
      } else if (pos.type === 'ROCKET_BODY') {
        color.setHex(0xffaa00); // Amber for Rocket Bodies
      } else {
        color.setHex(0x00f0ff); // Electric Cyan for Active Satellites
      }
      mesh.setColorAt(visibleCount, color);

      currentVisible.push(pos);
      visibleCount++;
    });

    visiblePositionsRef.current = currentVisible;
    mesh.count = visibleCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [positions, selectedObject, typeFilter, altitudeFilter, isDebrisMode]);

  // Update Trajectory Line for Selected Object
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
        opacity: 0.85,
        linewidth: 2
      });

      const line = new THREE.Line(lineGeom, lineMat);
      scene.add(line);
      trajectoryLineRef.current = line;
    }
  }, [trajectoryData, selectedObject]);

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
    cameraRef.current.position.set(0, 8, 26);
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

      {/* FLOATING HOVER TOOLTIP */}
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

      {/* TOP LEFT: Space Situational Awareness HUD Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-xs">
        <div className="bg-space-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-space-700 font-mono text-xs text-white shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-neon animate-pulse"></span>
            <span className="font-bold tracking-wider text-cyan-neon">SPACE TRAFFIC RADAR</span>
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
          <div className="bg-space-900/90 backdrop-blur-md border border-space-700/80 rounded-xl p-3.5 flex flex-col gap-3 font-mono text-xs shadow-2xl text-slate-200 animate-fade-in">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search Satellite / NORAD (e.g. ISS, 25544)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-space-950 border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </form>

            {/* Object Category Filters */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>Object Classification</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {[
                  { key: 'ALL', label: 'All Catalog' },
                  { key: 'ACTIVE_SATELLITE', label: 'Satellites' },
                  { key: 'DEBRIS', label: 'Debris' },
                  { key: 'ROCKET_BODY', label: 'Rocket Bodies' }
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setTypeFilter(t.key); setIsDebrisMode(false); }}
                    className={`px-2 py-1 rounded transition text-left ${
                      typeFilter === t.key && !isDebrisMode
                        ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                        : 'bg-space-950 text-slate-400 hover:text-slate-200 border border-space-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Altitude Shell Filter */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>Orbital Shells</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {['ALL', 'LEO', 'MEO', 'GEO'].map((alt) => (
                  <button
                    key={alt}
                    onClick={() => setAltitudeFilter(alt)}
                    className={`py-1 rounded text-center ${
                      altitudeFilter === alt
                        ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                        : 'bg-space-950 text-slate-400 hover:text-slate-200 border border-space-800'
                    }`}
                  >
                    {alt}
                  </button>
                ))}
              </div>
            </div>

            {/* Debris Mode Toggle */}
            <div className="pt-2 border-t border-space-800 flex items-center justify-between">
              <span className="text-[11px] text-danger-300 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-danger-400" />
                DEBRIS MODE
              </span>
              <button
                onClick={() => setIsDebrisMode(!isDebrisMode)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                  isDebrisMode
                    ? 'bg-danger-600 text-white shadow-lg'
                    : 'bg-space-950 text-slate-400 border border-space-700'
                }`}
              >
                {isDebrisMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Active Telemetry Statistics */}
            <div className="pt-2 border-t border-space-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>ACTIVE EPHEMERIS:</span>
              <span className="text-cyan-400 font-bold">{positions.length} Live Tracked</span>
            </div>
          </div>
        )}
      </div>

      {/* TOP RIGHT: Global View Toggles & Clock */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* UTC Clock */}
        <div className="bg-space-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-space-700 font-mono text-xs text-cyan-400 shadow-xl flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>UTC: {simTime.toISOString().replace('T', ' ').substring(0, 19)}</span>
        </div>

        {/* Camera Reset & Fullscreen */}
        <div className="bg-space-900/90 backdrop-blur-md p-1 rounded-xl border border-space-700 flex items-center gap-1 shadow-xl">
          <button
            onClick={handleResetCamera}
            className="p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
            title="Reset Camera View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Slide-out Telemetry Drawer */}
      {selectedObject && (
        <div className="absolute top-16 right-4 z-20 w-88 bg-space-900/95 backdrop-blur-md border border-cyan-500/40 p-4 rounded-2xl font-mono text-xs shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-220px)] overflow-y-auto">
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

          {/* Action Toolbar: Follow, Trajectory, Ground Track */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <button
              onClick={() => setIsFollowMode(!isFollowMode)}
              className={`py-1 px-2 rounded text-[11px] font-bold border transition flex items-center justify-center gap-1 ${
                isFollowMode
                  ? 'bg-cyan-500 text-space-950 border-cyan-400 shadow-md'
                  : 'bg-space-950 text-cyan-400 border-space-700 hover:bg-space-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {isFollowMode ? 'FOLLOWING' : 'FOLLOW ORBIT'}
            </button>

            <button
              onClick={() => setShowGroundTrack(!showGroundTrack)}
              className={`py-1 px-2 rounded text-[11px] font-bold border transition flex items-center justify-center gap-1 ${
                showGroundTrack
                  ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/50'
                  : 'bg-space-950 text-slate-300 border-space-700 hover:bg-space-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              GROUND TRACK
            </button>
          </div>

          {/* Real Telemetry Table */}
          <div className="space-y-1.5 text-[11px] bg-space-950 p-2.5 rounded-xl border border-space-800">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Live SGP4 Telemetry</span>
              <span className="text-emerald-400 text-[9px]">● PROPAGATING</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Altitude:</span>
              <span className="text-white font-bold">{selectedPos ? `${selectedPos.alt_km.toFixed(1)} km` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Orbital Velocity:</span>
              <span className="text-cyan-400 font-bold">{selectedPos ? `${selectedPos.velocity_km_s.toFixed(2)} km/s` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latitude / Longitude:</span>
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
              <span>SGP4 TRAJECTORY HORIZON:</span>
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

      {/* BOTTOM BAR: Simulation Time Controller & Timeline */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-space-900/90 backdrop-blur-md p-2.5 rounded-2xl border border-space-700 flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-2xl">
        {/* Play/Pause & Speed Multipliers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 bg-cyan-500 text-space-950 font-bold rounded-lg hover:bg-cyan-400 transition"
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1 bg-space-950 p-1 rounded-lg border border-space-800">
            {[1, 10, 100, 1000].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  simSpeed === spd
                    ? 'bg-cyan-500 text-space-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}X
              </button>
            ))}
          </div>

          <button
            onClick={() => { setSimTime(new Date()); setSimSpeed(1); }}
            className="px-2.5 py-1 bg-space-950 hover:bg-space-800 text-cyan-400 border border-space-700 rounded-lg text-[10px] font-bold transition"
          >
            RESET TO NOW
          </button>
        </div>

        {/* Timeline Horizon Scrubber */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-[10px] text-slate-400">PROPAGATE:</span>
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
          <div className="flex items-center gap-1.5">
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
                {c.miss_distance_km} km ({new Date(c.tca).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
