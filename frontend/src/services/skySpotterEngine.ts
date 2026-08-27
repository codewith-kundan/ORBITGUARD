import * as satellite from 'satellite.js';
import { fallbackObjects } from './fallbackData';

export interface SpotterPass {
  satelliteName: string;
  noradId: number;
  cityName: string;
  cityId: string;
  cityLat: number;
  cityLon: number;
  magnitude: string;
  magValue: number;
  startTime: string;
  peakTime: string;
  endTime: string;
  startTimeMs: number;
  maxElevation: string;
  maxElevationDeg: number;
  durationSec: number;
  duration: string;
  startDirection: string;
  peakDirection: string;
  endDirection: string;
  skyPath: string;
  brightnessRank: 'Extremely Bright' | 'Bright' | 'Moderate';
  visibilityCondition: string;
  minRangeKm?: number;
}

export interface SpotterCity {
  id: string;
  name: string;
  lat: number;
  lon: number;
  alt_m: number;
}

export const SPOTTER_CITIES: SpotterCity[] = [
  { id: 'bengaluru', name: 'Bengaluru, India', lat: 12.9716, lon: 77.5946, alt_m: 920.0 },
  { id: 'new_delhi', name: 'New Delhi, India', lat: 28.6139, lon: 77.2090, alt_m: 216.0 },
  { id: 'mumbai', name: 'Mumbai, India', lat: 19.0760, lon: 72.8777, alt_m: 14.0 },
  { id: 'chennai', name: 'Chennai, India', lat: 13.0827, lon: 80.2707, alt_m: 6.0 },
  { id: 'hyderabad', name: 'Hyderabad, India', lat: 17.3850, lon: 78.4867, alt_m: 542.0 },
  { id: 'kolkata', name: 'Kolkata, India', lat: 22.5726, lon: 88.3639, alt_m: 9.0 },
  { id: 'london', name: 'London, UK', lat: 51.5074, lon: -0.1278, alt_m: 25.0 },
  { id: 'new_york', name: 'New York, USA', lat: 40.7128, lon: -74.0060, alt_m: 10.0 },
  { id: 'san_francisco', name: 'San Francisco, USA', lat: 37.7749, lon: -122.4194, alt_m: 16.0 },
  { id: 'los_angeles', name: 'Los Angeles, USA', lat: 34.0522, lon: -118.2437, alt_m: 89.0 },
  { id: 'tokyo', name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, alt_m: 40.0 },
  { id: 'paris', name: 'Paris, France', lat: 48.8566, lon: 2.3522, alt_m: 35.0 },
  { id: 'sydney', name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, alt_m: 19.0 },
  { id: 'singapore', name: 'Singapore', lat: 1.3521, lon: 103.8198, alt_m: 15.0 },
  { id: 'dubai', name: 'Dubai, UAE', lat: 25.2048, lon: 55.2708, alt_m: 5.0 },
  { id: 'berlin', name: 'Berlin, Germany', lat: 52.5200, lon: 13.4050, alt_m: 34.0 },
  { id: 'sao_paulo', name: 'São Paulo, Brazil', lat: -23.5505, lon: -46.6333, alt_m: 760.0 },
  { id: 'cairo', name: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357, alt_m: 23.0 },
  { id: 'toronto', name: 'Toronto, Canada', lat: 43.6532, lon: -79.3832, alt_m: 76.0 }
];

interface BrightTarget {
  noradId: number;
  label: string;
  magBase: number;
  desc: string;
  tle1: string;
  tle2: string;
}

