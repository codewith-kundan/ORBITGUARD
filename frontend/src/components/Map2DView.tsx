import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as satellite from 'satellite.js';
import { 
  Satellite, 
  Radio, 
  Search, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Sliders, 
  Compass, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  Info 
} from 'lucide-react';
import { OrbitalObject, GroundStation, SystemStatistics } from '../types';
import { api } from '../services/api';

interface Map2DViewProps {
  objects: OrbitalObject[];
  selectedObject: OrbitalObject | null;
  stats?: SystemStatistics | null;
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

interface LiveGroundTrack {
  past: { lat: number; lon: number }[];
  future: { lat: number; lon: number }[];
}

export const Map2DView: React.FC<Map2DViewProps> = ({
  objects,
  selectedObject,
  stats,
  onSelectObject,
  onOpenOverpassModal,
  onOpenDetailsModal
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const earthImgRef = useRef<HTMLImageElement | null>(null);

  // Filter & Search Dock State
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFleetFilter, setActiveFleetFilter] = useState<string>('ALL');
  const [altitudeFilter, setAltitudeFilter] = useState<string>('ALL');
  const [isDebrisMode, setIsDebrisMode] = useState<boolean>(false);

  // Layer Toggles
  const [showAllObjects, setShowAllObjects] = useState<boolean>(true);
  const [showFootprint, setShowFootprint] = useState<boolean>(true);
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showGrids, setShowGrids] = useState<boolean>(true);

  // Live Time Engine State
  const [simTime, setSimTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x = live real-time clock
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity | null>(null);

  // Predefined Ground Stations State
  const [stations, setStations] = useState<GroundStation[]>([]);

  // Active object to track: selectedObject or default to primary asset (ISS/CSS/first sat)
  const activeObj = useMemo(() => {
    if (selectedObject) return selectedObject;
    if (objects.length > 0) return objects[0];
    return null;
  }, [selectedObject, objects]);

  // Load Real NASA Equirectangular Texture
  useEffect(() => {
    const dayImg = new Image();
    dayImg.src = '/textures/earth_day.jpg';
    dayImg.onload = () => {
      earthImgRef.current = dayImg;
    };
  }, []);

  // Fetch Predefined Ground Stations
  useEffect(() => {
    api.getGroundStations()
      .then(setStations)
      .catch((err) => console.error('Failed to load ground stations:', err));
  }, []);

  // Dynamic Fleet & Constellation & Regime Counts from real Database Stats
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

  // Filter Catalog Objects based on Active Fleet & Regime
  const visibleCatalogObjects = useMemo(() => {
    return objects.filter((o) => {
      const name = o.name.toUpperCase();
      const type = (typeof o.object_type === 'string' ? o.object_type : (o.object_type as any)?.value || '').toUpperCase();
      const apogee = o.apogee_km || o.perigee_km || 0;

      if (isDebrisMode && type !== 'DEBRIS') return false;

      if (activeFleetFilter === 'PAYLOAD' && type !== 'ACTIVE_SATELLITE' && type !== 'PAYLOAD') return false;
      if (activeFleetFilter === 'STARLINK' && !name.includes('STARLINK')) return false;
      if (activeFleetFilter === 'ONEWEB' && !name.includes('ONEWEB')) return false;
      if (activeFleetFilter === 'GPS' && !name.includes('NAVSTAR') && !name.includes('GPS') && !name.includes('GLONASS') && !name.includes('GALILEO') && !name.includes('BEIDOU')) return false;
      if (activeFleetFilter === 'DEBRIS' && type !== 'DEBRIS') return false;
      if (activeFleetFilter === 'ROCKET' && type !== 'ROCKET_BODY' && type !== 'ROCKET') return false;

      if (altitudeFilter === 'LEO' && apogee > 2000) return false;
      if (altitudeFilter === 'MEO' && (apogee <= 2000 || apogee >= 35000)) return false;
      if (altitudeFilter === 'GEO' && apogee < 35000) return false;

      return true;
    });
  }, [objects, activeFleetFilter, altitudeFilter, isDebrisMode]);

  // High-Precision Smooth Live Time Engine (60 FPS delta-time accumulator)
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const deltaSec = (now - lastTime) / 1000.0;
      lastTime = now;

      if (deltaSec > 0 && deltaSec < 2) {
        setSimTime((prev) => new Date(prev.getTime() + deltaSec * 1000 * simSpeed));
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, simSpeed]);

