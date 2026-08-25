import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Satellite, 
  Radio, 
  Search, 
  X, 
  Info
} from 'lucide-react';
import { OrbitalObject, GroundTrackRibbonResponse, GroundStation } from '../types';
import { api } from '../services/api';

interface Map2DViewProps {
  objects: OrbitalObject[];
  selectedObject: OrbitalObject | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onOpenOverpassModal: (obj: OrbitalObject) => void;
  onOpenDetailsModal?: (obj: OrbitalObject) => void;
}

interface HoveredEntity {
  type: 'satellite' | 'station' | 'sun';
  name: string;
  id?: number | string;
  latitude: number;
  longitude: number;
  altitude_km?: number;
  country?: string;
  details?: string;
  screenX: number;
  screenY: number;
}

export const Map2DView: React.FC<Map2DViewProps> = ({
  objects,
  selectedObject,
  onSelectObject,
  onOpenOverpassModal,
  onOpenDetailsModal
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const earthImgRef = useRef<HTMLImageElement | null>(null);
  const earthNightImgRef = useRef<HTMLImageElement | null>(null);

  const [trackData, setTrackData] = useState<GroundTrackRibbonResponse | null>(null);
  const [stations, setStations] = useState<GroundStation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [showAllObjects, setShowAllObjects] = useState<boolean>(true);
  const [showFootprint, setShowFootprint] = useState<boolean>(true);
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showGrids, setShowGrids] = useState<boolean>(true);
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity | null>(null);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  // Active object to track
  const activeObj = useMemo(() => {
    if (selectedObject) return selectedObject;
    if (objects.length > 0) return objects[0];
    return null;
  }, [selectedObject, objects]);

  // Load Real NASA Earth Equirectangular Textures
  useEffect(() => {
    const dayImg = new Image();
    dayImg.src = '/textures/earth_day.jpg';
    dayImg.onload = () => {
      earthImgRef.current = dayImg;
      setImgLoaded(true);
    };

    const nightImg = new Image();
    nightImg.src = '/textures/earth_night.jpg';
    nightImg.onload = () => {
      earthNightImgRef.current = nightImg;
    };
  }, []);

  // Fetch predefined real global ground stations
  useEffect(() => {
    api.getGroundStations()
      .then(setStations)
      .catch((err) => console.error('Failed to load ground stations:', err));
  }, []);

  // Fetch continuous ground track ribbon for active object
  useEffect(() => {
    if (!activeObj) return;
    let isMounted = true;

    const fetchTrack = () => {
      api.getGroundTrack(activeObj.norad_id)
        .then((data) => {
          if (isMounted) setTrackData(data);
        })
        .catch((err) => console.error('Failed to load ground track:', err));
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeObj?.norad_id]);

  // Filter objects for search
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects.slice(0, 50);
    const q = searchQuery.toLowerCase();
    return objects
      .filter(o => o.name.toLowerCase().includes(q) || o.norad_id.toString().includes(q))
      .slice(0, 50);
  }, [objects, searchQuery]);

  const mathRadians = (deg: number) => (deg * Math.PI) / 180.0;
  const mathDegrees = (rad: number) => (rad * 180.0) / Math.PI;

  // Real 2D Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Coordinate converter helper: lat [-90, 90] -> y [h, 0], lon [-180, 180] -> x [0, w]
      const lonToX = (lon: number) => ((lon + 180) / 360) * w;
      const latToY = (lat: number) => ((90 - lat) / 180) * h;

      // 1. Draw Real NASA Earth Map Texture (or high-tech dark cartographic fallback)
      if (earthImgRef.current && earthImgRef.current.complete) {
        ctx.drawImage(earthImgRef.current, 0, 0, w, h);

        // Subtle dark contrast wash to make orbital lines pop
        ctx.fillStyle = 'rgba(6, 10, 18, 0.35)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // High-tech fallback canvas background
        ctx.fillStyle = '#060d1a';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Latitude and Longitude Grids
      if (showGrids) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';

        // Latitude lines every 30 deg
        for (let lat = -60; lat <= 60; lat += 30) {
          const y = latToY(lat);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.font = '10px monospace';
          ctx.fillText(`${lat >= 0 ? lat + '°N' : Math.abs(lat) + '°S'}`, 8, y - 4);
        }

        // Longitude lines every 45 deg
        for (let lon = -180; lon <= 180; lon += 45) {
          const x = lonToX(lon);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.font = '10px monospace';
          if (lon > -180 && lon < 180) {
            ctx.fillText(`${lon >= 0 ? lon + '°E' : Math.abs(lon) + '°W'}`, x + 4, h - 10);
          }
        }

        // Highlight Equator & Prime Meridian
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(0, latToY(0));
        ctx.lineTo(w, latToY(0));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(lonToX(0), 0);
        ctx.lineTo(lonToX(0), h);
        ctx.stroke();
      }

      // 3. Day / Night Solar Terminator Curve & Night Shading
      if (showTerminator && trackData?.sub_solar_point) {
        const sunLat = trackData.sub_solar_point.latitude;
        const sunLon = trackData.sub_solar_point.longitude;

        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
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
        ctx.restore();

        // Draw Sub-Solar Point
        const sunX = lonToX(sunLon);
        const sunY = latToY(sunLat);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('☉ SUB-SOLAR POINT', sunX + 10, sunY + 3);
      }

      // 4. Real Global Space Ground Station Locations
      if (showStations) {
        stations.forEach((st) => {
          const sx = lonToX(st.longitude_deg);
          const sy = latToY(st.latitude_deg);

          // Station Radar Base Marker
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.stroke();

          // Station Name Label
          ctx.fillStyle = '#a7f3d0';
          ctx.font = 'bold 9px monospace';
          const shortName = st.name.split('(')[0].trim();
          ctx.fillText(`📡 ${shortName}`, sx + 8, sy - 3);
        });
      }

      // 5. Catalog Multi-Satellite Swarm Overlay
      if (showAllObjects) {
        const timeOffset = Date.now() / 60000;
        objects.forEach((o) => {
          if (activeObj?.norad_id === o.norad_id) return; // Active satellite rendered below in high-def

          // Keplerian ground position approximation for visual swarm
          const inc = o.inclination || 51.6;
          const periodMin = o.period_minutes || 92.0;
          const meanMotion = (2.0 * Math.PI) / periodMin;
          const phase = (o.norad_id * 137.5 + timeOffset * meanMotion) % (2.0 * Math.PI);
          
          const satLat = Math.asin(Math.sin(mathRadians(inc)) * Math.sin(phase)) * (180.0 / Math.PI);
          const earthRotDeg = (timeOffset * (360.0 / 1436.0)) % 360.0;
          const satLon = (((o.norad_id * 73.1 + Math.atan2(Math.cos(mathRadians(inc)) * Math.sin(phase), Math.cos(phase)) * (180.0 / Math.PI) - earthRotDeg) + 180.0) % 360.0) - 180.0;

          const dotX = lonToX(satLon);
          const dotY = latToY(satLat);

          ctx.fillStyle = o.object_type === 'DEBRIS' ? '#ef4444' : o.object_type === 'ROCKET_BODY' ? '#f59e0b' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 6. Active Satellite Continuous Ground Track Ribbon
      if (trackData) {
        // Past Ground Track (Solid Cyan Ribbon)
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

        // Future Ground Track (Dashed Emerald Ribbon)
        if (trackData.future_track.length > 1) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([5, 4]);
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

        // 7. Ground Coverage Sensor Footprint Circle
        const curr = trackData.current_position;
        const curX = lonToX(curr.longitude);
        const curY = latToY(curr.latitude);

        if (showFootprint && curr.footprint_radius_km > 0) {
          const footprintPx = (curr.footprint_radius_km / 40075.0) * w;
          ctx.fillStyle = 'rgba(0, 240, 255, 0.14)';
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(curX, curY, Math.max(18, footprintPx), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // 8. Active Satellite Marker & Beacon
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(curX, curY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Pulsing radar ring
        const pulseR = 9 + (Date.now() % 1200) / 80;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(curX, curY, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // Satellite Telemetry Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`🛰️ ${trackData.object_name} (#${trackData.norad_id})`, curX + 14, curY - 8);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(
          `Alt: ${curr.altitude_km.toFixed(1)} km • Lat: ${curr.latitude.toFixed(2)}° • Lon: ${curr.longitude.toFixed(2)}°`,
          curX + 14,
          curY + 7
        );
      }
    };

    render();
    const interval = setInterval(render, 1000);

    return () => {
      clearInterval(interval);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [
    trackData,
    stations,
    showAllObjects,
    showFootprint,
    showTerminator,
    showStations,
    showGrids,
    objects,
    activeObj,
    imgLoaded
  ]);

  // Handle Canvas Mouse Move (Tooltips on hover)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const w = canvas.width;
    const h = canvas.height;
    const lonToX = (lon: number) => ((lon + 180) / 360) * w;
    const latToY = (lat: number) => ((90 - lat) / 180) * h;

    // Check Ground Stations
    if (showStations) {
      for (const st of stations) {
        const sx = lonToX(st.longitude_deg);
        const sy = latToY(st.latitude_deg);
        const dist = Math.hypot(x - sx, y - sy);
        if (dist < 14) {
          setHoveredEntity({
            type: 'station',
            name: st.name,
            id: st.id,
            latitude: st.latitude_deg,
            longitude: st.longitude_deg,
            country: st.country,
            details: `Alt: ${st.altitude_m.toFixed(0)}m • Min El: ${st.min_elevation_deg}°`,
            screenX: e.clientX - rect.left,
            screenY: e.clientY - rect.top
          });
          return;
        }
      }
    }

    // Check Active Satellite
    if (trackData) {
      const sx = lonToX(trackData.current_position.longitude);
      const sy = latToY(trackData.current_position.latitude);
      const dist = Math.hypot(x - sx, y - sy);
      if (dist < 16) {
        setHoveredEntity({
          type: 'satellite',
          name: trackData.object_name,
          id: trackData.norad_id,
          latitude: trackData.current_position.latitude,
          longitude: trackData.current_position.longitude,
          altitude_km: trackData.current_position.altitude_km,
          details: `Period: ${trackData.period_minutes.toFixed(1)}m • Footprint: ${trackData.footprint_radius_km.toFixed(0)}km`,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top
        });
        return;
      }
    }

    setHoveredEntity(null);
  };

  // Handle Canvas Click (Select satellite or station)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const w = canvas.width;
    const h = canvas.height;
    const lonToX = (lon: number) => ((lon + 180) / 360) * w;
    const latToY = (lat: number) => ((90 - lat) / 180) * h;

    // Check if clicked a ground station -> open Overpass Predictor
    if (showStations) {
      for (const st of stations) {
        const sx = lonToX(st.longitude_deg);
        const sy = latToY(st.latitude_deg);
        if (Math.hypot(x - sx, y - sy) < 16) {
          if (activeObj) {
            onOpenOverpassModal(activeObj);
          }
          return;
        }
      }
    }

    // Check if clicked near active satellite -> open details modal
    if (trackData && activeObj) {
      const sx = lonToX(trackData.current_position.longitude);
      const sy = latToY(trackData.current_position.latitude);
      if (Math.hypot(x - sx, y - sy) < 18) {
        if (onOpenDetailsModal) {
          onOpenDetailsModal(activeObj);
        } else {
          onOpenOverpassModal(activeObj);
        }
        return;
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col bg-space-950 text-slate-100 font-mono relative overflow-hidden rounded-2xl border border-space-800 shadow-2xl min-h-[calc(100vh-170px)]"
    >
      {/* Top Controls Header */}
      <div className="bg-space-900/95 border-b border-space-800 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-30 backdrop-blur-md">
        
        {/* Search & Satellite Quick Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative w-56 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search 2D satellite..."
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              className="w-full bg-space-950 border border-space-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeObj && (
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-neon font-bold text-xs">
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[140px]">{activeObj.name}</span>
              <span className="text-[10px] text-slate-400">#{activeObj.norad_id}</span>
            </div>
          )}
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFootprint(!showFootprint)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              showFootprint 
                ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/40 shadow-sm' 
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-white'
            }`}
          >
            Footprint
          </button>

          <button
            type="button"
            onClick={() => setShowTerminator(!showTerminator)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              showTerminator 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm' 
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-white'
            }`}
          >
            Day/Night
          </button>

          <button
            type="button"
            onClick={() => setShowStations(!showStations)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              showStations 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm' 
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-white'
            }`}
          >
            Stations ({stations.length})
          </button>

          <button
            type="button"
            onClick={() => setShowAllObjects(!showAllObjects)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              showAllObjects 
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm' 
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-white'
            }`}
          >
            Catalog Swarm
          </button>

          <button
            type="button"
            onClick={() => setShowGrids(!showGrids)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
              showGrids 
                ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/40 shadow-sm' 
                : 'bg-space-950 text-slate-400 border-space-800 hover:text-white'
            }`}
          >
            Grids
          </button>

          {activeObj && (
            <button
              type="button"
              onClick={() => onOpenOverpassModal(activeObj)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-space-950 rounded-lg text-xs font-bold transition shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Radio className="w-3.5 h-3.5" />
              PREDICT OVERPASS
            </button>
          )}
        </div>
      </div>

      {/* Main 2D Canvas Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={2048}
          height={1024}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredEntity(null)}
          onClick={handleCanvasClick}
          className="w-full h-full object-fill block cursor-crosshair"
        />

        {/* Hover Tooltip HUD */}
        {hoveredEntity && (
          <div 
            className="absolute z-40 bg-space-950/95 backdrop-blur-md border border-cyan-500/50 p-2.5 rounded-xl shadow-2xl pointer-events-none text-xs space-y-1 font-mono text-slate-200"
            style={{
              left: `${Math.min(hoveredEntity.screenX + 15, (containerRef.current?.clientWidth || 800) - 240)}px`,
              top: `${Math.min(hoveredEntity.screenY + 15, (containerRef.current?.clientHeight || 600) - 120)}px`
            }}
          >
            <div className="font-bold text-cyan-neon flex items-center gap-1.5 border-b border-space-800 pb-1">
              {hoveredEntity.type === 'station' ? <Radio className="w-3.5 h-3.5 text-emerald-400" /> : <Satellite className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{hoveredEntity.name}</span>
            </div>
            <div className="text-[11px] text-slate-300">
              <div>Lat/Lon: {hoveredEntity.latitude.toFixed(2)}°, {hoveredEntity.longitude.toFixed(2)}°</div>
              {hoveredEntity.altitude_km != null && <div>Altitude: {hoveredEntity.altitude_km.toFixed(1)} km</div>}
              {hoveredEntity.country && <div>Country: {hoveredEntity.country}</div>}
              {hoveredEntity.details && <div className="text-[10px] text-cyan-400">{hoveredEntity.details}</div>}
            </div>
            <div className="text-[9px] text-emerald-400 font-bold pt-0.5">
              {hoveredEntity.type === 'station' ? 'CLICK TO PREDICT OVERPASS' : 'CLICK FOR DETAILS'}
            </div>
          </div>
        )}

        {/* Floating Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute top-3 left-4 z-40 w-80 max-h-72 bg-space-900/95 border border-cyan-500/40 rounded-xl overflow-y-auto shadow-2xl p-2 space-y-1 backdrop-blur-xl">
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 py-1 border-b border-space-800">
              <span>FOUND {filteredObjects.length} SATELLITES</span>
              <button 
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="hover:text-white"
              >
                ✕
              </button>
            </div>
            {filteredObjects.map((o) => (
              <div
                key={o.norad_id}
                onClick={() => {
                  onSelectObject(o);
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-space-800 rounded-lg cursor-pointer transition text-xs flex justify-between items-center group"
              >
                <div>
                  <div className="text-white font-bold group-hover:text-cyan-neon transition">{o.name}</div>
                  <div className="text-[10px] text-slate-400">NORAD #{o.norad_id} • {o.object_type}</div>
                </div>
                <span className="text-[10px] text-cyan-neon font-bold opacity-0 group-hover:opacity-100 transition">
                  TRACK →
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Live Telemetry Floating Card (Bottom-Left) */}
        {trackData && (
          <div className="absolute bottom-4 left-4 z-30 bg-space-950/90 backdrop-blur-xl border border-cyan-500/30 p-3.5 rounded-2xl text-xs space-y-2 max-w-xs sm:max-w-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-space-800 pb-1.5">
              <span className="font-bold text-white text-xs truncate max-w-[180px]">{trackData.object_name}</span>
              <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                LIVE RIBBON
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">SUB-LATITUDE:</span>
                <span className="text-white font-bold">{trackData.current_position.latitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SUB-LONGITUDE:</span>
                <span className="text-white font-bold">{trackData.current_position.longitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ALTITUDE:</span>
                <span className="text-cyan-neon font-bold">{trackData.current_position.altitude_km.toFixed(1)} km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">COVERAGE RADIUS:</span>
                <span className="text-emerald-400 font-bold">{trackData.footprint_radius_km.toFixed(0)} km</span>
              </div>
            </div>

            <div className="pt-2 border-t border-space-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Period: {trackData.period_minutes.toFixed(1)} min</span>
              <span className={`font-bold ${trackData.current_position.is_sunlit ? 'text-amber-400' : 'text-slate-500'}`}>
                {trackData.current_position.is_sunlit ? '☀️ SUNLIT' : '🌑 ECLIPSED'}
              </span>
            </div>

            {activeObj && onOpenDetailsModal && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onOpenDetailsModal(activeObj)}
                  className="w-full py-1 bg-space-900 hover:bg-space-800 text-cyan-400 rounded-lg text-[10px] font-bold border border-space-700 transition flex items-center justify-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  VIEW TELEMETRY SPECS
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