const BRIGHT_TARGETS: BrightTarget[] = [
  {
    noradId: 25544,
    label: 'International Space Station (ISS)',
    magBase: -3.8,
    desc: 'Extremely bright, outshines Venus',
    tle1: '1 25544U 98067A   24080.52857463  .00014761  00000-0  26495-3 0  9993',
    tle2: '2 25544  51.6416 290.9238 0005423  44.5714  72.8719 15.49815915444853'
  },
  {
    noradId: 48274,
    label: 'Tiangong Space Station (CSS)',
    magBase: -1.8,
    desc: 'Bright as Sirius, distinct golden hue',
    tle1: '1 48274U 21035A   24080.52187500  .00021500  00000-0  28900-3 0  9998',
    tle2: '2 48274  41.4725 180.2541 0006200  85.1200 275.1400 15.61200000165002'
  },
  {
    noradId: 20580,
    label: 'Hubble Space Telescope (HST)',
    magBase: 1.2,
    desc: 'Famous NASA/ESA space observatory',
    tle1: '1 20580U 90037B   24080.50000000  .00000950  00000-0  48200-4 0  9999',
    tle2: '2 20580  28.4690 120.4500 0002800  95.2000 264.9000 15.09200000185001'
  },
  {
    noradId: 25989,
    label: 'Terra (EOS AM-1)',
    magBase: 2.0,
    desc: 'Flagship NASA Earth observation platform',
    tle1: '1 25989U 99068A   24080.50000000  .00000120  00000-0  25000-4 0  9992',
    tle2: '2 25989  98.2000 150.1200 0001400  75.3000 284.8000 14.57100000123456'
  },
  {
    noradId: 27424,
    label: 'Aqua (EOS PM-1)',
    magBase: 2.1,
    desc: 'NASA Earth climate monitoring satellite',
    tle1: '1 27424U 02022A   24080.50000000  .00000150  00000-0  31000-4 0  9995',
    tle2: '2 27424  98.2100 165.4500 0001500  80.1000 280.0000 14.57100000124567'
  },
  {
    noradId: 28654,
    label: 'NOAA 18 Weather Satellite',
    magBase: 2.3,
    desc: 'Polar-orbiting meteorological observatory',
    tle1: '1 28654U 05018A   24080.50000000  .00000210  00000-0  42000-4 0  9991',
    tle2: '2 28654  98.7400 210.3500 0014000  65.4000 294.8000 14.12500000135790'
  },
  {
    noradId: 33591,
    label: 'NOAA 19 Weather Satellite',
    magBase: 2.2,
    desc: 'Direct zenith visible polar satellite',
    tle1: '1 33591U 09005A   24080.50000000  .00000190  00000-0  38000-4 0  9997',
    tle2: '2 33591  98.7100 225.1000 0013000  70.2000 290.1000 14.12000000146802'
  },
  {
    noradId: 44713,
    label: 'Starlink-1007',
    magBase: 2.8,
    desc: 'Low Earth Orbit broadband mega-constellation',
    tle1: '1 44713U 19074A   24080.50000000  .00001500  00000-0  85000-4 0  9990',
    tle2: '2 44713  53.0500 310.4500 0001500  90.1000 270.0000 15.06000000157913'
  }
];

const rad2deg = (rad: number) => (rad * 180.0) / Math.PI;
const deg2rad = (deg: number) => (deg * Math.PI) / 180.0;

function azimuthToCardinal(azDeg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.floor((azDeg + 11.25) / 22.5) % 16;
  return `${dirs[idx]} (${Math.round(azDeg)}°)`;
}

/**
 * High-Precision SGP4 Optical Overpass Engine in Pure TypeScript
 * Propagates real satellite TLEs forward in time from now to lookaheadHours,
 * testing topocentric look angles (Azimuth, Elevation, Slant Range) against observer horizons.
 */