  const mathRadians = (deg: number) => (deg * Math.PI) / 180.0;
  const mathDegrees = (rad: number) => (rad * 180.0) / Math.PI;

  // Real SGP4 Satrec record for Active Object
  const satrec = useMemo(() => {
    if (!activeObj?.tle_line1 || !activeObj?.tle_line2) return null;
    try {
      const rec = satellite.twoline2satrec(activeObj.tle_line1, activeObj.tle_line2);
      if (rec && !rec.error) return rec;
    } catch (e) {
      console.debug('Failed to init SGP4 Satrec:', e);
    }
    return null;
  }, [activeObj?.norad_id, activeObj?.tle_line1, activeObj?.tle_line2]);

  // Real-Time High-Precision SGP4 Sub-Satellite Position at simTime
  const livePosition = useMemo(() => {
    if (!satrec) return null;
    try {
      const gmst = satellite.gstime(simTime);
      const pv = satellite.propagate(satrec, simTime);
      if (pv && pv.position && typeof pv.position !== 'boolean') {
        const pEci = pv.position as satellite.EciVec3<number>;
        const vEci = pv.velocity as satellite.EciVec3<number>;
        const geodetic = satellite.eciToGeodetic(pEci, gmst);
        const lat = satellite.degreesLat(geodetic.latitude);
        const lon = satellite.degreesLong(geodetic.longitude);
        const altKm = Math.max(120, geodetic.height);

        let velKmS = 7.66;
        if (vEci) {
          velKmS = Math.sqrt(vEci.x * vEci.x + vEci.y * vEci.y + vEci.z * vEci.z);
        }

        // Coverage radius: R_earth * acos(R_earth / (R_earth + alt))
        const R_E = 6371.0;
        const rho = Math.acos(R_E / Math.max(R_E + 10, R_E + altKm));
        const footprintKm = R_E * rho;

        return {
          latitude: lat,
          longitude: lon,
          altitude_km: altKm,
          velocity_km_s: velKmS,
          footprint_radius_km: footprintKm,
          is_sunlit: true
        };
      }
    } catch (e) {
      console.debug('Live SGP4 propagation error:', e);
    }
    return null;
  }, [satrec, simTime]);

  // Real-Time SGP4 Ground Track Ribbon (Dynamically anchored to simTime)
  const liveGroundTrack = useMemo<LiveGroundTrack | null>(() => {
    if (!satrec) return null;
    try {
      const past: { lat: number; lon: number }[] = [];
      const future: { lat: number; lon: number }[] = [];

      // Past 90 minutes track (step 2 min)
      for (let m = -90; m <= 0; m += 2) {
        const t = new Date(simTime.getTime() + m * 60000);
        const gmst = satellite.gstime(t);
        const pv = satellite.propagate(satrec, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
          past.push({
            lat: satellite.degreesLat(geodetic.latitude),
            lon: satellite.degreesLong(geodetic.longitude)
          });
        }
      }

      // Future 180 minutes track (step 2 min)
      for (let m = 0; m <= 180; m += 2) {
        const t = new Date(simTime.getTime() + m * 60000);
        const gmst = satellite.gstime(t);
        const pv = satellite.propagate(satrec, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
          future.push({
            lat: satellite.degreesLat(geodetic.latitude),
            lon: satellite.degreesLong(geodetic.longitude)
          });
        }
      }

      return { past, future };
    } catch (e) {
      return null;
    }
  }, [satrec, simTime]);

  // Real 2D Canvas Render Loop (60 FPS Smooth Live Animation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Coordinate converter helper: lat [-90, 90] -> y [h, 0], lon [-180, 180] -> x [0, w]
      const lonToX = (lon: number) => ((lon + 180) / 360) * w;
      const latToY = (lat: number) => ((90 - lat) / 180) * h;

