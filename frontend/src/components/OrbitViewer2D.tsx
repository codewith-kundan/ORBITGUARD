import React, { useState, useEffect, useRef } from 'react';
import { OrbitalObject, OrbitalPosition, Conjunction, TrajectoryResponse } from '../types';
import { api } from '../services/api';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';

interface OrbitViewer2DProps {
  objects: OrbitalObject[];
  conjunctions: Conjunction[];
  selectedObject: OrbitalObject | null;
  selectedConjunction: Conjunction | null;
  onSelectObject: (obj: OrbitalObject) => void;
  onSelectConjunction: (conj: Conjunction) => void;
}

interface ObjectPoint {
  object: OrbitalObject;
  position: OrbitalPosition;
}

export const OrbitViewer2D: React.FC<OrbitViewer2DProps> = ({
  objects,
  conjunctions,
  selectedObject,
  selectedConjunction,
  onSelectObject,
  onSelectConjunction
}) => {
  const [positions, setPositions] = useState<ObjectPoint[]>([]);
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ObjectPoint | null>(null);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch real-time positions for tracked objects
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      if (objects.length === 0) return;
      setLoadingPositions(true);
      try {
        const promises = objects.slice(0, 40).map(async (obj) => {
          try {
            const pos = await api.getObjectPosition(obj.norad_id);
            return { object: obj, position: pos };
          } catch (e) {
            return null;
          }
        });
        const results = await Promise.all(promises);
        if (isMounted) {
          setPositions(results.filter((p): p is ObjectPoint => p !== null));
        }
      } catch (err) {
        console.error('Failed to propagate object positions:', err);
      } finally {
        if (isMounted) setLoadingPositions(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 15000); // 15s live refresh
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [objects]);

  // Fetch trajectory for selected object
  useEffect(() => {
    let isMounted = true;
    const fetchTraj = async () => {
      if (!selectedObject) {
        setTrajectory(null);
        return;
      }
      try {
        const traj = await api.getObjectTrajectory(selectedObject.norad_id, 12, 5);
        if (isMounted) setTrajectory(traj);
      } catch (err) {
        console.error('Failed to get trajectory:', err);
      }
    };
    fetchTraj();
    return () => { isMounted = false; };
  }, [selectedObject]);

  // Convert Lon [-180, 180] and Lat [-90, 90] to SVG canvas coords (1000x500 viewBox)
  const lonLatToSVG = (lon: number, lat: number) => {
    const x = ((lon + 180) / 360) * 1000;
    const y = ((90 - lat) / 180) * 500;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative bg-space-950 border border-space-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
      {/* Header Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-space-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-space-700 font-mono text-xs text-slate-300 shadow-lg">
        <Crosshair className="w-4 h-4 text-cyan-neon animate-spin" style={{ animationDuration: '8s' }} />
        <span>2D GROUND TRACK & ORBITAL SITUATIONAL MAP</span>
        {loadingPositions && <span className="text-[10px] text-cyan-400 animate-pulse">(Propagating...)</span>}
      </div>

      {/* Control Buttons */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-space-900/90 backdrop-blur-md p-1 rounded-lg border border-space-700 font-mono text-xs shadow-lg">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.3, 3.5))}
          className="p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.3, 0.8))}
          className="p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-1.5 hover:bg-space-800 rounded text-slate-300 hover:text-cyan-neon"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive SVG Map */}
      <div
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox="0 0 1000 500"
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging.current ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          <defs>
            {/* Equirectangular Grid Pattern */}
            <pattern id="grid" width="100" height="50" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 50" fill="none" stroke="rgba(34, 211, 238, 0.07)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Map Background */}
          <rect width="1000" height="500" fill="#070c1d" />
          <rect width="1000" height="500" fill="url(#grid)" />

          {/* Graticule Equator & Prime Meridian */}
          <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="1.5" strokeDasharray="6 4" />
          <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="1.5" strokeDasharray="6 4" />

          {/* Simplified World Coastlines (Stylized Equirectangular landmasses) */}
          <g fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="1.2">
            {/* North America */}
            <path d="M 150 90 Q 200 80 250 110 T 260 170 T 220 220 T 180 240 T 160 180 T 130 140 Z" fill="rgba(30, 41, 59, 0.35)" />
            {/* South America */}
            <path d="M 270 260 Q 320 280 340 330 T 320 420 T 280 460 T 260 380 T 250 300 Z" fill="rgba(30, 41, 59, 0.35)" />
            {/* Eurasia */}
            <path d="M 450 70 Q 550 50 700 70 T 880 110 T 800 200 T 700 220 T 580 170 T 480 140 Z" fill="rgba(30, 41, 59, 0.35)" />
            {/* Africa */}
            <path d="M 470 180 Q 550 180 570 240 T 580 350 T 520 400 T 470 320 T 450 220 Z" fill="rgba(30, 41, 59, 0.35)" />
            {/* Australia */}
            <path d="M 750 320 Q 820 310 850 350 T 820 410 T 760 390 T 730 350 Z" fill="rgba(30, 41, 59, 0.35)" />
            {/* Antarctica */}
            <path d="M 50 480 Q 500 470 950 480 L 950 500 L 50 500 Z" fill="rgba(30, 41, 59, 0.2)" />
          </g>

          {/* Render Trajectory Ground Track of Selected Object */}
          {trajectory && trajectory.points.length > 1 && (
            <g>
              {trajectory.points.map((pt, idx) => {
                if (idx === 0) return null;
                const prev = trajectory.points[idx - 1];
                if (Math.abs(pt.lon - prev.lon) > 180) return null;

                const p1 = lonLatToSVG(prev.lon, prev.lat);
                const p2 = lonLatToSVG(pt.lon, pt.lat);
                return (
                  <line
                    key={`traj-${idx}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#00f0ff"
                    strokeWidth="2"
                    strokeOpacity={0.7}
                    strokeDasharray="4 2"
                  />
                );
              })}
            </g>
          )}

          {/* Render Real Conjunction Hotspots from SGP4 TCA Coordinates */}
          {conjunctions.map((conj) => {
            const lon = conj.longitude_deg ?? 0;
            const lat = conj.latitude_deg ?? 0;
            const pt = lonLatToSVG(lon, lat);
            const isSelected = selectedConjunction?.id === conj.id;

            return (
              <g
                key={`conj-${conj.id}`}
                className="cursor-pointer"
                onClick={() => onSelectConjunction(conj)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 14 : 9}
                  fill="none"
                  stroke={conj.risk_level === 'CRITICAL' ? '#ff3344' : '#ffaa00'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="animate-ping"
                  opacity={0.7}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 4}
                  fill={conj.risk_level === 'CRITICAL' ? '#ff3344' : '#ffaa00'}
                />
              </g>
            );
          })}

          {/* Render Satellite & Debris Markers */}
          {positions.map((pt) => {
            const svgPos = lonLatToSVG(pt.position.lon, pt.position.lat);
            const isSelected = selectedObject?.norad_id === pt.object.norad_id;
            const isDebris = pt.object.object_type === 'debris';
            const isRocket = pt.object.object_type === 'rocket_body';

            const markerColor = isDebris ? '#ff4d4f' : isRocket ? '#faad14' : '#00f0ff';

            return (
              <g
                key={`sat-${pt.object.norad_id}`}
                className="cursor-pointer transition-transform duration-100"
                onClick={() => onSelectObject(pt.object)}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {isSelected && (
                  <circle
                    cx={svgPos.x}
                    cy={svgPos.y}
                    r="12"
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="animate-spin"
                    style={{ animationDuration: '4s' }}
                  />
                )}
                <circle
                  cx={svgPos.x}
                  cy={svgPos.y}
                  r={isSelected ? 6 : isDebris ? 3.5 : 4.5}
                  fill={markerColor}
                  stroke="#0b1021"
                  strokeWidth="1.5"
                />
                {/* Object Name Label */}
                {(isSelected || zoom > 1.8) && (
                  <text
                    x={svgPos.x + 8}
                    y={svgPos.y + 4}
                    fill="#e2e8f0"
                    fontSize="9"
                    fontFamily="monospace"
                    className="select-none font-bold"
                  >
                    {pt.object.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Information Box */}
      {hoveredPoint && (
        <div className="absolute bottom-12 left-4 z-30 bg-space-900/95 backdrop-blur-md border border-cyan-500/40 p-3 rounded-lg font-mono text-xs shadow-2xl text-slate-200">
          <div className="text-cyan-neon font-bold flex items-center gap-2">
            <span>{hoveredPoint.object.name}</span>
            <span className="text-[10px] text-slate-400">NORAD: {hoveredPoint.object.norad_id}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-300">
            <div>Type: <span className="capitalize text-white">{hoveredPoint.object.object_type}</span></div>
            <div>Altitude: <span className="text-cyan-400">{hoveredPoint.position.alt_km} km</span></div>
            <div>Velocity: <span className="text-cyan-400">{hoveredPoint.position.velocity_km_s} km/s</span></div>
            <div>Lat/Lon: <span className="text-slate-400">{hoveredPoint.position.lat.toFixed(2)}°, {hoveredPoint.position.lon.toFixed(2)}°</span></div>
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="bg-space-900 border-t border-space-800 px-4 py-2 flex items-center justify-between text-xs font-mono text-slate-400 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Active Satellite</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger-500"></span>
            <span>Space Debris</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning-500"></span>
            <span>Rocket Body</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-danger-500 animate-ping"></span>
            <span className="text-danger-neon">Conjunction Alert</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500">
          Equirectangular WGS84 Projection • SGP4 Ephemeris
        </div>
      </div>
    </div>
  );
};