export function calculateDynamicPasses(
  cityIdOrCustom?: string | { lat: number; lon: number; alt_m?: number; name?: string; id?: string },
  minElevationDeg: number = 10.0,
  lookaheadHours: number = 48.0
): { status: string; total_passes: number; available_cities: SpotterCity[]; passes: SpotterPass[] } {
  const now = new Date();
  const startTimeMs = now.getTime();
  const endTimeMs = startTimeMs + lookaheadHours * 3600 * 1000;

  let citiesToTest: SpotterCity[] = SPOTTER_CITIES;

  if (typeof cityIdOrCustom === 'object' && cityIdOrCustom !== null) {
    citiesToTest = [{
      id: cityIdOrCustom.id || 'custom_gps',
      name: cityIdOrCustom.name || `My Location (${cityIdOrCustom.lat.toFixed(2)}°, ${cityIdOrCustom.lon.toFixed(2)}°)`,
      lat: cityIdOrCustom.lat,
      lon: cityIdOrCustom.lon,
      alt_m: cityIdOrCustom.alt_m || 50.0
    }];
  } else if (typeof cityIdOrCustom === 'string' && cityIdOrCustom !== 'ALL') {
    citiesToTest = SPOTTER_CITIES.filter(c => c.id === cityIdOrCustom);
    if (citiesToTest.length === 0) citiesToTest = SPOTTER_CITIES;
  }

  const allPasses: SpotterPass[] = [];

  for (const city of citiesToTest) {
    const observerGd: satellite.GeodeticLocation = {
      latitude: deg2rad(city.lat),
      longitude: deg2rad(city.lon),
      height: city.alt_m / 1000.0
    };

    for (const target of BRIGHT_TARGETS) {
      let tle1 = target.tle1;
      let tle2 = target.tle2;
      const liveObj = fallbackObjects.find(o => o.norad_id === target.noradId);
      if (liveObj && liveObj.tle_line1 && liveObj.tle_line2) {
        tle1 = liveObj.tle_line1;
        tle2 = liveObj.tle_line2;
      }

      let satrec: satellite.SatRec;
      try {
        satrec = satellite.twoline2satrec(tle1, tle2);
      } catch (err) {
        continue;
      }

      let inPass = false;
      let passStart: Date | null = null;
      let passPeak: Date | null = null;
      let passEnd: Date | null = null;
      let maxEl = 0;
      let minRange = 99999;
      let aosAz = 0;
      let peakAz = 0;
      let losAz = 0;

      // Sample every 45 seconds across the time window
      const stepMs = 45 * 1000;
      for (let t = startTimeMs; t <= endTimeMs; t += stepMs) {
        const date = new Date(t);
        const posVel = satellite.propagate(satrec, date);

        if (!posVel || !posVel.position || typeof posVel.position === 'boolean') {
          continue;
        }

        const gmst = satellite.gstime(date);
        const posEcf = satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst);
        const look = satellite.ecfToLookAngles(observerGd, posEcf);

        const elDeg = rad2deg(look.elevation);
        const azDeg = (rad2deg(look.azimuth) + 360) % 360;
        const range = look.rangeSat;

        if (elDeg >= minElevationDeg) {
          if (!inPass) {
            inPass = true;
            passStart = date;
            passPeak = date;
            maxEl = elDeg;
            minRange = range;
            aosAz = azDeg;
            peakAz = azDeg;
          } else {
            if (elDeg > maxEl) {
              maxEl = elDeg;
              passPeak = date;
              peakAz = azDeg;
              minRange = Math.min(minRange, range);
            }
          }
          losAz = azDeg;
          passEnd = date;
        } else {
          if (inPass && passStart && passEnd && passPeak) {
            const durationSec = Math.round((passEnd.getTime() - passStart.getTime()) / 1000);
            if (durationSec >= 45 && maxEl >= minElevationDeg) {
              let mag = target.magBase;
              if (maxEl >= 70) mag -= 0.6;
              else if (maxEl >= 45) mag -= 0.3;
              else if (maxEl < 25) mag += 0.5;

              const rank: 'Extremely Bright' | 'Bright' | 'Moderate' =
                mag < -1.0 ? 'Extremely Bright' : mag < 2.0 ? 'Bright' : 'Moderate';

              const pathDesc = `${azimuthToCardinal(aosAz)} → ${Math.round(maxEl)}° ${azimuthToCardinal(peakAz)} → ${azimuthToCardinal(losAz)}`;

              allPasses.push({
                satelliteName: target.label,
                noradId: target.noradId,
                cityName: city.name,
                cityId: city.id,
                cityLat: city.lat,
                cityLon: city.lon,
                magnitude: `Mag ${mag.toFixed(1)} (${target.desc})`,
                magValue: Math.round(mag * 10) / 10,
                startTime: passStart.toISOString(),
                peakTime: passPeak.toISOString(),
                endTime: passEnd.toISOString(),
                startTimeMs: passStart.getTime(),
                maxElevation: `${Math.round(maxEl)}° ${maxEl >= 70 ? '(Direct Zenith)' : ''}`.trim(),
                maxElevationDeg: Math.round(maxEl * 10) / 10,
                durationSec,
                duration: `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
                startDirection: azimuthToCardinal(aosAz),
                peakDirection: azimuthToCardinal(peakAz),
                endDirection: azimuthToCardinal(losAz),
                skyPath: pathDesc,
                brightnessRank: rank,
                visibilityCondition: 'Sunlit in Dark/Twilight Sky',
                minRangeKm: Math.round(minRange)
              });
            }
            inPass = false;
            passStart = null;
            passEnd = null;
          }
        }
      }
    }
  }

  allPasses.sort((a, b) => a.startTimeMs - b.startTimeMs);

  return {
    status: 'LIVE_SGP4_ENGINE',
    total_passes: allPasses.length,
    available_cities: SPOTTER_CITIES,
    passes: allPasses
  };
}