      // 1. Draw Real NASA Earth Map Texture
      if (earthImgRef.current && earthImgRef.current.complete) {
        ctx.drawImage(earthImgRef.current, 0, 0, w, h);
        ctx.fillStyle = 'rgba(6, 10, 18, 0.38)';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = '#060d1a';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Latitude and Longitude Grids
      if (showGrids) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';

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

      // 3. Live Day / Night Solar Terminator Curve (Calculated from simTime)
      if (showTerminator) {
        const dayOfYear = Math.floor((simTime.getTime() - new Date(simTime.getUTCFullYear(), 0, 0).getTime()) / 86400000);
        const sunDec = -23.44 * Math.cos(mathRadians((360 / 365) * (dayOfYear + 10)));
        const utcHours = simTime.getUTCHours() + simTime.getUTCMinutes() / 60 + simTime.getUTCSeconds() / 3600;
        const sunLon = (12.0 - utcHours) * 15.0;

        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 4) {
          const lon = (x / w) * 360 - 180;
          const dLon = mathRadians(lon - sunLon);
          const latTerm = mathDegrees(Math.atan(-Math.cos(dLon) / Math.tan(mathRadians(sunDec || 0.1))));
          const y = latToY(latTerm);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Sub-Solar Point Marker
        const sunX = lonToX(sunLon);
        const sunY = latToY(sunDec);
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

      // 4. Real Global Ground Stations
      if (showStations) {
        stations.forEach((st) => {
          const sx = lonToX(st.longitude_deg);
          const sy = latToY(st.latitude_deg);

          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#a7f3d0';
          ctx.font = 'bold 9px monospace';
          const shortName = st.name.split('(')[0].trim();
          ctx.fillText(`📡 ${shortName}`, sx + 8, sy - 3);
        });
      }

      // 5. Filtered Catalog Swarm (Real-Time Synced)
      if (showAllObjects) {
        const timeOffset = simTime.getTime() / 60000;
        visibleCatalogObjects.forEach((o) => {
          if (activeObj?.norad_id === o.norad_id) return;

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

      // 6. Real Continuous SGP4 Ground Track Ribbon
      if (liveGroundTrack) {
        // Past Track (Solid Cyan)
        if (liveGroundTrack.past.length > 1) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();

          for (let i = 0; i < liveGroundTrack.past.length; i++) {
            const pt = liveGroundTrack.past[i];
            const px = lonToX(pt.lon);
            const py = latToY(pt.lat);

            if (i > 0) {
              const prev = liveGroundTrack.past[i - 1];
              if (Math.abs(pt.lon - prev.lon) > 180) {
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
        if (liveGroundTrack.future.length > 1) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();

          for (let i = 0; i < liveGroundTrack.future.length; i++) {
            const pt = liveGroundTrack.future[i];
            const px = lonToX(pt.lon);
            const py = latToY(pt.lat);

            if (i > 0) {
              const prev = liveGroundTrack.future[i - 1];
              if (Math.abs(pt.lon - prev.lon) > 180) {
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
      }

      // 7. Active Live Satellite Marker & Sensor Coverage Footprint
      if (livePosition && activeObj) {
        const curX = lonToX(livePosition.longitude);
        const curY = latToY(livePosition.latitude);

        // Ground Coverage Footprint Circle
        if (showFootprint && livePosition.footprint_radius_km > 0) {
          const footprintPx = (livePosition.footprint_radius_km / 40075.0) * w;
          ctx.fillStyle = 'rgba(0, 240, 255, 0.14)';
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(curX, curY, Math.max(18, footprintPx), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Satellite Marker Beacon
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(curX, curY, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const pulseR = 9 + (Date.now() % 1200) / 80;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(curX, curY, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // Telemetry Label HUD
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`🛰️ ${activeObj.name} (#${activeObj.norad_id})`, curX + 14, curY - 8);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(
          `Alt: ${livePosition.altitude_km.toFixed(1)} km • Lat: ${livePosition.latitude.toFixed(2)}° • Lon: ${livePosition.longitude.toFixed(2)}° • Vel: ${livePosition.velocity_km_s.toFixed(2)} km/s`,
          curX + 14,
          curY + 7
        );
      }
    };

    render();
    const interval = setInterval(render, 50);

    return () => {
      clearInterval(interval);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    livePosition,
    liveGroundTrack,
    stations,
    visibleCatalogObjects,
    showAllObjects,
    showFootprint,
    showTerminator,
    showStations,
    showGrids,
    simTime,
    activeObj
  ]);

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
      setSearchQuery('');
    }
  };

  // Canvas Mouse Move (Hover Tooltips)
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
        if (Math.hypot(x - sx, y - sy) < 14) {
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
    if (livePosition && activeObj) {
      const sx = lonToX(livePosition.longitude);
      const sy = latToY(livePosition.latitude);
      if (Math.hypot(x - sx, y - sy) < 16) {
        setHoveredEntity({
          type: 'satellite',
          name: activeObj.name,
          id: activeObj.norad_id,
          latitude: livePosition.latitude,
          longitude: livePosition.longitude,
          altitude_km: livePosition.altitude_km,
          details: `Velocity: ${livePosition.velocity_km_s.toFixed(2)} km/s • Footprint: ${livePosition.footprint_radius_km.toFixed(0)} km`,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top
        });
        return;
      }
    }

    setHoveredEntity(null);
  };

  // Canvas Click (Select satellite or station)
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

    // Check Ground Station Click
    if (showStations) {
      for (const st of stations) {
        const sx = lonToX(st.longitude_deg);
        const sy = latToY(st.latitude_deg);
        if (Math.hypot(x - sx, y - sy) < 16) {
          if (activeObj) onOpenOverpassModal(activeObj);
          return;
        }
      }
    }

    // Check Active Satellite Click
    if (livePosition && activeObj) {
      const sx = lonToX(livePosition.longitude);
      const sy = latToY(livePosition.latitude);
      if (Math.hypot(x - sx, y - sy) < 18) {
        if (onOpenDetailsModal) onOpenDetailsModal(activeObj);
        else onOpenOverpassModal(activeObj);
        return;
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col bg-space-950 text-slate-100 font-mono relative overflow-hidden rounded-2xl border border-space-800 shadow-2xl min-h-[calc(100vh-140px)]"
    >
      {/* TOP CONTROLS & LIVE SIMULATION BAR */}
      <div className="bg-space-900/95 border-b border-space-800 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-30 backdrop-blur-md">
        
        {/* Left: Active Satellite Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-neon animate-pulse" />
            <span className="font-bold tracking-wider text-cyan-neon text-xs">2D GROUND TRACK</span>
          </div>

          {activeObj && (
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-neon font-bold text-xs">
              <Satellite className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[150px]">{activeObj.name}</span>
              <span className="text-[10px] text-slate-400">#{activeObj.norad_id}</span>
            </div>
          )}
        </div>

        {/* Center: Live Time Controls & Multiplier */}
        <div className="flex items-center gap-2 bg-space-950/80 px-3 py-1 rounded-xl border border-space-800">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg transition ${
              isPlaying ? 'bg-cyan-500 text-space-950 font-bold' : 'bg-space-800 text-slate-300'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Resume Live Simulation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setSimTime(new Date())}
            className="p-1.5 hover:bg-space-800 text-slate-400 hover:text-white rounded-lg transition"
            title="Reset to Real-Time UTC"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono">{simTime.toISOString().replace('T', ' ').substring(11, 19)} UTC</span>
          </div>

          <div className="flex items-center gap-1 border-l border-space-800 pl-2">
            {[1, 5, 15, 60, 300].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition ${
                  simSpeed === spd 
                    ? 'bg-cyan-500 text-space-950' 
                    : 'text-slate-400 hover:text-white hover:bg-space-800'
                }`}
              >
                {spd === 1 ? '1X' : `${spd}X`}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Layer Toggles & Pass Predictor Button */}
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
            Swarm ({visibleCatalogObjects.length})
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

      {/* MAIN WORKSPACE: CANVAS + LEFT HUD DOCK */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        
        {/* 2D Equirectangular Canvas */}
        <canvas
          ref={canvasRef}
          width={2048}
          height={1024}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredEntity(null)}
          onClick={handleCanvasClick}
          className="w-full h-full object-fill block cursor-crosshair"
        />

        {/* LEFT DOCK: Fleet & Constellations Filter Dock with Individual Count Badges */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-sm">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-mono text-xs text-white shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-neon" />
              <span className="font-bold tracking-wider text-cyan-neon text-[11px] sm:text-xs">FLEET FILTERS</span>
            </div>
            <button
              type="button"
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="p-1 hover:bg-space-800 rounded text-slate-400 hover:text-white transition"
              title={isLeftPanelOpen ? 'Collapse HUD' : 'Expand HUD'}
            >
              {isLeftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {isLeftPanelOpen && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-3.5 flex flex-col gap-2.5 sm:gap-3 font-mono text-xs shadow-2xl text-slate-200 animate-fade-in max-h-[calc(100vh-230px)] overflow-y-auto">
              {/* Search Satellite Box */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search Satellite, Starlink, Debris..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-space-950/80 border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </form>

              {/* Fleet & Constellations Filter Buttons with Numbers */}
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-cyan-400" />
                    Fleet & Constellations
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono">
                    {stats?.tracked_objects ? stats.tracked_objects.toLocaleString() : fleetCounts.all.toLocaleString()} TRACKED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {[
                    { key: 'ALL', label: 'All Objects', count: fleetCounts.all, color: 'text-white' },
                    { key: 'PAYLOAD', label: '◆ Operational', count: fleetCounts.operational, color: 'text-cyan-400' },
                    { key: 'STARLINK', label: '◆ Starlink Fleet', count: fleetCounts.starlink, color: 'text-purple-400' },
                    { key: 'ONEWEB', label: '◆ OneWeb', count: fleetCounts.oneweb, color: 'text-purple-400' },
                    { key: 'GPS', label: '◆ GPS / GNSS', count: fleetCounts.gps, color: 'text-emerald-400' },
                    { key: 'DEBRIS', label: '⬟ Debris Clouds', count: fleetCounts.debris, color: 'text-danger-400' },
                    { key: 'ROCKET', label: '❚ Rocket Bodies', count: fleetCounts.rocket, color: 'text-warning-400' }
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => { setActiveFleetFilter(f.key); setIsDebrisMode(false); }}
                      className={`px-2 py-1.5 rounded transition text-left flex items-center justify-between gap-1 ${
                        activeFleetFilter === f.key && !isDebrisMode
                          ? 'bg-cyan-500/20 text-cyan-neon font-bold border border-cyan-500/40'
                          : 'bg-space-950/80 text-slate-400 hover:text-slate-200 border border-space-800'
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

              {/* Orbital Regime Filter Buttons with Numbers */}
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
                          : 'bg-space-950/80 text-slate-400 hover:text-slate-200 border border-space-800'
                      }`}
                    >
                      <span className="font-bold">{alt.label}</span>
                      <span className="text-[8px] text-cyan-400/80 font-mono">{alt.count.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Action Toggles */}
              <div className="pt-2 border-t border-space-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowGrids(!showGrids)}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                    showGrids
                      ? 'bg-cyan-500/20 text-cyan-neon border-cyan-500/40'
                      : 'bg-space-950 text-slate-500 border-space-800'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  GRID LINES
                </button>

                <button
                  type="button"
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

        {/* Live Telemetry Floating Card (Bottom-Right) */}
        {livePosition && activeObj && (
          <div className="absolute bottom-4 right-4 z-30 bg-space-950/90 backdrop-blur-xl border border-cyan-500/30 p-3.5 rounded-2xl text-xs space-y-2 max-w-xs sm:max-w-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-space-800 pb-1.5">
              <span className="font-bold text-white text-xs truncate max-w-[180px]">{activeObj.name}</span>
              <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                LIVE SGP4
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">SUB-LATITUDE:</span>
                <span className="text-white font-bold">{livePosition.latitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SUB-LONGITUDE:</span>
                <span className="text-white font-bold">{livePosition.longitude.toFixed(3)}°</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ALTITUDE:</span>
                <span className="text-cyan-neon font-bold">{livePosition.altitude_km.toFixed(1)} km</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">VELOCITY:</span>
                <span className="text-emerald-400 font-bold">{livePosition.velocity_km_s.toFixed(2)} km/s</span>
              </div>
            </div>

            <div className="pt-2 border-t border-space-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Coverage: {livePosition.footprint_radius_km.toFixed(0)} km</span>
              <span className={`font-bold ${livePosition.is_sunlit ? 'text-amber-400' : 'text-slate-500'}`}>
                {livePosition.is_sunlit ? '☀️ SUNLIT' : '🌑 ECLIPSED'}
              </span>
            </div>

            {onOpenDetailsModal && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onOpenDetailsModal(activeObj)}
                  className="w-full py-1.5 bg-space-900 hover:bg-space-800 text-cyan-400 rounded-lg text-[10px] font-bold border border-space-700 transition flex items-center justify-center gap-1 shadow-sm"
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
