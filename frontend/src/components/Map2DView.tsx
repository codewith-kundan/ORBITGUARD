import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Satellite, 
  Radio, 
  Search
} from 'lucide-react';
import { OrbitalObject, GroundTrackRibbonResponse, GroundStation } from '../types';
import { api } from '../services/api';

interface Map2DViewProps {
  objects: OrbitalObject[];
  selectedObject: OrbitalObject | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onOpenOverpassModal: (obj: OrbitalObject) => void;
}

export const Map2DView: React.FC<Map2DViewProps> = ({
  objects,
  selectedObject,
  onSelectObject,
  onOpenOverpassModal
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trackData, setTrackData] = useState<GroundTrackRibbonResponse | null>(null);
  const [stations, setStations] = useState<GroundStation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllObjects, setShowAllObjects] = useState<boolean>(true);
  const [showFootprint, setShowFootprint] = useState<boolean>(true);
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);

  // Active object to track: selectedObject or default to first object (e.g. ISS)
  const activeObj = selectedObject || objects[0] || null;

  // Fetch predefined ground stations
  useEffect(() => {
    api.getGroundStations().then(setStations).catch(() => {});
  }, []);

  // Fetch continuous ground track for active object
  useEffect(() => {
    if (!activeObj) return;
    let isMounted = true;
    api.getGroundTrack(activeObj.norad_id)
      .then((data) => {
        if (isMounted) {
          setTrackData(data);
        }
      })
      .catch(() => {});

    const interval = setInterval(() => {
      api.getGroundTrack(activeObj.norad_id)
        .then((data) => {
          if (isMounted) setTrackData(data);
        })
        .catch(() => {});
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeObj?.norad_id]);

  // Filter objects for search
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects.slice(0, 100);
    const q = searchQuery.toLowerCase();
    return objects.filter(o => o.name.toLowerCase().includes(q) || o.norad_id.toString().includes(q)).slice(0, 100);
  }, [objects, searchQuery]);

  // World Map Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Coordinate converter helper: lat [-90, 90] -> y [h, 0], lon [-180, 180] -> x [0, w]
      const lonToX = (lon: number) => ((lon + 180) / 360) * w;
      const latToY = (lat: number) => ((90 - lat) / 180) * h;

      // 1. Clear Background (Space Slate)
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw Lat/Lon Grids
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(30, 58, 95, 0.3)';

      // Latitude lines every 30 deg
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = latToY(lat);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';
        ctx.font = '9px monospace';
        ctx.fillText(`${lat >= 0 ? lat + '°N' : Math.abs(lat) + '°S'}`, 6, y - 3);
      }

      // Longitude lines every 45 deg
      for (let lon = -180; lon <= 180; lon += 45) {
        const x = lonToX(lon);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';
        ctx.font = '9px monospace';
        if (lon > -180 && lon < 180) {
          ctx.fillText(`${lon >= 0 ? lon + '°E' : Math.abs(lon) + '°W'}`, x + 4, h - 8);
        }
      }

      // Highlight Equator and Prime Meridian
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, latToY(0));
      ctx.lineTo(w, latToY(0));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(lonToX(0), 0);
      ctx.lineTo(lonToX(0), h);
      ctx.stroke();

      // 3. Simplified Continents Outlines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';

      // Rough Continental landmass shapes (Equirectangular)
      const landmasses = [
        // North America
        [[-168, 65], [-140, 70], [-100, 70], [-60, 60], [-65, 45], [-75, 25], [-90, 18], [-105, 22], [-120, 35], [-125, 50], [-168, 65]],
        // South America
        [[-80, 10], [-50, -5], [-35, -5], [-40, -22], [-55, -35], [-65, -55], [-75, -50], [-70, -20], [-80, 0], [-80, 10]],
        // Europe & Asia (Eurasia)
        [[-10, 36], [0, 45], [10, 55], [30, 70], [60, 72], [100, 75], [170, 65], [140, 35], [120, 22], [100, 10], [80, 10], [60, 25], [40, 30], [30, 32], [-5, 36], [-10, 36]],
        // Africa
        [[-15, 30], [10, 37], [32, 30], [50, 12], [40, -10], [30, -32], [18, -34], [10, 0], [-15, 10], [-15, 30]],
        // Australia
        [[115, -20], [130, -12], [145, -15], [152, -28], [140, -38], [115, -35], [115, -20]],
      ];

      landmasses.forEach((poly) => {
        ctx.beginPath();
        poly.forEach(([lon, lat], idx) => {
          const px = lonToX(lon);
          const py = latToY(lat);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // 4. Day / Night Solar Terminator Curve
      if (showTerminator && trackData?.sub_solar_point) {
        const sunLat = trackData.sub_solar_point.latitude;
        const sunLon = trackData.sub_solar_point.longitude;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 4) {
          const lon = (x / w) * 360 - 180;
          const dLon = mathRadians(lon - sunLon);
          const latTerm = mathDegrees(Math.atan(-Math.cos(dLon) / Math.tan(mathRadians(sunLat || 0.1))));
          const y = latToY(latTerm);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Draw Sun Sub-Solar Point Marker
        const sunX = lonToX(sunLon);
        const sunY = latToY(sunLat);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = '10px monospace';
        ctx.fillText('☉ SUN', sunX + 8, sunY - 4);
      }

      // 5. Global Ground Stations
      if (showStations) {
        stations.forEach((st) => {
          const sx = lonToX(st.longitude_deg);
          const sy = latToY(st.latitude_deg);

          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#a7f3d0';
          ctx.font = '9px monospace';
          ctx.fillText(st.name.split('(')[0].trim(), sx + 6, sy - 4);
        });
      }

      // 6. Multi-Satellite Points (Catalog Overlay)
      if (showAllObjects) {
        objects.forEach((o) => {
          if (o.perigee_km == null || o.apogee_km == null) return;
          // Sub-point approximation for other catalog dots
          const isSelected = activeObj?.norad_id === o.norad_id;
          if (isSelected) return; // Drawn in high-def below

          // Pseudorandom spread based on RAAN/inclination
          const pseudoLon = (((o.norad_id * 37.13 + (Date.now() / 200000)) % 360) - 180);
          const maxLat = Math.min(85, o.inclination || 51.6);
          const pseudoLat = Math.sin(o.norad_id * 19.3 + (Date.now() / 200000)) * maxLat;

          const dotX = lonToX(pseudoLon);
          const dotY = latToY(pseudoLat);

          ctx.fillStyle = o.object_type === 'DEBRIS' ? '#ef4444' : o.object_type === 'ROCKET_BODY' ? '#f59e0b' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 7. Active Satellite Ground Track Ribbon
      if (trackData) {
        // Past Track (Solid Cyan)
        if (trackData.past_track.length > 1) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();

          for (let i = 0; i < trackData.past_track.length; i++) {
            const pt = trackData.past_track[i];
            const px = lonToX(pt.longitude);
            const py = latToY(pt.latitude);

            if (i > 0) {
              const prev = trackData.past_track[i - 1];
              // Avoid wrap-around line across canvas edge
              if (Math.abs(pt.longitude - prev.longitude) > 180) {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px, py);
                continue;
              }
            }
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Future Projected Track (Dashed Emerald)
        if (trackData.future_track.length > 1) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();

          for (let i = 0; i < trackData.future_track.length; i++) {
            const pt = trackData.future_track[i];
            const px = lonToX(pt.longitude);
            const py = latToY(pt.latitude);

            if (i > 0) {
              const prev = trackData.future_track[i - 1];
              if (Math.abs(pt.longitude - prev.longitude) > 180) {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px, py);
                continue;
              }
            }
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 8. Coverage Footprint Circle
        const curr = trackData.current_position;
        const curX = lonToX(curr.longitude);
        const curY = latToY(curr.latitude);

        if (showFootprint && curr.footprint_radius_km > 0) {
          const footprintPx = (curr.footprint_radius_km / 40075.0) * w;
          ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(curX, curY, Math.max(15, footprintPx), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Current Satellite Beacon Marker
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(curX, curY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pulsing ring
        const pulseR = 8 + (Date.now() % 1000) / 100;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(curX, curY, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`🛰️ ${trackData.object_name} (#${trackData.norad_id})`, curX + 12, curY - 6);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText(`Alt: ${curr.altitude_km.toFixed(1)} km • Lat: ${curr.latitude.toFixed(2)}° • Lon: ${curr.longitude.toFixed(2)}°`, curX + 12, curY + 8);
      }
    };

    render();
    const interval = setInterval(render, 1000);

    return () => {
      clearInterval(interval);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [trackData, stations, showAllObjects, showFootprint, showTerminator, showStations, objects, activeObj]);

  const mathRadians = (deg: number) => (deg * Math.PI) / 180.0;
  const mathDegrees = (rad: number) => (rad * 180.0) / Math.PI;

  return (
    <div className="flex-1 flex flex-col bg-space-950 text-slate-100 font-mono relative overflow-hidden h-[calc(100vh-105px)]">
      {/* Top Controls Bar */}
      <div className="bg-space-900/90 border-b border-space-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-20 backdrop-blur-md">
        {/* Search & Selector */}
        <div className="flex items-center gap-3">
          <div className="relative w-64 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Track satellite on 2D map..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-space-950 border border-space-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {activeObj && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-neon font-bold text-xs">
              <Satellite className="w-3.5 h-3.5" />
              <span>ACTIVE: {activeObj.name}</span>
            </div>
          )}
        </div>

        {/* View Toggles & Overpass Launcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFootprint(!showFootprint)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
              showFootprint 
                ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/40' 
                : 'bg-space-950 text-slate-400 border-space-800'
            }`}
          >
            Footprint Circle
          </button>

          <button
            onClick={() => setShowTerminator(!showTerminator)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
              showTerminator 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                : 'bg-space-950 text-slate-400 border-space-800'
            }`}
          >
            Day/Night
          </button>

          <button
            onClick={() => setShowAllObjects(!showAllObjects)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
              showAllObjects 
                ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/40' 
                : 'bg-space-950 text-slate-400 border-space-800'
            }`}
          >
            Catalog Swarm
          </button>

          <button
            onClick={() => setShowStations(!showStations)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
              showStations 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-space-950 text-slate-400 border-space-800'
            }`}
          >
            Ground Stations
          </button>

          {activeObj && (
            <button
              onClick={() => onOpenOverpassModal(activeObj)}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-lg text-xs font-bold transition shadow-md"
            >
              <Radio className="w-3.5 h-3.5" />
              PASS PREDICTOR
            </button>
          )}
        </div>
      </div>

      {/* Main 2D Canvas Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1800}
          height={900}
          className="w-full h-full object-fill block"
        />

        {/* Floating Search Results Dropdown */}
        {searchQuery.trim() && (
          <div className="absolute top-3 left-4 z-30 w-80 max-h-64 bg-space-900/95 border border-cyan-500/40 rounded-xl overflow-y-auto shadow-2xl p-2 space-y-1">
            {filteredObjects.map((o) => (
              <div
                key={o.norad_id}
                onClick={() => {
                  onSelectObject(o);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-space-800 rounded-lg cursor-pointer transition text-xs flex justify-between items-center"
              >
                <div>
                  <div className="text-white font-bold">{o.name}</div>
                  <div className="text-[10px] text-slate-400">NORAD #{o.norad_id} • {o.object_type}</div>
                </div>
                <span className="text-[10px] text-cyan-neon font-bold">TRACK</span>
              </div>
            ))}
          </div>
        )}

        {/* Telemetry Floating Card (Bottom-Left) */}
        {trackData && (
          <div className="absolute bottom-4 left-4 z-20 bg-space-950/90 backdrop-blur-xl border border-space-800 p-3.5 rounded-xl text-xs space-y-2 max-w-xs sm:max-w-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-space-800 pb-1.5">
              <span className="font-bold text-white text-xs">{trackData.object_name}</span>
              <span className="text-[10px] text-emerald-400 font-bold">LIVE RIBBON</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">LATITUDE:</span>
                <span className="text-white font-bold">{trackData.current_position.latitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-500 block">LONGITUDE:</span>
                <span className="text-white font-bold">{trackData.current_position.longitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-500 block">ALTITUDE:</span>
                <span className="text-cyan-neon font-bold">{trackData.current_position.altitude_km.toFixed(1)} km</span>
              </div>
              <div>
                <span className="text-slate-500 block">FOOTPRINT RADIUS:</span>
                <span className="text-emerald-400 font-bold">{trackData.footprint_radius_km.toFixed(0)} km</span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-space-800 flex justify-between items-center text-[10px]">
              <span className="text-slate-400">ORBIT PERIOD: {trackData.period_minutes.toFixed(1)} min</span>
              <span className={`font-bold ${trackData.current_position.is_sunlit ? 'text-amber-400' : 'text-slate-500'}`}>
                {trackData.current_position.is_sunlit ? '☀️ SUNLIT' : '🌑 ECLIPSED'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
