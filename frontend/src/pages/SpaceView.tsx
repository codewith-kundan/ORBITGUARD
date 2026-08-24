import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  OrbitalObject,
  OrbitalPosition,
  Conjunction,
  TrajectoryResponse,
  GroundTrackResponse
} from '../types';
import { api } from '../services/api';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Crosshair,
  Search,
  FastForward,
  Clock,
  Radio,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Activity,
  Compass,
  AlertTriangle
} from 'lucide-react';

interface SpaceViewProps {
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction: (conj: Conjunction | null) => void;
  onOpenConjunctionDetails: (conj: Conjunction) => void;
}

const EARTH_RADIUS = 6.371; // Scale: 1 unit = 1000 km

// Astronomical Solar Direction calculation from UTC Date
function calculateSunDirection(utcDate: Date): THREE.Vector3 {
  const jd = utcDate.getTime() / 86400000.0 + 2440587.5;
  const d = jd - 2451545.0; // Days since J2000.0

  const g = (357.529 + 0.98560028 * d) * (Math.PI / 180.0);
  const q = 280.459 + 0.98564736 * d;
  const l = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2.0 * g)) * (Math.PI / 180.0);
  const e = (23.439 - 0.00000036 * d) * (Math.PI / 180.0);

  const x = Math.cos(l);
  const y = Math.sin(l) * Math.cos(e);
  const z = Math.sin(l) * Math.sin(e);

  return new THREE.Vector3(x, z, -y).normalize();
}

