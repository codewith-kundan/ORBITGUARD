import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  OrbitalObject,
  OrbitalPosition,
  Conjunction,
  TrajectoryResponse
} from '../types';
import { api } from '../services/api';
import {
  getOrbitalCanvasTexture,
  getOrbitalIconCategory
} from '../utils/orbitalIcons';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Crosshair,
  Grid,
  Search,
  FastForward,
  Clock
} from 'lucide-react';

interface OrbitViewer3DProps {
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction: (conj: Conjunction | null) => void;
}

const EARTH_RADIUS = 6.371; // Scale: 1 unit = 1000 km

// Astronomical Solar Direction calculation from UTC Date
function calculateSunDirection(utcDate: Date): THREE.Vector3 {
  const jd = utcDate.getTime() / 86400000.0 + 2440587.5;
  const d = jd - 2451545.0; // Days since J2000.0

  // Mean anomaly of the Sun
  const g = (357.529 + 0.98560028 * d) * (Math.PI / 180.0);
  // Mean longitude of the Sun
  const q = 280.459 + 0.98564736 * d;
  // Ecliptic longitude
  const l = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2.0 * g)) * (Math.PI / 180.0);
  // Obliquity of the ecliptic
  const e = (23.439 - 0.00000036 * d) * (Math.PI / 180.0);

  const x = Math.cos(l);
  const y = Math.sin(l) * Math.cos(e);
  const z = Math.sin(l) * Math.sin(e);

  return new THREE.Vector3(x, z, -y).normalize();
}

