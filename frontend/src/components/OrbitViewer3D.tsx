import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitalObject, OrbitalPosition, Conjunction } from '../types';
import { api } from '../services/api';
import { Globe, Play, Pause } from 'lucide-react';

interface OrbitViewer3DProps {
  objects: OrbitalObject[];
  conjunctions?: Conjunction[];
  selectedObject: OrbitalObject | null;
  onSelectObject?: (obj: OrbitalObject) => void;
}

export const OrbitViewer3D: React.FC<OrbitViewer3DProps> = ({
  objects,
  selectedObject
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<{ object: OrbitalObject; pos: OrbitalPosition }[]>([]);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch 3D positions
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      if (objects.length === 0) return;
      setLoading(true);
      try {
        const promises = objects.slice(0, 35).map(async (obj) => {
          try {
            const pos = await api.getObjectPosition(obj.norad_id);
            return { object: obj, pos };
          } catch (e) {
            return null;
          }
        });
        const res = await Promise.all(promises);
        if (isMounted) {
          setPositions(res.filter((p): p is { object: OrbitalObject; pos: OrbitalPosition } => p !== null));
        }
      } catch (err) {
        console.error('Error fetching 3D positions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [objects]);

  // Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = 540;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
    dirLight.position.set(20, 20, 20);
    scene.add(dirLight);

    // Earth Sphere (Scaled Earth Radius = 6.37 units)
    const earthRadius = 6.371;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x0f172a,
      emissive: 0x060f24,
      specular: 0x22d3ee,
      shininess: 15,
      wireframe: false
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Atmosphere Glow Mesh
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.025, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphere);

    // Latitude & Longitude Wireframe Grid around Earth
    const wireGeo = new THREE.SphereGeometry(earthRadius * 1.002, 36, 18);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const gridMesh = new THREE.Mesh(wireGeo, wireMat);
    scene.add(gridMesh);

    // Starfield particles in background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 300;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.7 });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Satellite Markers Group
    const satellitesGroup = new THREE.Group();
    scene.add(satellitesGroup);

    // Helper to map TEME km coordinates to 3D Three.js units (scale: 1 unit = 1000 km)
    const scale = 0.001;

    positions.forEach(({ object, pos }) => {
      const isSelected = selectedObject?.norad_id === object.norad_id;
      const isDebris = object.object_type === 'debris';
      const isRocket = object.object_type === 'rocket_body';

      const color = isDebris ? 0xff4d4f : isRocket ? 0xfaad14 : 0x00f0ff;
      const size = isSelected ? 0.35 : isDebris ? 0.18 : 0.25;

      const satGeo = new THREE.SphereGeometry(size, 16, 16);
      const satMat = new THREE.MeshBasicMaterial({ color });
      const satMesh = new THREE.Mesh(satGeo, satMat);

      satMesh.position.set(pos.x_km * scale, pos.z_km * scale, -pos.y_km * scale);
      satMesh.userData = { object };
      satellitesGroup.add(satMesh);

      // Draw subtle orbital ring
      const orbitRadius = Math.sqrt(pos.x_km ** 2 + pos.y_km ** 2 + pos.z_km ** 2) * scale;
      const ringGeo = new THREE.BufferGeometry();
      const points = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
      }
      ringGeo.setFromPoints(points);
      const ringMat = new THREE.LineBasicMaterial({
        color: isSelected ? 0x00f0ff : color,
        transparent: true,
        opacity: isSelected ? 0.6 : 0.15
      });
      const ringLine = new THREE.Line(ringGeo, ringMat);
      satellitesGroup.add(ringLine);
    });

    // Mouse Drag Rotation
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      scene.rotation.y += deltaX * 0.005;
      scene.rotation.x += deltaY * 0.005;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(12, Math.min(60, camera.position.z + e.deltaY * 0.03));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (isRotating && !isMouseDown) {
        earth.rotation.y += 0.0015;
        gridMesh.rotation.y += 0.0015;
        satellitesGroup.rotation.y += 0.001;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [positions, selectedObject, isRotating]);

  return (
    <div className="bg-space-950 border border-space-800 rounded-xl overflow-hidden shadow-2xl relative h-[580px] flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-space-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-space-700 font-mono text-xs text-slate-200 shadow-xl">
        <Globe className="w-4 h-4 text-cyan-neon animate-pulse" />
        <span>3D EARTH & CELESTIAL ORBITAL GLOBE</span>
        {loading && <span className="text-[10px] text-cyan-400 animate-pulse">(Propagating...)</span>}
      </div>

      {/* Control Buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-space-900/90 backdrop-blur-md p-1.5 rounded-xl border border-space-700 font-mono text-xs shadow-xl">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
            isRotating ? 'bg-cyan-500/20 text-cyan-neon' : 'text-slate-400 hover:text-white'
          }`}
        >
          {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isRotating ? 'PAUSE' : 'AUTO-ROTATE'}
        </button>
      </div>

      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D Legend */}
      <div className="bg-space-900/90 border-t border-space-800 px-5 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Active Satellites</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-500"></span>
            <span>Debris Fragments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning-500"></span>
            <span>Rocket Stages</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          Drag to rotate • Scroll to zoom • Three.js WebGL Engine
        </div>
      </div>
    </div>
  );
};