// Procedural Real Earth Day Surface Canvas Texture
function createEarthDayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep Blue Ocean
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#04132b');
  oceanGrad.addColorStop(0.2, '#0a2e5c');
  oceanGrad.addColorStop(0.5, '#0f488a');
  oceanGrad.addColorStop(0.8, '#0a2e5c');
  oceanGrad.addColorStop(1, '#04132b');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Continents Landmass Fill
  ctx.fillStyle = '#1e3f20';
  ctx.strokeStyle = '#2d5c31';
  ctx.lineWidth = 3;

  // North America
  ctx.beginPath();
  ctx.ellipse(420, 280, 240, 150, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // South America
  ctx.beginPath();
  ctx.ellipse(620, 680, 150, 230, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eurasia (Europe + Asia)
  ctx.beginPath();
  ctx.ellipse(1380, 290, 460, 180, 0.05, 0, Math.PI * 2);
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

// Procedural Real Earth Night-Lights Texture (City Lights)
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

  drawCityHub(380, 270, 70, 180);  // US East Coast
  drawCityHub(270, 290, 50, 120);  // US West Coast
  drawCityHub(630, 680, 60, 140);  // South America
  drawCityHub(1080, 260, 80, 250); // Western Europe
  drawCityHub(1430, 470, 90, 320); // India
  drawCityHub(1620, 380, 90, 300); // East Asia
  drawCityHub(1680, 730, 50, 90);  // Australia

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

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';

  for (let i = 0; i < 45; i++) {
    ctx.beginPath();
    const cx = (i * 89) % canvas.width;
    const cy = 80 + ((i * 53) % 360);
    ctx.ellipse(cx, cy, 110, 28, (i * 0.3), 0, Math.PI * 2);
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
  const mouse = useRef(new THREE.Vector2());

  // Fetch Batch Ephemeris Positions
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      try {
        const batch = await api.getBatchPositions(simTime.toISOString(), 600);
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

  // Fetch Trajectory & Ground Track for Selected Object
  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      if (!selectedObject) {
        setTrajectoryData(null);
        setGroundTrackData(null);
        setSelectedPos(null);
        setIsFollowMode(false);
        return;
      }
      try {
        const [traj, gTrack, pos] = await Promise.all([
          api.getObjectTrajectory(selectedObject.norad_id, trajectoryHours, 5, simTime.toISOString()).catch(() => null),
          showGroundTrack ? api.getObjectGroundTrack(selectedObject.norad_id, 180, 2, simTime.toISOString()).catch(() => null) : null,
          api.getObjectPosition(selectedObject.norad_id, simTime.toISOString()).catch(() => null)
        ]);
        if (isMounted) {
          if (traj) setTrajectoryData(traj);
          if (gTrack) setGroundTrackData(gTrack);
          if (pos) setSelectedPos(pos);
        }
      } catch (err) {
        console.error('Failed to fetch telemetry:', err);
      }
    };
    fetchTelemetry();
    return () => { isMounted = false; };
  }, [selectedObject, trajectoryHours, showGroundTrack]);

  // Initialize Three.js Space Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020409);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(18, 12, 22);
    cameraRef.current = camera;

    // 2. High-Performance Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 7.2;
    controls.maxDistance = 180;
    controlsRef.current = controls;

    // 4. Ambient & Directional Solar Illumination
    const ambientLight = new THREE.AmbientLight(0x112233, 0.25);
    scene.add(ambientLight);

    const sunDir = calculateSunDirection(new Date());
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.copy(sunDir.clone().multiplyScalar(70));
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Glowing Sun Corona Mesh
    const sunGeom = new THREE.SphereGeometry(2.8, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.position.copy(sunLight.position);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // 5. Starfield
    const starCount = 4000;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 250 + Math.random() * 100;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.4 + Math.random() * 0.6;
      starColors[i * 3] = brightness * 0.9;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness * 1.1;
    }

    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.85 });
    const starfield = new THREE.Points(starGeom, starMat);
    scene.add(starfield);

    // 6. Realistic Earth with Day/Night Terminator Shader
    const dayTexture = createEarthDayTexture();
    const nightTexture = createEarthNightTexture();

    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: sunDir }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;
          
          float intensity = dot(vNormal, normalize(sunDirection));
          float blend = smoothstep(-0.15, 0.15, intensity);
          vec3 finalColor = mix(nightColor * 1.4, dayColor * max(intensity, 0.12), blend);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMesh = new THREE.Mesh(earthGeom, earthShaderMat);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 7. Rotating Cloud Layer
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

    // 8. Atmospheric Rim Glow Layer
    const atmosGeom = new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
    });
    const atmosphereMesh = new THREE.Mesh(atmosGeom, atmosMat);
    scene.add(atmosphereMesh);

    // 9. Realistic Moon
    const moonTexture = createMoonTexture();
    const moonGeom = new THREE.SphereGeometry(1.737, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.9 });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    moonMesh.position.set(45, 10, -25);
    scene.add(moonMesh);

    // 10. GPU-Instanced Mesh for Orbital Objects
    const maxObjects = 1200;
    const instGeom = new THREE.SphereGeometry(0.12, 12, 12);
    const instMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instMesh = new THREE.InstancedMesh(instGeom, instMat, maxObjects);
    instMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instMesh);
    instancedMeshRef.current = instMesh;

    // Raycast Object Click
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      if (instancedMeshRef.current && positions.length > 0) {
        const intersects = raycaster.current.intersectObject(instancedMeshRef.current);
        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
          const clickedPos = positions[intersects[0].instanceId];
          if (clickedPos) {
            const foundObj = objects.find((o) => o.norad_id === clickedPos.norad_id);
            if (foundObj) {
              onSelectObject(foundObj);
              const targetVec = new THREE.Vector3(
                clickedPos.x_km / 1000,
                clickedPos.z_km / 1000,
                -clickedPos.y_km / 1000
              );
              controls.target.copy(targetVec);
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();

      if (earthMeshRef.current) earthMeshRef.current.rotation.y += 0.0004;
      if (cloudMeshRef.current) cloudMeshRef.current.rotation.y += 0.0006;

      // Follow Camera Mode
      if (isFollowMode && selectedPos && controlsRef.current && cameraRef.current) {
        const targetPos = new THREE.Vector3(
          selectedPos.x_km / 1000,
          selectedPos.z_km / 1000,
          -selectedPos.y_km / 1000
        );
        controlsRef.current.target.copy(targetPos);
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

  // Update Instanced Orbital Objects with Filters
  useEffect(() => {
    if (!instancedMeshRef.current || positions.length === 0) return;
    const mesh = instancedMeshRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    let visibleCount = 0;
    positions.forEach((pos) => {
      // Apply Type & Altitude Filters
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
      const scale = isSelected ? 2.5 : 1.0;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(visibleCount, dummy.matrix);

      if (isSelected) {
        color.setHex(0xffffff);
      } else if (pos.type === 'DEBRIS') {
        color.setHex(0xff3344);
      } else if (pos.type === 'ROCKET_BODY') {
        color.setHex(0xffaa00);
      } else {
        color.setHex(0x00f0ff);
      }
      mesh.setColorAt(visibleCount, color);
      visibleCount++;
    });

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
        linewidth: 2,
        transparent: true,
        opacity: 0.85
      });
      const trajLine = new THREE.Line(lineGeom, lineMat);
      scene.add(trajLine);
      trajectoryLineRef.current = trajLine;
    }
  }, [trajectoryData, selectedObject]);

  // Conjunction Visual Encounter Line
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (conjLineRef.current) {
      scene.remove(conjLineRef.current);
      conjLineRef.current.geometry.dispose();
      conjLineRef.current = null;
    }

    if (selectedConjunction) {
      const posA = positions.find((p) => p.id === selectedConjunction.object_a_id);
      const posB = positions.find((p) => p.id === selectedConjunction.object_b_id);

      if (posA && posB) {
        const vA = new THREE.Vector3(posA.x_km / 1000, posA.z_km / 1000, -posA.y_km / 1000);
        const vB = new THREE.Vector3(posB.x_km / 1000, posB.z_km / 1000, -posB.y_km / 1000);
        const lineGeom = new THREE.BufferGeometry().setFromPoints([vA, vB]);
        const lineMat = new THREE.LineDashedMaterial({
          color: 0xff3344,
          dashSize: 0.5,
          gapSize: 0.2,
          linewidth: 3
        });
        const line = new THREE.Line(lineGeom, lineMat);
        line.computeLineDistances();
        scene.add(line);
        conjLineRef.current = line;
      }
    }
  }, [selectedConjunction, positions]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(18, 12, 22);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      setIsFollowMode(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    const found = objects.find(
      (o) => o.name.toLowerCase().includes(q) || o.norad_id.toString() === q
    );
    if (found) {
      onSelectObject(found);
      const p = positions.find((pos) => pos.norad_id === found.norad_id);
      if (p && controlsRef.current) {
        controlsRef.current.target.set(p.x_km / 1000, p.z_km / 1000, -p.y_km / 1000);
      }
    }
  };

  const handleJumpToTca = (conj: Conjunction) => {
    const tcaDate = new Date(conj.tca);
    setSimTime(tcaDate);
    setIsPlaying(false);
    onSelectConjunction(conj);
  };

  return (
    <div
      className={`relative w-full bg-space-950 rounded-2xl border border-space-800 overflow-hidden shadow-2xl flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[calc(100vh-140px)] min-h-[640px]'
      }`}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* LEFT PANEL: Collapsible Space Traffic HUD & Catalog Search */}
      <div
        className={`absolute top-4 left-4 z-20 flex flex-col gap-3 transition-all duration-300 ${
          isLeftPanelOpen ? 'w-80' : 'w-12'
        }`}
      >
        {/* Toggle Button */}
        <div className="flex items-center justify-between bg-space-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-space-700 font-mono text-xs shadow-xl text-white">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-neon animate-pulse" />
            {isLeftPanelOpen && <span className="font-bold tracking-wider">SPACE CONTROL HUD</span>}
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
              <span className="text-cyan-400 font-bold">{positions.length} Tracked</span>
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
        <div className="absolute top-16 right-4 z-20 w-84 bg-space-900/95 backdrop-blur-md border border-cyan-500/40 p-4 rounded-2xl font-mono text-xs shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-220px)] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-space-700 pb-2.5 mb-2.5">
            <div>
              <div className="font-bold text-cyan-neon text-sm">{selectedObject.name}</div>
              <div className="text-[10px] text-slate-400">NORAD ID: {selectedObject.norad_id} • {selectedObject.object_type}</div>
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
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">Live SGP4 Telemetry</div>
            <div className="flex justify-between">
              <span className="text-slate-400">Altitude:</span>
              <span className="text-white font-bold">{selectedPos ? `${selectedPos.alt_km.toFixed(1)} km` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Velocity:</span>
              <span className="text-cyan-400 font-bold">{selectedPos ? `${selectedPos.velocity_km_s.toFixed(2)} km/s` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lat / Lon:</span>
              <span>{selectedPos ? `${selectedPos.lat.toFixed(2)}°, ${selectedPos.lon.toFixed(2)}°` : 'N/A'}</span>
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
              <span className="text-slate-400">Source:</span>
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
        <div className="absolute top-16 right-4 z-20 w-84 bg-space-900/95 backdrop-blur-md border border-danger-500/50 p-4 rounded-2xl font-mono text-xs shadow-2xl text-slate-200 animate-pulse">
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
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  simSpeed === spd
                    ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}X
              </button>
            ))}
          </div>

          <button
            onClick={() => setSimTime(new Date())}
            className="px-2.5 py-1 bg-space-950 hover:bg-space-800 text-slate-300 rounded-lg border border-space-800 text-[11px]"
            title="Reset Simulation Time to Real Time"
          >
            RESET TO NOW
          </button>
        </div>

        {/* Quick Conjunction Events Indicator */}
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px]">UPCOMING CONJUNCTIONS:</span>
          {conjunctions.length === 0 ? (
            <span className="text-emerald-400 font-bold text-[11px]">0 SCREENED EVENTS</span>
          ) : (
            conjunctions.slice(0, 2).map((c) => (
              <button
                key={c.id}
                onClick={() => handleJumpToTca(c)}
                className="px-2 py-0.5 bg-danger-500/20 text-danger-300 hover:bg-danger-500/30 border border-danger-500/40 rounded text-[10px] flex items-center gap-1 font-bold"
              >
                <Crosshair className="w-3 h-3 text-danger-400" />
                <span>{c.object_a?.name || 'A'} ↔ {c.object_b?.name || 'B'} ({c.miss_distance_km}km)</span>
              </button>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Satellite</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-500"></span>
            <span>Debris</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-warning-500"></span>
            <span>Rocket</span>
          </div>
        </div>
      </div>
    </div>
  );
};