// Generate Realistic High-Resolution Earth Day Surface Canvas Texture
function createEarthDayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep Blue Ocean base
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#04132b');
  oceanGrad.addColorStop(0.2, '#0a2e5c');
  oceanGrad.addColorStop(0.5, '#0f488a');
  oceanGrad.addColorStop(0.8, '#0a2e5c');
  oceanGrad.addColorStop(1, '#04132b');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Realistic Continents Landmass Fill
  ctx.fillStyle = '#1e3f20';
  ctx.strokeStyle = '#2d5c31';
  ctx.lineWidth = 3;

  // North America
  ctx.beginPath();
  ctx.ellipse(420, 280, 240, 150, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Central America / Caribbean
  ctx.beginPath();
  ctx.ellipse(450, 470, 60, 40, 0.4, 0, Math.PI * 2);
  ctx.fill();

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

  // Sahara Desert / Middle East Golden Sand Terrain
  ctx.fillStyle = '#6e5d2b';
  ctx.beginPath();
  ctx.ellipse(1130, 430, 130, 70, 0, 0, Math.PI * 2);
  ctx.ellipse(1320, 420, 90, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // India Subcontinent
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

// Generate Realistic Earth Night-Lights Canvas Texture (City Lights)
function createEarthNightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Pitch black night base
  ctx.fillStyle = '#020308';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Golden Amber City Lights Clusters
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

  // Major Global Population Centers
  drawCityHub(380, 270, 70, 180);  // US East Coast / NYC
  drawCityHub(270, 290, 50, 120);  // US West Coast / LA
  drawCityHub(630, 680, 60, 140);  // South America / Sao Paulo
  drawCityHub(1080, 260, 80, 250); // Western Europe / London / Paris
  drawCityHub(1430, 470, 90, 320); // India / Delhi / Mumbai
  drawCityHub(1620, 380, 90, 300); // East Asia / Tokyo / Shanghai
  drawCityHub(1680, 730, 50, 90);  // Australia / Sydney

  ctx.globalAlpha = 1.0;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Generate Realistic Cloud Layer Canvas Texture
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

// Generate Moon Texture
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

export const OrbitViewer3D: React.FC<OrbitViewer3DProps> = ({
  objects,
  conjunctions: _conjunctions,
  selectedObject,
  selectedConjunction,
  onSelectObject,
  onSelectConjunction
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [trajectoryHours, setTrajectoryHours] = useState<number>(12);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryResponse | null>(null);
  const [positions, setPositions] = useState<OrbitalPosition[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudMeshRef = useRef<THREE.Mesh | null>(null);
  const gridMeshRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const debrisMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const satMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rocketMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const gpsMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const targetReticleRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const conjLineRef = useRef<THREE.Line | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Fetch real-time batch positions
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      try {
        const batch = await api.getBatchPositions(simTime.toISOString(), 3000);
        if (isMounted && batch.positions) {
          setPositions(batch.positions);
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
  }, [simSpeed, isPlaying]);

  // Simulation Clock Progression
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSimTime((prev) => new Date(prev.getTime() + 1000 * simSpeed));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, simSpeed]);

  // Fetch Trajectory for Selected Object
  useEffect(() => {
    let isMounted = true;
    const fetchTraj = async () => {
      if (!selectedObject) {
        setTrajectoryData(null);
        return;
      }
      try {
        const traj = await api.getObjectTrajectory(selectedObject.norad_id, trajectoryHours, 5, simTime.toISOString());
        if (isMounted) setTrajectoryData(traj);
      } catch (err) {
        console.error('Failed to get trajectory:', err);
      }
    };
    fetchTraj();
    return () => { isMounted = false; };
  }, [selectedObject, trajectoryHours]);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(18, 12, 22);
    cameraRef.current = camera;

    // 2. Renderer
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
    controls.minDistance = 7.5;
    controls.maxDistance = 150;
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

    // 5. Realistic Starfield
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

    // 6. Realistic Colorful Earth with Day/Night Terminator Shader
    const dayTexture = createEarthDayTexture();
    const nightTexture = createEarthNightTexture();

    // Custom Shader Material that blends Day texture with Night City Lights based on the Sun's Light Vector
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
          
          // Twilight blend factor (-0.1 to +0.15 transition)
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

    // 9. Latitude & Longitude Graticule Grid
    const gridGroup = new THREE.Group();
    const gridMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.15 });

    for (let lat = -60; lat <= 60; lat += 30) {
      const r = (EARTH_RADIUS + 0.02) * Math.cos((lat * Math.PI) / 180);
      const y = (EARTH_RADIUS + 0.02) * Math.sin((lat * Math.PI) / 180);
      const circleGeom = new THREE.BufferGeometry();
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
      }
      circleGeom.setFromPoints(pts);
      gridGroup.add(new THREE.Line(circleGeom, gridMat));
    }
    scene.add(gridGroup);
    gridMeshRef.current = gridGroup;

    // 10. Realistic Moon
    const moonTexture = createMoonTexture();
    const moonGeom = new THREE.SphereGeometry(1.737, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.9 });
    const moonMesh = new THREE.Mesh(moonGeom, moonMat);
    moonMesh.position.set(45, 10, -25);
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;

    // 11. High-Performance Billboard Instanced Meshes for Orbital Icon Notations
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

    const maxObjects = 2500;
    const quadGeom = new THREE.PlaneGeometry(1.0, 1.0);

    const satMesh = new THREE.InstancedMesh(quadGeom, createBillboardMaterial(getOrbitalCanvasTexture('PAYLOAD', 128)), maxObjects);
    satMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(satMesh);
    satMeshRef.current = satMesh;

    const debrisMesh = new THREE.InstancedMesh(quadGeom, createBillboardMaterial(getOrbitalCanvasTexture('DEBRIS', 128)), maxObjects);
    debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(debrisMesh);
    debrisMeshRef.current = debrisMesh;

    const rocketMesh = new THREE.InstancedMesh(quadGeom, createBillboardMaterial(getOrbitalCanvasTexture('ROCKET', 128)), maxObjects);
    rocketMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(rocketMesh);
    rocketMeshRef.current = rocketMesh;

    const gpsMesh = new THREE.InstancedMesh(quadGeom, createBillboardMaterial(getOrbitalCanvasTexture('GPS', 128)), maxObjects);
    gpsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(gpsMesh);
    gpsMeshRef.current = gpsMesh;

    // Target Lock Reticle
    const targetMat = new THREE.MeshBasicMaterial({
      map: getOrbitalCanvasTexture('TARGET', 128),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const targetMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), targetMat);
    targetMesh.visible = false;
    scene.add(targetMesh);
    targetReticleRef.current = targetMesh;

    // Raycasting Click Handler
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let closest: { pos: OrbitalPosition; dist: number } | null = null;
      const tempVec = new THREE.Vector3();

      for (const pos of positions) {
        tempVec.set(pos.x_km / 1000, pos.z_km / 1000, -pos.y_km / 1000);
        tempVec.project(camera);
        if (tempVec.z > 1.0) continue;

        const sx = (tempVec.x * 0.5 + 0.5) * rect.width;
        const sy = (-(tempVec.y * 0.5) + 0.5) * rect.height;
        const dx = mouseX - sx;
        const dy = mouseY - sy;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d <= 28) {
          if (!closest || d < closest.dist) {
            closest = { pos, dist: d };
          }
        }
      }

      if (closest) {
        const foundObj = objects.find((o) => o.norad_id === closest!.pos.norad_id);
        if (foundObj) {
          onSelectObject(foundObj);
          controls.target.set(
            closest.pos.x_km / 1000,
            closest.pos.z_km / 1000,
            -closest.pos.y_km / 1000
          );
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      controls.update();

      // Slow diurnal Earth & Cloud rotation
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y += 0.0004;
      }
      if (cloudMeshRef.current) {
        cloudMeshRef.current.rotation.y += 0.0006;
      }
      if (gridMeshRef.current) {
        gridMeshRef.current.rotation.y += 0.0004;
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
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      renderer.dispose();
    };
  }, []);

  // Update Solar Illumination Vector dynamically as Simulation Time changes
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

  // Update Instanced Orbital Objects Positions & Icon Meshes
  useEffect(() => {
    if (positions.length === 0) return;
    const dummy = new THREE.Object3D();

    let satIdx = 0;
    let debrisIdx = 0;
    let rocketIdx = 0;
    let gpsIdx = 0;

    positions.forEach((pos) => {
      const x = pos.x_km / 1000;
      const y = pos.z_km / 1000;
      const z = -pos.y_km / 1000;

      dummy.position.set(x, y, z);
      const isSelected = selectedObject?.norad_id === pos.norad_id;
      const cat = getOrbitalIconCategory(pos.name, pos.type, pos.norad_id);

      let scale = isSelected ? 2.4 : 0.9;
      if (cat === 'DEBRIS') scale = isSelected ? 2.4 : 0.78;
      if (cat === 'ROCKET') scale = isSelected ? 2.4 : 0.95;
      if (cat === 'GPS') scale = isSelected ? 2.4 : 0.95;

      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      if (cat === 'DEBRIS') {
        if (debrisMeshRef.current && debrisIdx < 2500) {
          debrisMeshRef.current.setMatrixAt(debrisIdx, dummy.matrix);
          debrisIdx++;
        }
      } else if (cat === 'ROCKET') {
        if (rocketMeshRef.current && rocketIdx < 2500) {
          rocketMeshRef.current.setMatrixAt(rocketIdx, dummy.matrix);
          rocketIdx++;
        }
      } else if (cat === 'GPS') {
        if (gpsMeshRef.current && gpsIdx < 2500) {
          gpsMeshRef.current.setMatrixAt(gpsIdx, dummy.matrix);
          gpsIdx++;
        }
      } else {
        if (satMeshRef.current && satIdx < 2500) {
          satMeshRef.current.setMatrixAt(satIdx, dummy.matrix);
          satIdx++;
        }
      }
    });

    if (satMeshRef.current) {
      satMeshRef.current.count = satIdx;
      satMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (debrisMeshRef.current) {
      debrisMeshRef.current.count = debrisIdx;
      debrisMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (rocketMeshRef.current) {
      rocketMeshRef.current.count = rocketIdx;
      rocketMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (gpsMeshRef.current) {
      gpsMeshRef.current.count = gpsIdx;
      gpsMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (targetReticleRef.current) {
      if (selectedObject) {
        const p = positions.find((pos) => pos.norad_id === selectedObject.norad_id);
        if (p) {
          targetReticleRef.current.visible = true;
          targetReticleRef.current.position.set(p.x_km / 1000, p.z_km / 1000, -p.y_km / 1000);
        } else {
          targetReticleRef.current.visible = false;
        }
      } else {
        targetReticleRef.current.visible = false;
      }
    }
  }, [positions, selectedObject]);

  // Update Selected Object Trajectory Line
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

  // Conjunction Visual Highlights
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

  // Toggle Grid
  useEffect(() => {
    if (gridMeshRef.current) {
      gridMeshRef.current.visible = showGrid;
    }
  }, [showGrid]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(18, 12, 22);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
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

  const handleJumpToTca = () => {
    if (selectedConjunction) {
      const tcaDate = new Date(selectedConjunction.tca);
      setSimTime(tcaDate);
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={`relative bg-space-950 border border-space-800 rounded-xl overflow-hidden shadow-2xl flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[600px]'
      }`}
    >
      {/* Top Left: Mission Control Telemetry HUD */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-sm">
        <div className="bg-space-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-space-700 font-mono text-xs text-slate-300 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-neon animate-pulse"></span>
            <span className="font-bold text-white tracking-wider">3D CELESTIAL ORBITAL GLOBE</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">SGP4 WGS84</span>
        </div>

        {/* Quick Search Overlay */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search NORAD / Name (e.g. ISS, 25544)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-space-900/90 backdrop-blur-md border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-lg"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </form>
      </div>

      {/* Top Right: Simulation Clock & Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* UTC Clock */}
        <div className="bg-space-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-space-700 font-mono text-xs text-cyan-400 shadow-xl flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>UTC: {simTime.toISOString().replace('T', ' ').substring(0, 19)}</span>
        </div>

        {/* Play/Pause & Speed Multipliers */}
        <div className="bg-space-900/90 backdrop-blur-md p-1 rounded-lg border border-space-700 font-mono text-xs flex items-center gap-1 shadow-xl">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 hover:bg-space-800 rounded text-slate-200 hover:text-cyan-neon"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          {[1, 10, 100, 1000].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimSpeed(spd)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                simSpeed === spd
                  ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}X
            </button>
          ))}
        </div>

        {/* View Toggles & Fullscreen */}
        <div className="bg-space-900/90 backdrop-blur-md p-1 rounded-lg border border-space-700 flex items-center gap-1 shadow-xl">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1 rounded ${showGrid ? 'text-cyan-neon bg-space-800' : 'text-slate-400'}`}
            title="Toggle Lat/Lon Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Left: Selected Object Telemetry Panel */}
      {selectedObject && (
        <div className="absolute bottom-12 left-4 z-20 bg-space-900/95 backdrop-blur-md border border-cyan-500/40 p-4 rounded-xl font-mono text-xs shadow-2xl text-slate-200 max-w-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-space-700 pb-2 mb-2">
            <div className="font-bold text-cyan-neon text-sm">{selectedObject.name}</div>
            <button
              onClick={() => onSelectObject(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">NORAD ID:</span>
              <span className="font-bold text-white">{selectedObject.norad_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TYPE:</span>
              <span className="font-bold text-cyan-400">{selectedObject.object_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ALTITUDE:</span>
              <span>{selectedObject.perigee_km != null && selectedObject.apogee_km != null ? `${selectedObject.perigee_km.toFixed(0)} - ${selectedObject.apogee_km.toFixed(0)} km` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">INCLINATION:</span>
              <span>{(selectedObject.inclination ?? (selectedObject as any).inclination_deg) != null ? `${(selectedObject.inclination ?? (selectedObject as any).inclination_deg).toFixed(2)}°` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PERIOD:</span>
              <span>{(selectedObject.period_minutes ?? (selectedObject as any).period_min) != null ? `${(selectedObject.period_minutes ?? (selectedObject as any).period_min).toFixed(1)} min` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SOURCE:</span>
              <span className="text-emerald-400">{selectedObject.source}</span>
            </div>
          </div>

          {/* Trajectory Time Window Selector */}
          <div className="mt-3 pt-2 border-t border-space-800">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
              <span>SGP4 TRAJECTORY WINDOW:</span>
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
                      : 'bg-space-800 text-slate-300 hover:bg-space-700'
                  }`}
                >
                  {h}H
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main 3D Canvas Mount */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom Right: Conjunction Alert Overlay if selected */}
      {selectedConjunction && (
        <div className="absolute bottom-12 right-4 z-20 bg-space-900/95 backdrop-blur-md border border-danger-500/50 p-4 rounded-xl font-mono text-xs shadow-2xl text-slate-200 max-w-sm animate-pulse">
          <div className="flex items-center justify-between border-b border-danger-500/30 pb-2 mb-2">
            <div className="font-bold text-danger-neon flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-danger-neon" />
              <span>CONJUNCTION EVENT</span>
            </div>
            <button
              onClick={() => onSelectConjunction(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="text-white font-semibold">{selectedConjunction.object_a?.name || 'Object A'} ↔ {selectedConjunction.object_b?.name || 'Object B'}</div>
            <div className="text-slate-400">TCA: <span className="text-white">{selectedConjunction.tca} UTC</span></div>
            <div className="text-slate-400">Miss Distance: <span className="text-danger-400 font-bold">{selectedConjunction.miss_distance_km} km</span></div>
            <div className="text-slate-400">Relative Velocity: <span className="text-warning-400">{selectedConjunction.relative_velocity_km_s} km/s</span></div>
            <div className="text-slate-400">Risk Score: <span className="text-danger-neon font-bold">{selectedConjunction.risk_score} / 100 ({selectedConjunction.risk_level})</span></div>
            
            {/* Jump to TCA Button */}
            <button
              onClick={handleJumpToTca}
              className="mt-2 w-full py-1.5 bg-danger-600 hover:bg-danger-500 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition"
            >
              <FastForward className="w-3.5 h-3.5" />
              JUMP TO TCA
            </button>
          </div>
        </div>
      )}

      {/* 3D Scene Legend Footer with Meaningful Image Notations */}
      <div className="bg-space-900 border-t border-space-800 px-4 py-2 flex items-center justify-between text-xs font-mono text-slate-300 z-20">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span>🚀</span>
            <span className="text-amber-300 font-semibold">Rocket Body</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💥</span>
            <span className="text-red-400 font-semibold">Space Debris</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>📡</span>
            <span className="text-emerald-400 font-semibold">GPS / GNSS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🛰️</span>
            <span className="text-cyan-400 font-semibold">Operational Satellites</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
            <span className="text-white font-semibold">Selected Target</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          GPU Billboard Icon Sprites • SGP4 Ephemeris
        </div>
      </div>
    </div>
  );
};
