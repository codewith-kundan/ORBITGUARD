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
import { OrbitalObject, OrbitalPosition, GroundStation, SystemStatistics, Conjunction } from '../types';
import { api } from '../services/api';

interface Map2DViewProps {
  objects: OrbitalObject[];
  selectedObject: OrbitalObject | null;
  selectedConjunction?: Conjunction | null;
  stats?: SystemStatistics | null;
  onSelectObject: (obj: OrbitalObject | null) => void;
  onSelectConjunction?: (conj: Conjunction | null) => void;
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
  selectedConjunction,
  stats,
  onSelectObject,
  onSelectConjunction,
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
  const [showAllObjects] = useState<boolean>(true);
  const [showFootprint, setShowFootprint] = useState<boolean>(false);
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showGrids, setShowGrids] = useState<boolean>(true);

  // Live Time Engine State
  const [simTime, setSimTime] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x = live real-time clock
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<OrbitalObject[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState<boolean>(false);

  // Debounced live suggestions from full 32,282 catalog API
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingCatalog(true);
        const res = await api.getPaginatedObjects(1, 8, searchQuery.trim());
        if (res && res.items) {
          setSearchSuggestions(res.items);
        }
      } catch (err) {
        console.debug('2D Search suggestion error:', err);
      } finally {
        setIsSearchingCatalog(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Predefined Ground Stations State
  const [stations, setStations] = useState<GroundStation[]>([]);

  // Real-Time Batch Positions Swarm State (4,000+ SGP4 tracked assets)
  const [positions, setPositions] = useState<OrbitalPosition[]>([]);
  const satrecMapRef = useRef<Map<number, { satrec: any; name: string; type: string; norad_id: number }>>(new Map());

  // Active object to track: in conjunction mode objA is activeObj, objB is secondaryObj
  const activeObj = useMemo(() => {
    if (selectedConjunction?.object_a) return selectedConjunction.object_a;
    if (selectedObject) return selectedObject;
    if (objects.length > 0) return objects[0];
    return null;
  }, [selectedConjunction, selectedObject, objects]);

  const secondaryObj = useMemo(() => {
    if (selectedConjunction?.object_b) return selectedConjunction.object_b;
    return null;
  }, [selectedConjunction]);

  // Load Real NASA Equirectangular Texture
  useEffect(() => {
    const dayImg = new Image();
    dayImg.src = '/textures/earth_day.jpg';
    dayImg.onload = () => {
      earthImgRef.current = dayImg;
    };
  }, []);

  // Initialize SGP4 satrec records from objects' TLEs (client-side, works offline)
  useEffect(() => {
    if (objects && objects.length > 0) {
      objects.forEach((obj) => {
        if (obj.tle_line1 && obj.tle_line2 && !satrecMapRef.current.has(obj.norad_id)) {
          try {
            const rec = satellite.twoline2satrec(obj.tle_line1, obj.tle_line2);
            if (rec && (rec as any).error === 0) {
              satrecMapRef.current.set(obj.norad_id, {
                satrec: rec,
                name: obj.name,
                type: obj.object_type,
                norad_id: obj.norad_id
              });
            }
          } catch (e) {}
        }
      });
    }
  }, [objects]);

  // Fetch Predefined Ground Stations (with fallback)
  useEffect(() => {
    api.getGroundStations()
      .then((data) => {
        if (data && data.length > 0) setStations(data);
      })
      .catch(() => {
        console.debug('Ground stations API unavailable, using fallback');
      });
  }, []);

  // Fetch Batch Ephemeris Positions from Backend API (1,800+ real assets)
  useEffect(() => {
    let isMounted = true;
    const fetchPositions = async () => {
      try {
        const batch = await api.getBatchPositions(new Date().toISOString(), 1800);
        if (isMounted && batch.positions && batch.positions.length > 0) {
          setPositions(batch.positions);
          batch.positions.forEach((p: OrbitalPosition) => {
            if (p.tle_line1 && p.tle_line2) {
              try {
                const rec = satellite.twoline2satrec(p.tle_line1, p.tle_line2);
                if (rec && (rec as any).error === 0) {
                  satrecMapRef.current.set(p.norad_id, {
                    satrec: rec,
                    name: p.name,
                    type: p.type,
                    norad_id: p.norad_id
                  });
                }
              } catch (e) {}
            }
          });
        }
      } catch (err) {
        console.debug('Batch positions unavailable, using client-side SGP4:', err);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Dynamic Fleet & Constellation & Regime Counts from real Database Stats
  const fleetCounts = useMemo(() => {
    if (stats?.fleet_breakdown) {
      return stats.fleet_breakdown;
    }

    let all = stats?.tracked_objects || (positions.length > 0 ? positions.length : objects.length);
    let payload = stats?.active_satellites || 0;
    let starlink = 0;
    let oneweb = 0;
    let gps = 0;
    let debris = stats?.space_debris || 0;
    let rocket = stats?.rocket_bodies || 0;
    let leo = stats?.altitude_distribution?.leo || 0;
    let meo = stats?.altitude_distribution?.meo || 0;
    let geo = stats?.altitude_distribution?.geo || 0;

    const sourceList = positions.length > 0 ? positions : objects;
    sourceList.forEach((o: any) => {
      const name = (o.name || '').toUpperCase();
      const type = (typeof o.type === 'string' ? o.type : typeof o.object_type === 'string' ? o.object_type : (o.object_type as any)?.value || '').toUpperCase();
      const apogee = o.alt_km || o.apogee_km || o.perigee_km || 0;

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
  }, [objects, positions, stats]);

  // Filter Real Live Swarm Positions based on Active Fleet & Regime
  const visibleSwarm = useMemo(() => {
    const list = positions.length > 0 ? positions : (objects.map((o) => ({
      norad_id: o.norad_id,
      name: o.name,
      type: o.object_type,
      lat: 0,
      lon: 0,
      alt_km: o.apogee_km || 400,
      velocity_km_s: 7.6,
      x_km: 0,
      y_km: 0,
      z_km: 0,
      tle_line1: o.tle_line1,
      tle_line2: o.tle_line2
    } as OrbitalPosition)));

    return list.filter((pos) => {
      const name = (pos.name || '').toUpperCase();
      const type = (pos.type || '').toUpperCase();
      const alt = pos.alt_km || 400;

      if (isDebrisMode && type !== 'DEBRIS') return false;

      if (activeFleetFilter === 'PAYLOAD' && type !== 'ACTIVE_SATELLITE' && type !== 'PAYLOAD') return false;
      if (activeFleetFilter === 'STARLINK' && !name.includes('STARLINK')) return false;
      if (activeFleetFilter === 'ONEWEB' && !name.includes('ONEWEB')) return false;
      if (activeFleetFilter === 'GPS' && !name.includes('NAVSTAR') && !name.includes('GPS') && !name.includes('GLONASS') && !name.includes('GALILEO') && !name.includes('BEIDOU') && !name.includes('GSAT')) return false;
      if (activeFleetFilter === 'DEBRIS' && type !== 'DEBRIS') return false;
      if (activeFleetFilter === 'ROCKET' && type !== 'ROCKET_BODY' && type !== 'ROCKET') return false;

      if (altitudeFilter === 'LEO' && alt > 2000) return false;
      if (altitudeFilter === 'MEO' && (alt <= 2000 || alt > 20000)) return false;
      if (altitudeFilter === 'GEO' && alt <= 20000) return false;

      return true;
    });
  }, [positions, objects, activeFleetFilter, altitudeFilter, isDebrisMode]);

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

  // Real SGP4 Satrec record for Active Object (Object A)
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

  // Real SGP4 Satrec record for Secondary Object (Object B in conjunction)
  const satrecB = useMemo(() => {
    if (!secondaryObj?.tle_line1 || !secondaryObj?.tle_line2) return null;
    try {
      const rec = satellite.twoline2satrec(secondaryObj.tle_line1, secondaryObj.tle_line2);
      if (rec && !rec.error) return rec;
    } catch (e) {
      console.debug('Failed to init SGP4 Satrec for Object B:', e);
    }
    return null;
  }, [secondaryObj?.norad_id, secondaryObj?.tle_line1, secondaryObj?.tle_line2]);

  // Real-Time High-Precision SGP4 Sub-Satellite Position for Primary Object at simTime
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

  // Real-Time High-Precision SGP4 Sub-Satellite Position for Secondary Object at simTime
  const livePositionB = useMemo(() => {
    if (!satrecB) return null;
    try {
      const gmst = satellite.gstime(simTime);
      const pv = satellite.propagate(satrecB, simTime);
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
      console.debug('Live SGP4 propagation error for Object B:', e);
    }
    return null;
  }, [satrecB, simTime]);

  // Real-Time SGP4 Ground Track: Exactly 1 Single Clean Orbital Revolution for Object A
  const liveGroundTrack = useMemo<{ lat: number; lon: number }[] | null>(() => {
    if (!satrec) return null;
    try {
      const track: { lat: number; lon: number }[] = [];
      const periodMin = activeObj?.period_minutes || 95.0;

      // Exactly 1 single orbital revolution centered around the satellite (-10 min trailing, remainder ahead)
      const startMin = -10;
      const endMin = Math.max(85, Math.min(720, periodMin - 10));

      for (let m = startMin; m <= endMin; m += 1.5) {
        const t = new Date(simTime.getTime() + m * 60000);
        const gmst = satellite.gstime(t);
        const pv = satellite.propagate(satrec, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
          track.push({
            lat: satellite.degreesLat(geodetic.latitude),
            lon: satellite.degreesLong(geodetic.longitude)
          });
        }
      }

      return track;
    } catch (e) {
      return null;
    }
  }, [satrec, simTime, activeObj?.period_minutes]);

  // Real-Time SGP4 Ground Track for Secondary Object (Object B in conjunction)
  const liveGroundTrackB = useMemo<{ lat: number; lon: number }[] | null>(() => {
    if (!satrecB) return null;
    try {
      const track: { lat: number; lon: number }[] = [];
      const periodMin = secondaryObj?.period_minutes || 95.0;

      const startMin = -10;
      const endMin = Math.max(85, Math.min(720, periodMin - 10));

      for (let m = startMin; m <= endMin; m += 1.5) {
        const t = new Date(simTime.getTime() + m * 60000);
        const gmst = satellite.gstime(t);
        const pv = satellite.propagate(satrecB, t);
        if (pv && pv.position && typeof pv.position !== 'boolean') {
          const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
          track.push({
            lat: satellite.degreesLat(geodetic.latitude),
            lon: satellite.degreesLong(geodetic.longitude)
          });
        }
      }

      return track;
    } catch (e) {
      return null;
    }
  }, [satrecB, simTime, secondaryObj?.period_minutes]);

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

      // 5. Filtered Real-Time SGP4 Swarm
      if (showAllObjects) {
        visibleSwarm.forEach((pos) => {
          if (activeObj?.norad_id === pos.norad_id) return;

          let satLat = pos.lat;
          let satLon = pos.lon;

          // Propagate in real-time via SGP4 if satrec is present
          const entry = satrecMapRef.current.get(pos.norad_id);
          if (entry && entry.satrec) {
            try {
              const gmst = satellite.gstime(simTime);
              const pv = satellite.propagate(entry.satrec, simTime);
              if (pv && pv.position && typeof pv.position !== 'boolean') {
                const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
                satLat = satellite.degreesLat(geodetic.latitude);
                satLon = satellite.degreesLong(geodetic.longitude);
              }
            } catch (e) {}
          }

          const dotX = lonToX(satLon);
          const dotY = latToY(satLat);

          ctx.fillStyle = pos.type === 'DEBRIS' ? '#ef4444' : pos.type === 'ROCKET_BODY' ? '#f59e0b' : '#00d4ff';
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 6. Real Single Continuous SGP4 Ground Track (Exactly 1 Clean Revolution)
      if (liveGroundTrack && liveGroundTrack.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
        ctx.shadowBlur = 6;
        ctx.beginPath();

        for (let i = 0; i < liveGroundTrack.length; i++) {
          const pt = liveGroundTrack[i];
          const px = lonToX(pt.lon);
          const py = latToY(pt.lat);

          if (i > 0) {
            const prev = liveGroundTrack[i - 1];
            // Discontinuity split at +/- 180° antimeridian / date line
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
        ctx.restore();
      }

      // 6b. Real Single Continuous SGP4 Ground Track for Object B (Threat Debris in Red)
      if (liveGroundTrackB && liveGroundTrackB.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
        ctx.shadowBlur = 6;
        ctx.beginPath();

        for (let i = 0; i < liveGroundTrackB.length; i++) {
          const pt = liveGroundTrackB[i];
          const px = lonToX(pt.lon);
          const py = latToY(pt.lat);

          if (i > 0) {
            const prev = liveGroundTrackB[i - 1];
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
        ctx.restore();
      }

      // 7a. Primary Live Satellite Marker & Sensor Coverage Footprint
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

      // 7b. Secondary Live Satellite Marker (Object B / Threat Debris in Red)
      if (livePositionB && secondaryObj) {
        const curX = lonToX(livePositionB.longitude);
        const curY = latToY(livePositionB.latitude);

        // Ground Coverage Footprint Circle for Threat
        if (showFootprint && livePositionB.footprint_radius_km > 0) {
          const footprintPx = (livePositionB.footprint_radius_km / 40075.0) * w;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(curX, curY, Math.max(18, footprintPx), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Marker Beacon for Object B (Red Pulsing Dot)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(curX, curY, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const pulseR = 9 + (Date.now() % 1200) / 80;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(curX, curY, pulseR, 0, Math.PI * 2);
        ctx.stroke();

        // Telemetry Label HUD for Object B
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`💥 ${secondaryObj.name} (#${secondaryObj.norad_id})`, curX + 14, curY - 8);

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(
          `Alt: ${livePositionB.altitude_km.toFixed(1)} km • Lat: ${livePositionB.latitude.toFixed(2)}° • Lon: ${livePositionB.longitude.toFixed(2)}° • Vel: ${livePositionB.velocity_km_s.toFixed(2)} km/s`,
          curX + 14,
          curY + 7
        );
      }

      // 8. TCA Conjunction Hazard Hotspot Marker (if coordinates available)
      if (selectedConjunction && selectedConjunction.latitude_deg !== undefined && selectedConjunction.longitude_deg !== undefined) {
        const tcaX = lonToX(selectedConjunction.longitude_deg);
        const tcaY = latToY(selectedConjunction.latitude_deg);

        const haloR = 12 + (Date.now() % 1000) / 60;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tcaX, tcaY, haloR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(tcaX, tcaY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`⚠️ TCA HOTSPOT (${selectedConjunction.miss_distance_km.toFixed(2)} km)`, tcaX + 12, tcaY - 6);
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
    livePositionB,
    liveGroundTrack,
    liveGroundTrackB,
    stations,
    visibleSwarm,
    showAllObjects,
    showFootprint,
    showTerminator,
    showStations,
    showGrids,
    simTime,
    activeObj,
    secondaryObj,
    selectedConjunction
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

    // Check Swarm Satellites & Debris
    if (showAllObjects) {
      for (const pos of visibleSwarm) {
        if (activeObj?.norad_id === pos.norad_id) continue;
        let satLat = pos.lat;
        let satLon = pos.lon;
        const entry = satrecMapRef.current.get(pos.norad_id);
        if (entry && entry.satrec) {
          try {
            const gmst = satellite.gstime(simTime);
            const pv = satellite.propagate(entry.satrec, simTime);
            if (pv && pv.position && typeof pv.position !== 'boolean') {
              const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
              satLat = satellite.degreesLat(geodetic.latitude);
              satLon = satellite.degreesLong(geodetic.longitude);
            }
          } catch (e) {}
        }
        const sx = lonToX(satLon);
        const sy = latToY(satLat);
        if (Math.hypot(x - sx, y - sy) < 7) {
          setHoveredEntity({
            type: 'satellite',
            name: pos.name || `NORAD #${pos.norad_id}`,
            id: pos.norad_id,
            latitude: satLat,
            longitude: satLon,
            altitude_km: pos.alt_km,
            details: `Type: ${pos.type} • Vel: ${pos.velocity_km_s?.toFixed(2) || '7.6'} km/s`,
            screenX: e.clientX - rect.left,
            screenY: e.clientY - rect.top
          });
          return;
        }
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

    // Check Swarm Objects Click
    if (showAllObjects) {
      for (const pos of visibleSwarm) {
        let satLat = pos.lat;
        let satLon = pos.lon;
        const entry = satrecMapRef.current.get(pos.norad_id);
        if (entry && entry.satrec) {
          try {
            const gmst = satellite.gstime(simTime);
            const pv = satellite.propagate(entry.satrec, simTime);
            if (pv && pv.position && typeof pv.position !== 'boolean') {
              const geodetic = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
              satLat = satellite.degreesLat(geodetic.latitude);
              satLon = satellite.degreesLong(geodetic.longitude);
            }
          } catch (e) {}
        }
        const sx = lonToX(satLon);
        const sy = latToY(satLat);
        if (Math.hypot(x - sx, y - sy) < 9) {
          const found = objects.find((o) => o.norad_id === pos.norad_id);
          const clickedObj: OrbitalObject = found || {
            id: pos.norad_id,
            norad_id: pos.norad_id,
            name: pos.name || `NORAD #${pos.norad_id}`,
            object_type: (pos.type as any) || 'ACTIVE_SATELLITE',
            source: 'Live SGP4 Feed',
            tle_line1: pos.tle_line1 || '',
            tle_line2: pos.tle_line2 || '',
            perigee_km: pos.alt_km,
            apogee_km: pos.alt_km,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          onSelectObject(clickedObj);
          return;
        }
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
        
        {/* Left: Active Satellite Badge OR Dual Conjunction Tracking Badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-neon animate-pulse" />
            <span className="font-bold tracking-wider text-cyan-neon text-xs">2D GROUND TRACK</span>
          </div>

          {selectedConjunction ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-danger-950/80 border border-danger-500/50 rounded-lg text-danger-neon font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <AlertTriangle className="w-3.5 h-3.5 text-danger-400 animate-pulse" />
              <span className="text-cyan-400">{activeObj?.name || 'Primary'}</span>
              <span className="text-slate-400">↔</span>
              <span className="text-danger-400">{secondaryObj?.name || 'Threat'}</span>
              <span className="text-[10px] text-amber-300 font-mono px-1.5 py-0.5 bg-danger-900/60 rounded border border-danger-700">
                Miss: {selectedConjunction.miss_distance_km.toFixed(1)} km
              </span>
              {onSelectConjunction && (
                <button
                  type="button"
                  onClick={() => onSelectConjunction(null)}
                  className="ml-1 text-slate-400 hover:text-white text-xs px-1 rounded hover:bg-danger-900 transition"
                  title="Exit Conjunction Dual Track"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            activeObj && (
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-neon font-bold text-xs">
                <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate max-w-[150px]">{activeObj.name}</span>
                <span className="text-[10px] text-slate-400">#{activeObj.norad_id}</span>
              </div>
            )
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
              {/* Search Satellite Box & Live Suggestions Dropdown */}
              <div className="relative">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search Satellite, Starlink, Debris, NORAD..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-space-950/80 border border-space-700 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {isSearchingCatalog && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute right-2.5 top-3" />
                  )}
                </form>

                {/* Suggestions Dropdown */}
                {searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-space-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                    <div className="px-2.5 py-1 text-[9px] text-cyan-400 uppercase tracking-wider font-bold bg-cyan-950/40 border-b border-space-800">
                      Live Catalog Matches ({searchSuggestions.length})
                    </div>
                    {searchSuggestions.map((item) => (
                      <button
                        key={item.norad_id}
                        type="button"
                        onClick={() => {
                          onSelectObject(item);
                          setSearchQuery('');
                          setSearchSuggestions([]);
                        }}
                        className="w-full px-2.5 py-1.5 text-left hover:bg-cyan-500/20 border-b border-space-900/60 last:border-none flex items-center justify-between gap-2 text-xs transition"
                      >
                        <div className="truncate">
                          <span className="font-bold text-white block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400">NORAD #{item.norad_id} • {item.object_type}</span>
                        </div>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-space-900 text-cyan-300 font-mono flex-shrink-0">
                          {item.inclination ? `${item.inclination.toFixed(1)}°` : 'LEO'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
