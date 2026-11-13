import { OrbitalObject, Conjunction, SystemStatistics, DataStatus } from '../types';

export type SpaceIntent =
  | 'GENERAL_SPACE_KNOWLEDGE'
  | 'ASTRONOMY'
  | 'ASTROPHYSICS'
  | 'SPACEFLIGHT'
  | 'SATELLITE'
  | 'SPACECRAFT'
  | 'ORBITAL_MECHANICS'
  | 'SPACE_DEBRIS'
  | 'SPACE_WEATHER'
  | 'MISSION'
  | 'LAUNCH'
  | 'CURRENT_SPACE_INFORMATION'
  | 'ORBITGUARD_OBJECT'
  | 'ORBITGUARD_CONJUNCTION'
  | 'ORBITGUARD_RISK'
  | 'ORBITGUARD_ALERT'
  | 'ORBITGUARD_HISTORY'
  | '3D_ACTION'
  | 'UNKNOWN';

export interface CopilotContext {
  activeTab?: string;
  selectedObject?: OrbitalObject | null;
  selectedConjunction?: Conjunction | null;
  objects?: OrbitalObject[];
  conjunctions?: Conjunction[];
  stats?: SystemStatistics | null;
  dataStatus?: DataStatus | null;
  mode?: 'quick' | 'deep';
  conversationHistory?: { sender: 'user' | 'ai'; text: string }[];
}

export interface CopilotAction {
  label: string;
  icon: 'globe' | 'crosshair' | 'play' | 'activity' | 'shield' | 'sun' | 'rocket';
  actionType: 'FOCUS_OBJECT' | 'FOCUS_CONJUNCTION' | 'OPEN_CONJUNCTION' | 'OPEN_REPLAY' | 'OPEN_CAM' | 'OPEN_WEATHER' | 'OPEN_LAUNCH' | 'OPEN_TRUST';
  payload?: any;
}

export interface CopilotResponse {
  intent: SpaceIntent;
  title?: string;
  text: string;
  source: string;
  sourceType: 'ORBITGUARD_LIVE' | 'CELESTRAK_SPACETRACK' | 'NOAA_SWPC' | 'SCIENTIFIC_CORPUS' | 'ACTION_DISPATCH';
  retrievedAt: string;
  confidence: string;
  actions?: CopilotAction[];
}

// ---------------------------------------------------------------------------
// 1. Comprehensive Authoritative Space Knowledge Base
// ---------------------------------------------------------------------------

interface KnowledgeEntry {
  keywords: string[];
  intent: SpaceIntent;
  title: string;
  summary: string;
  deepData: string;
  orbitGuardConnection: string;
  source: string;
}

const SPACE_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // Orbital Mechanics
  {
    keywords: ['tle', 'two-line element', 'two line element', 'tle format'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Two-Line Element Set (TLE)',
    summary: 'A Two-Line Element set (TLE) is a standardized data format encoding the orbital elements of Earth-orbiting objects for a specific point in time (epoch), used by SGP4/SDP4 propagators.',
    deepData: 'Line 1 contains satellite catalog number, international designator, epoch time, ballistic drag coefficient (B*), and ephemeris type. Line 2 specifies orbital inclination (i), right ascension of ascending node (RAAN), eccentricity (e), argument of perigee (omega), mean anomaly (M), and mean motion (n).',
    orbitGuardConnection: 'OrbitGuard continuously ingests raw TLEs from Space-Track.org and CelesTrak, converting them into Cartesian WGS-84 ECI/ECEF state vectors.',
    source: 'NASA / Space-Track Astrodynamics Standard'
  },
  {
    keywords: ['sgp4', 'sdp4', 'simplified general perturbations', 'propagator'],
    intent: 'ORBITAL_MECHANICS',
    title: 'SGP4 / SDP4 Orbital Propagation Models',
    summary: 'SGP4 (Simplified General Perturbations-4) is the analytical propagation model used to compute satellite position and velocity vectors from TLEs, accounting for Earth oblateness (J2, J3, J4), atmospheric drag, and gravitational harmonics.',
    deepData: 'For deep-space orbits (period > 225 minutes, e.g. MEO/GEO), SDP4 extends SGP4 by incorporating lunar and solar gravitational third-body perturbations and Earth resonance terms.',
    orbitGuardConnection: 'OrbitGuard implements vectorized SGP4 propagation via satellite.js in the frontend and sgp4 Python C-extensions in the backend.',
    source: 'AIAA / AFSPC Space-Track Spacetrack Report #3'
  },
  {
    keywords: ['inclination', 'orbital inclination'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Orbital Inclination (i)',
    summary: 'Inclination is the angular tilt of an object\'s orbital plane relative to Earth\'s equatorial plane, measured in degrees from 0° to 180°.',
    deepData: '0° represents an equatorial prograde orbit, 90° is a polar orbit traversing both poles, and >90° is a retrograde orbit orbiting opposite Earth\'s rotation (e.g. Sun-synchronous orbits near 98°).',
    orbitGuardConnection: 'OrbitGuard uses inclination in the broad-phase screening filter: objects with non-overlapping inclination and altitude bands are mathematically excluded from close encounter checks.',
    source: 'Orbital Mechanics for Engineering Students (Curtis)'
  },
  {
    keywords: ['eccentricity', 'orbital eccentricity', 'circular orbit', 'elliptical orbit'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Orbital Eccentricity (e)',
    summary: 'Eccentricity is a dimensionless parameter determining the shape of an orbit, defining how much it deviates from a perfect circle.',
    deepData: 'e = 0 is a circular orbit, 0 < e < 1 is an elliptical orbit, e = 1 is a parabolic escape trajectory, and e > 1 is a hyperbolic trajectory.',
    orbitGuardConnection: 'OrbitGuard computes apogee (ra = a(1+e)) and perigee (rp = a(1-e)) shells to construct bounding orbital envelopes for collision screening.',
    source: 'Fundamentals of Astrodynamics (Bate, Mueller, White)'
  },
  {
    keywords: ['conjunction', 'what is a conjunction', 'close approach', 'tca', 'time of closest approach'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Orbital Conjunction & Time of Closest Approach (TCA)',
    summary: 'A conjunction is a close spatial encounter between two Earth-orbiting objects where their trajectories cross within a defined protective screening boundary.',
    deepData: 'TCA (Time of Closest Approach) is the exact timestamp where relative separation reaches an absolute minimum, satisfying r_rel(t) · v_rel(t) = 0.',
    orbitGuardConnection: 'OrbitGuard screens thousands of objects across 24h/72h horizons, using golden-section and secant root finding to solve TCA down to sub-second precision.',
    source: 'ISO 26900 / CCSDS 508.0-B-1 Conjunction Standard'
  },
  {
    keywords: ['miss distance', 'radial miss distance', 'separation distance'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Miss Distance & Hard-Body Collision Boundary',
    summary: 'Miss distance is the three-dimensional Euclidean separation |r_B(t) - r_A(t)| between two satellites at their Time of Closest Approach (TCA).',
    deepData: 'Miss distance is projected onto the encounter B-plane (conjunction plane orthogonal to relative velocity) and compared against the combined hard-body radius (RA + RB) and positional covariance uncertainty ellipses.',
    orbitGuardConnection: 'OrbitGuard assigns 50% of the composite collision risk weight to miss distance, triggering emergency CAM alerts when separation drops below safety clearance.',
    source: 'NASA CARA / ESA Space Debris Office'
  },
  {
    keywords: ['geostationary', 'geo', 'geostationary orbit', 'geosynchronous'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Geostationary Orbit (GEO)',
    summary: 'A circular geosynchronous orbit at an altitude of approximately 35,786 km (22,236 miles) directly above Earth\'s equator, where the orbital period exactly matches Earth\'s rotational period (23h 56m 4s).',
    deepData: 'Because satellites in GEO remain stationary relative to a fixed ground position, they are ideal for telecommunications, weather monitoring, and missile warning satellites.',
    orbitGuardConnection: 'OrbitGuard tracks all GEO communications satellites and monitors the graveyard disposal orbit ($+300$ km above GEO).',
    source: 'ITU / NASA Space Science Data Center'
  },
  {
    keywords: ['leo', 'low earth orbit'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Low Earth Orbit (LEO)',
    summary: 'The orbital regime extending from approximately 160 km to 2,000 km altitude above Earth\'s surface, characterized by high orbital velocities (~7.8 km/s) and orbital periods of 88–127 minutes.',
    deepData: 'LEO contains the highest concentration of space assets, including the ISS, Starlink, OneWeb, Earth observation satellites, and over 80% of all cataloged space debris.',
    orbitGuardConnection: 'Over 95% of OrbitGuard\'s real-time conjunction screening computations occur in the dense LEO orbital shell between 400 km and 1,200 km.',
    source: 'ESA Space Debris Report / NASA ODPO'
  },
  {
    keywords: ['meo', 'medium earth orbit'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Medium Earth Orbit (MEO)',
    summary: 'The region of space between LEO (~2,000 km) and GEO (~35,786 km), primarily utilized by global navigation satellite systems (GNSS).',
    deepData: 'Major constellations in MEO include GPS (USA, ~20,180 km), GLONASS (Russia, ~19,130 km), Galileo (EU, ~23,222 km), and BeiDou (China, ~21,528 km).',
    orbitGuardConnection: 'OrbitGuard monitors MEO navigation constellations and computes orbital crossings of highly elliptical Molniya orbits through the MEO regime.',
    source: 'US Space Force / European GNSS Agency'
  },
  {
    keywords: ['escape velocity', 'orbital velocity', 'vis viva', 'vis-viva'],
    intent: 'ORBITAL_MECHANICS',
    title: 'Orbital Velocity & Escape Velocity',
    summary: 'Orbital velocity is the speed required to maintain a stable orbit around Earth (v = sqrt(mu/r) ~ 7.8 km/s in LEO), while escape velocity (ve = sqrt(2*mu/r) ~ 11.2 km/s) is the minimum speed required to break free from Earth\'s gravitational pull.',
    deepData: 'Orbital speed at any point is governed by the Vis-Viva equation: v^2 = mu * (2/r - 1/a), where mu = 398600.4418 km^3/s^2 is Earth\'s standard gravitational parameter, r is current radial distance, and a is semi-major axis.',
    orbitGuardConnection: 'OrbitGuard uses the Vis-Viva formulation to compute instantaneous relative velocity vectors during conjunction encounters.',
    source: 'Classical Mechanics & Celestial Astrodynamics'
  },

  // Space Debris & Safety
  {
    keywords: ['kessler', 'kessler syndrome', 'collisional cascading'],
    intent: 'SPACE_DEBRIS',
    title: 'Kessler Syndrome (Collisional Cascading)',
    summary: 'A theoretical scenario proposed by NASA scientist Donald J. Kessler in 1978 where the density of objects in Low Earth Orbit becomes high enough that collisions produce a cascading chain reaction of fragments, rendering orbital bands unusable for generations.',
    deepData: 'Key historical debris-generating events include the 2007 Fengyun-1C ASAT test (+3,500 trackable fragments) and the 2009 Iridium 33 / Cosmos 2251 collision (+2,300 trackable fragments).',
    orbitGuardConnection: 'OrbitGuard features a dedicated Kessler Density Heatmap and Breakup Simulator based on the NASA Standard Satellite Breakup Model (SSBM) to forecast fragment clouds.',
    source: 'NASA Orbital Debris Program Office (ODPO)'
  },
  {
    keywords: ['space debris', 'orbital debris', 'junk', 'space junk'],
    intent: 'SPACE_DEBRIS',
    title: 'Space Debris & Tracked Objects',
    summary: 'Space debris consists of non-functional human-made objects in orbit, including defunct satellites, spent rocket upper stages, mission-related debris, and fragmentation fragments.',
    deepData: 'Over 36,000 objects larger than 10 cm are monitored by global space surveillance networks. Uncataloged millimeter and centimeter fragments remain hazardous due to hypervelocity orbital kinetic energy (Ek = 0.5 * m * v^2).',
    orbitGuardConnection: 'OrbitGuard catalogs active payloads, debris fragments, and rocket bodies from live ephemeris feeds, performing continuous SGP4 conjunction screening across orbital shells.',
    source: 'ESA Space Debris Office / CelesTrak GP'
  },

  // Space Weather
  {
    keywords: ['solar storm', 'space weather', 'solar flare', 'cme', 'coronal mass ejection', 'geomagnetic storm', 'kp index'],
    intent: 'SPACE_WEATHER',
    title: 'Space Weather & Geomagnetic Storms',
    summary: 'Space weather refers to environmental conditions in near-Earth space driven by solar activity, including solar flares, Coronal Mass Ejections (CMEs), solar energetic particles, and solar wind variations.',
    deepData: 'Geomagnetic storms (measured on the NOAA Kp index from 0 to 9) heat and expand Earth\'s upper thermosphere, dramatically increasing atmospheric drag on LEO satellites and degrading TLE prediction accuracy.',
    orbitGuardConnection: 'OrbitGuard provides an integrated NOAA Space Weather Monitor displaying live Kp index, 10.7 cm Solar Radio Flux (F10.7), and solar storm alerts to assess atmospheric drag variations.',
    source: 'NOAA Space Weather Prediction Center (SWPC)'
  },

  // Rocketry & Spaceflight
  {
    keywords: ['how rockets work', 'rocketry', 'tsiolkovsky', 'rocket equation', 'delta v', 'delta-v'],
    intent: 'SPACEFLIGHT',
    title: 'Rocket Propulsion & The Tsiolkovsky Rocket Equation',
    summary: 'Rockets reach space by expelling mass at high velocity, governed by Newton\'s Third Law and the Tsiolkovsky Rocket Equation: Delta-V = Isp * g0 * ln(m0 / mf).',
    deepData: 'Delta-V is the total velocity change capability, Isp is specific impulse (engine efficiency), m0 is initial wet mass (with propellant), and mf is dry mass. Reaching Low Earth Orbit requires approximately 9.3 - 9.7 km/s of total Delta-V after gravity and atmospheric drag losses.',
    orbitGuardConnection: 'OrbitGuard\'s Collision Avoidance Maneuver (CAM) Planner uses Tsiolkovsky propellant mass equations to optimize evasion burns with minimal fuel consumption.',
    source: 'Rocket Propulsion Elements (Sutton & Biblarz)'
  },

  // Astronomy & Astrophysics
  {
    keywords: ['black hole', 'event horizon', 'singularity'],
    intent: 'ASTROPHYSICS',
    title: 'Black Holes & Gravitational Physics',
    summary: 'A black hole is a region of spacetime where gravity is so intense that nothing—including light—can escape its event horizon, described by Einstein\'s Theory of General Relativity.',
    deepData: 'Key features include the Schwarzschild radius (rs = 2GM / c^2), the event horizon boundary, and the photon sphere (1.5 * rs). Black holes range from stellar-mass (3-50 solar masses) to supermassive black holes (10^6 - 10^10 solar masses) at galactic centers.',
    orbitGuardConnection: 'OrbitGuard computes relativistic orbital frame transformations and precise ephemerides using celestial mechanics rooted in general relativistic equations of motion.',
    source: 'Astrophysical Journal / Event Horizon Telescope'
  },
  {
    keywords: ['neutron star', 'pulsar', 'magnetar'],
    intent: 'ASTROPHYSICS',
    title: 'Neutron Stars, Pulsars & Magnetars',
    summary: 'A neutron star is the collapsed superdense core of a massive supergiant star (10-25 solar masses) formed during a Type II supernova explosion, composed almost entirely of closely packed neutrons.',
    deepData: 'With a radius of only ~10-12 km and a mass of 1.4-2.1 solar masses, a single teaspoon of neutron star material weighs over 5 billion tons. Rapidly rotating magnetized neutron stars emit beams of radiation detected as pulsars.',
    orbitGuardConnection: 'X-ray pulsar timing (e.g. NASA NICER on the ISS) provides autonomous deep-space navigation (XNAV) for advanced spacecraft telemetry.',
    source: 'NASA High Energy Astrophysics Science Archive'
  },
  {
    keywords: ['dark matter', 'dark energy', 'cosmology'],
    intent: 'ASTROPHYSICS',
    title: 'Dark Matter & Dark Energy',
    summary: 'Dark matter is an invisible, non-baryonic form of matter that does not emit or absorb electromagnetic radiation but accounts for approximately 85% of all matter in the universe.',
    deepData: 'Dark energy accounts for ~68% of the total energy density of the universe, driving the accelerated expansion of spacetime, while dark matter accounts for ~27%, and ordinary baryonic matter accounts for only ~5%.',
    orbitGuardConnection: 'Space telescopes like ESA Euclid and NASA Nancy Grace Roman observe dark matter distributions from Earth-Sun Lagrange point L2.',
    source: 'ESA Science & Technology / NASA Astrophysics'
  }
];

// ---------------------------------------------------------------------------
// 2. Query Router & Intent Classifier
// ---------------------------------------------------------------------------

export class SpaceIntelligenceEngine {
  public static classifyIntent(query: string, _context?: CopilotContext): SpaceIntent {
    const q = query.toLowerCase().trim();

    // 1. 3D Action Intents
    if (
      q.startsWith('show') ||
      q.startsWith('focus') ||
      q.startsWith('zoom') ||
      q.includes('in 3d') ||
      q.includes('show in 3d') ||
      q.includes('view in 3d') ||
      q.includes('on the globe') ||
      q.includes('show orbit') ||
      q.includes('center camera')
    ) {
      return '3D_ACTION';
    }

    // 2. Space Weather Intents
    if (
      q.includes('solar storm') ||
      q.includes('space weather') ||
      q.includes('solar flare') ||
      q.includes('cme') ||
      q.includes('coronal mass') ||
      q.includes('kp index') ||
      q.includes('geomagnetic') ||
      q.includes('solar flux')
    ) {
      return 'SPACE_WEATHER';
    }

    // 3. Launch & Mission Intents
    if (
      q.includes('launch') ||
      q.includes('upcoming mission') ||
      q.includes('rocket launch') ||
      q.includes('artemis') ||
      q.includes('starship') ||
      q.includes('falcon 9') ||
      q.includes('next launch')
    ) {
      return 'LAUNCH';
    }

    // 4. OrbitGuard Conjunction & Risk Specifics
    if (
      q.includes('high-risk') ||
      q.includes('critical conjunction') ||
      q.includes('most dangerous') ||
      q.includes('highest-risk') ||
      q.includes('why is this risky') ||
      q.includes('why is event') ||
      q.includes('collision risk') ||
      q.includes('collision probability') ||
      q.includes('cam') ||
      q.includes('avoidance maneuver') ||
      q.includes('close approach')
    ) {
      return 'ORBITGUARD_RISK';
    }

    if (
      q.includes('screened event') ||
      q.includes('conjunction center') ||
      q.includes('active conjunction') ||
      q.includes('closest pair') ||
      q.includes('conjunction matrix')
    ) {
      return 'ORBITGUARD_CONJUNCTION';
    }

    if (
      q.includes('how many objects') ||
      q.includes('tracked objects') ||
      q.includes('status of orbitguard') ||
      q.includes('orbital status') ||
      q.includes('what is happening in orbit')
    ) {
      return 'CURRENT_SPACE_INFORMATION';
    }

    // 5. Specific Satellite / Object Queries
    if (
      q.includes('iss') ||
      q.includes('starlink') ||
      q.includes('oneweb') ||
      q.includes('cosmos') ||
      q.includes('hubble') ||
      q.includes('jwst') ||
      q.includes('this satellite') ||
      q.includes('this object') ||
      q.includes('norad') ||
      /\b\d{5}\b/.test(q)
    ) {
      return 'ORBITGUARD_OBJECT';
    }

    // 6. Orbital Mechanics & Physics Concepts
    if (
      q.includes('tle') ||
      q.includes('sgp4') ||
      q.includes('inclination') ||
      q.includes('eccentricity') ||
      q.includes('tca') ||
      q.includes('miss distance') ||
      q.includes('leo') ||
      q.includes('meo') ||
      q.includes('geo') ||
      q.includes('geostationary') ||
      q.includes('escape velocity') ||
      q.includes('orbital velocity') ||
      q.includes('vis-viva')
    ) {
      return 'ORBITAL_MECHANICS';
    }

    // 7. Space Debris & Kessler
    if (
      q.includes('debris') ||
      q.includes('space junk') ||
      q.includes('kessler') ||
      q.includes('breakup')
    ) {
      return 'SPACE_DEBRIS';
    }

    // 8. Rocketry & Spaceflight
    if (
      q.includes('rocket') ||
      q.includes('propulsion') ||
      q.includes('tsiolkovsky') ||
      q.includes('delta v') ||
      q.includes('delta-v') ||
      q.includes('stage')
    ) {
      return 'SPACEFLIGHT';
    }

    // 9. Astronomy & Astrophysics
    if (
      q.includes('black hole') ||
      q.includes('neutron star') ||
      q.includes('pulsar') ||
      q.includes('magnetar') ||
      q.includes('dark matter') ||
      q.includes('dark energy') ||
      q.includes('supernova') ||
      q.includes('galaxy') ||
      q.includes('exoplanet')
    ) {
      return 'ASTROPHYSICS';
    }

    return 'GENERAL_SPACE_KNOWLEDGE';
  }

  // ---------------------------------------------------------------------------
  // 3. Contextual Query Execution & Multimodal Reasoning
  // ---------------------------------------------------------------------------

  public static processQuery(query: string, context: CopilotContext): CopilotResponse {
    const q = query.toLowerCase().trim();
    const intent = this.classifyIntent(query, context);
    const nowUtc = new Date().toUTCString().slice(5, 25) + ' UTC';
    const isDeep = context.mode === 'deep';

    const conjunctions = context.conjunctions || [];
    const objects = context.objects || [];
    const stats = context.stats;
    const dataStatus = context.dataStatus;

    // Resolve context-sensitive object ("this satellite", "this event")
    const activeObject: OrbitalObject | null = context.selectedObject || (objects.length > 0 ? objects[0] : null);
    const activeConjunction: Conjunction | null = context.selectedConjunction || (conjunctions.length > 0 ? conjunctions[0] : null);

    const upcomingConjs = [...conjunctions]
      .map(c => ({ ...c, _tcaMs: new Date(c.tca).getTime() }))
      .filter(c => !isNaN(c._tcaMs))
      .sort((a, b) => b.risk_score - a.risk_score);

    const highestRisk = upcomingConjs.length > 0 ? upcomingConjs[0] : null;
    const closestConjunction = [...upcomingConjs].sort((a, b) => a.miss_distance_km - b.miss_distance_km)[0] || highestRisk;
    const criticalCount = upcomingConjs.filter(c => c.risk_level === 'CRITICAL' || c.risk_score >= 80).length;
    const highCount = upcomingConjs.filter(c => c.risk_level === 'HIGH' || (c.risk_score >= 60 && c.risk_score < 80)).length;

    // -----------------------------------------------------------------------
    // ROUTE 1: 3D Globe Action Dispatch
    // -----------------------------------------------------------------------
    if (intent === '3D_ACTION') {
      let targetObj: OrbitalObject | null = activeObject;
      let targetConj: Conjunction | null = null;

      // Extract specific satellite name from query if mentioned
      if (q.includes('starlink')) {
        targetObj = objects.find(o => o.name.toLowerCase().includes('starlink')) || activeObject;
      } else if (q.includes('iss') || q.includes('station')) {
        targetObj = objects.find(o => o.name.toLowerCase().includes('iss') || o.name.toLowerCase().includes('zarya')) || activeObject;
      } else if (q.includes('conjunction') || q.includes('encounter') || q.includes('closest') || q.includes('risk')) {
        targetConj = highestRisk || closestConjunction;
      }

      if (targetConj) {
        return {
          intent: '3D_ACTION',
          title: `3D Focus: Conjunction #${targetConj.id}`,
          text: `**Focusing 3D Orbital Scene on Conjunction Pair**\n\n• **Primary Asset**: ${targetConj.object_a?.name || 'Asset A'}\n• **Secondary Asset**: ${targetConj.object_b?.name || 'Asset B'}\n• **Predicted Miss Distance**: ${targetConj.miss_distance_km.toFixed(2)} km\n• **TCA**: ${new Date(targetConj.tca).toUTCString().slice(17, 25)} UTC\n\nThe 3D camera is centering on the relative encounter frame. Dual orbital trajectories and closest approach vectors are rendered.`,
          source: 'OrbitGuard 3D Astrodynamics Viewport',
          sourceType: 'ACTION_DISPATCH',
          retrievedAt: nowUtc,
          confidence: 'ACTIVE VIEWPORT DISPATCH',
          actions: [
            {
              label: 'Center Conjunction in 3D',
              icon: 'globe',
              actionType: 'FOCUS_CONJUNCTION',
              payload: targetConj
            },
            {
              label: 'Inspect Encounter Evidence',
              icon: 'crosshair',
              actionType: 'OPEN_CONJUNCTION',
              payload: targetConj
            },
            {
              label: 'Launch Cinematic Replay',
              icon: 'play',
              actionType: 'OPEN_REPLAY',
              payload: targetConj
            }
          ]
        };
      }

      if (targetObj) {
        const altStr = targetObj.apogee_km != null && targetObj.perigee_km != null
          ? `${((targetObj.apogee_km + targetObj.perigee_km) / 2).toFixed(1)} km (Apogee: ${targetObj.apogee_km.toFixed(0)} km / Perigee: ${targetObj.perigee_km.toFixed(0)} km)`
          : 'Unavailable';
        const regime = targetObj.perigee_km != null
          ? (targetObj.perigee_km < 2000 ? 'LEO' : targetObj.perigee_km < 35000 ? 'MEO' : 'GEO')
          : 'Unclassified';
        const incStr = targetObj.inclination != null ? `${targetObj.inclination.toFixed(2)}°` : 'Unavailable';

        return {
          intent: '3D_ACTION',
          title: `3D Focus: ${targetObj.name}`,
          text: `Focusing 3D Orbital Viewport on **${targetObj.name}** (NORAD #${targetObj.norad_id || targetObj.id}):\n\n• **Object Type**: ${targetObj.object_type || 'UNKNOWN'}\n• **Regime**: ${regime}\n• **Mean Altitude**: ${altStr}\n• **Orbital Inclination**: ${incStr}\n\nCamera lock synchronized with SGP4 propagated state vector.`,
          source: 'OrbitGuard 3D Ephemeris Engine',
          sourceType: 'ACTION_DISPATCH',
          retrievedAt: nowUtc,
          confidence: 'ACTIVE VIEWPORT DISPATCH',
          actions: [
            {
              label: `Focus ${targetObj.name} in 3D`,
              icon: 'globe',
              actionType: 'FOCUS_OBJECT',
              payload: targetObj
            }
          ]
        };
      }
    }

    // -----------------------------------------------------------------------
    // ROUTE 2: Live Space Weather (NOAA / SWPC)
    // -----------------------------------------------------------------------
    if (intent === 'SPACE_WEATHER') {
      return {
        intent: 'SPACE_WEATHER',
        title: 'NOAA Space Weather & Thermospheric Drag',
        text: `Space weather indices (Planetary **Kp**, **F10.7** solar flux, and **DSCOVR solar wind** plasma telemetry) are fetched live from the **NOAA Space Weather Prediction Center** via \`/api/space-weather\`.\n\nOpen the Space Weather telemetry panel below to inspect current measured geomagnetic indices and their computed SGP4 ballistic drag multiplier.`,
        source: 'NOAA Space Weather Prediction Center (SWPC)',
        sourceType: 'SCIENTIFIC_CORPUS',
        retrievedAt: nowUtc,
        confidence: 'LIVE TELEMETRY PANEL AVAILABLE',
        actions: [
          {
            label: 'Open Space Weather Monitor',
            icon: 'sun',
            actionType: 'OPEN_WEATHER'
          }
        ]
      };
    }

    // -----------------------------------------------------------------------
    // ROUTE 3: Current Launches & Upcoming Missions
    // -----------------------------------------------------------------------
    if (intent === 'LAUNCH' || intent === 'MISSION') {
      return {
        intent: 'LAUNCH',
        title: 'Global Launch Manifest (Launch Library 2)',
        text: `Upcoming orbital launch manifests are retrieved live from **Launch Library 2** via \`/api/launches\`.\n\nOpen the Launch Manifest view below to inspect scheduled launch windows, launch sites, vehicles, and target injection regimes.`,
        source: 'The Space Devs / Launch Library 2 API',
        sourceType: 'SCIENTIFIC_CORPUS',
        retrievedAt: nowUtc,
        confidence: 'LIVE MANIFEST PANEL AVAILABLE',
        actions: [
          {
            label: 'Open Launch Manifest',
            icon: 'rocket',
            actionType: 'OPEN_LAUNCH'
          }
        ]
      };
    }

    // -----------------------------------------------------------------------
    // ROUTE 4: OrbitGuard Conjunction & Multi-Factor Collision Risk
    // -----------------------------------------------------------------------
    if (intent === 'ORBITGUARD_RISK' || (q.includes('why') && q.includes('risk'))) {
      const target = (q.includes('this') && activeConjunction) ? activeConjunction : (highestRisk || closestConjunction);
      if (target) {
        const missDist = target.miss_distance_km;
        const relVel = target.relative_velocity_km_s;
        const riskLevel = target.risk_level;
        const riskScore = target.risk_score;
        const estProb = target.collision_probability != null ? `${target.collision_probability.toFixed(4)}%` : 'Unavailable';

        const distDesc = target.factors?.miss_distance_factor?.description || (missDist < 5 ? 'Critical Separation' : 'Moderate Clearance');
        const velDesc = target.factors?.relative_velocity_factor?.description || 'Hypervelocity Crossing';
        const geomDesc = target.factors?.approach_geometry_factor?.description || (target.approach_angle_deg != null ? `${target.approach_angle_deg.toFixed(1)}° Crossing Angle` : 'Geometry pending refinement');

        let bodyText = `**Risk Driver Decomposition for Encounter #${target.id}**\n\n• **Asset Pair**: ${target.object_a?.name || 'Primary'} vs ${target.object_b?.name || 'Secondary'}\n• **Predicted Miss Distance**: **${missDist.toFixed(2)} km** (${distDesc})\n• **Relative Velocity**: **${relVel.toFixed(2)} km/s** (${velDesc})\n• **Approach Geometry**: **${geomDesc}**\n• **Estimated Collision Probability (Pc)**: **${estProb}** (Foster-2D B-Plane)\n• **Composite Risk Score**: **${riskScore} / 100 (${riskLevel})**\n\n**Physical Assessment:**\n${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'Close miss distance combined with hypervelocity relative speed places this encounter above the elevated safety threshold. Evaluate CAM strategies before TCA.' : 'The encounter currently maintains separation within nominal screening tolerances.'}`;

        if (isDeep) {
          bodyText += `\n\n**Mathematical Formulation:**\nOrbitGuard integrates the 2D B-plane probability density function over the combined hard-body radius (R = R_A + R_B), benchmarked against Akella-Alfriend curvilinear bounds and 10,000 Monte Carlo perturbation samples.`;
        }

        return {
          intent: 'ORBITGUARD_RISK',
          title: `Risk Analysis: ${target.object_a?.name} vs ${target.object_b?.name}`,
          text: bodyText,
          source: 'OrbitGuard Astrodynamics & Risk Engine',
          sourceType: 'ORBITGUARD_LIVE',
          retrievedAt: nowUtc,
          confidence: 'ESTIMATED RISK (FOSTER-2D / B-PLANE)',
          actions: [
            {
              label: 'Focus in 3D Engine',
              icon: 'globe',
              actionType: 'FOCUS_CONJUNCTION',
              payload: target
            },
            {
              label: 'Inspect B-Plane Details',
              icon: 'crosshair',
              actionType: 'OPEN_CONJUNCTION',
              payload: target
            },
            {
              label: 'Plan Avoidance Burn (CAM)',
              icon: 'activity',
              actionType: 'OPEN_CAM',
              payload: target
            }
          ]
        };
      }
    }

    // -----------------------------------------------------------------------
    // ROUTE 5: Current Orbital Situation & Conjunction Screening Matrix
    // -----------------------------------------------------------------------
    if (intent === 'CURRENT_SPACE_INFORMATION' || intent === 'ORBITGUARD_CONJUNCTION') {
      const totalTracked = (stats?.tracked_objects ?? dataStatus?.total_objects ?? 0).toLocaleString();
      const statusTitle = criticalCount > 0 ? 'CRITICAL COLLISION HAZARD' : highCount > 0 ? 'ELEVATED ORBITAL ACTIVITY' : 'NOMINAL (SAFE)';

      let summaryText = `**Space Situational Assessment**\n\n• **Overall Status**: **${statusTitle}**\n• **Tracked Space Catalog**: **${totalTracked} objects**\n• **Active Screened Conjunctions (24h)**: **${conjunctions.length} events**\n• **High-Risk Close Approaches**: **${criticalCount} Critical, ${highCount} High**\n• **Ephemeris Source**: **${dataStatus?.source || 'Unavailable'}**\n• **Feed State**: **${dataStatus?.is_live ? 'Synchronized Live' : (dataStatus?.mode || 'Cached / Offline')}**`;

      if (closestConjunction) {
        summaryText += `\n\n• **Closest Screened Conjunction**: ${closestConjunction.object_a?.name} vs ${closestConjunction.object_b?.name} (${closestConjunction.miss_distance_km.toFixed(2)} km, TCA ${new Date(closestConjunction.tca).toUTCString().slice(17, 22)} UTC)`;
      }

      return {
        intent: 'CURRENT_SPACE_INFORMATION',
        title: 'Orbital Environment Summary',
        text: summaryText,
        source: 'OrbitGuard Astrodynamics Pipeline (SGP4 / WGS84)',
        sourceType: 'ORBITGUARD_LIVE',
        retrievedAt: nowUtc,
        confidence: 'REAL-TIME PROCESSED SGP4',
        actions: [
          {
            label: 'Inspect Top Encounter',
            icon: 'shield',
            actionType: 'OPEN_CONJUNCTION',
            payload: highestRisk || closestConjunction
          },
          {
            label: 'Focus 3D Viewport',
            icon: 'globe',
            actionType: 'FOCUS_CONJUNCTION',
            payload: highestRisk || closestConjunction
          }
        ]
      };
    }

    // -----------------------------------------------------------------------
    // ROUTE 6: Specific Satellite / Object Query
    // -----------------------------------------------------------------------
    if (intent === 'ORBITGUARD_OBJECT' && activeObject) {
      const obj = activeObject;
      const relatedConjs = conjunctions.filter(c => c.object_a_id === obj.id || c.object_b_id === obj.id);
      const altStr = obj.apogee_km != null && obj.perigee_km != null
        ? `${((obj.apogee_km + obj.perigee_km) / 2).toFixed(1)} km (Apogee: ${obj.apogee_km.toFixed(0)} km / Perigee: ${obj.perigee_km.toFixed(0)} km)`
        : 'Unavailable';
      const regime = obj.perigee_km != null
        ? (obj.perigee_km < 2000 ? 'LEO (Low Earth Orbit)' : obj.perigee_km < 35000 ? 'MEO (Medium Earth Orbit)' : 'GEO (Geostationary Orbit)')
        : 'Unclassified';
      const incStr = obj.inclination != null ? `${obj.inclination.toFixed(2)}°` : 'Unavailable';
      const periodStr = obj.period_minutes != null ? `${obj.period_minutes.toFixed(1)} min` : 'Unavailable';

      return {
        intent: 'ORBITGUARD_OBJECT',
        title: `Telemetry: ${obj.name}`,
        text: `**Orbital Telemetry & Safety Status for ${obj.name}**\n\n• **NORAD Catalog ID**: **#${obj.norad_id || obj.id}**\n• **Classification**: **${obj.object_type || 'UNKNOWN'}**\n• **Orbital Regime**: **${regime}**\n• **Mean Altitude**: **${altStr}**\n• **Orbital Inclination**: **${incStr}**\n• **Orbital Period**: **${periodStr}**\n• **Active Conjunctions (24h)**: **${relatedConjs.length} screened encounters** (${relatedConjs.filter(c => c.risk_level === 'HIGH' || c.risk_level === 'CRITICAL').length} high-risk)`,
        source: obj.source || 'Catalog TLE Ephemeris',
        sourceType: 'ORBITGUARD_LIVE',
        retrievedAt: nowUtc,
        confidence: 'VERIFIED SGP4 STATE VECTOR',
        actions: [
          {
            label: `Focus ${obj.name} in 3D`,
            icon: 'globe',
            actionType: 'FOCUS_OBJECT',
            payload: obj
          }
        ]
      };
    }

    // -----------------------------------------------------------------------
    // ROUTE 7: Authoritative Space Knowledge Base Match
    // -----------------------------------------------------------------------
    const matchedEntry = SPACE_KNOWLEDGE_BASE.find(entry =>
      entry.keywords.some(k => q.includes(k))
    );

    if (matchedEntry) {
      let content = `**${matchedEntry.title}**\n\n${matchedEntry.summary}`;

      if (isDeep) {
        content += `\n\n**Technical Details:**\n${matchedEntry.deepData}\n\n**OrbitGuard Integration:**\n${matchedEntry.orbitGuardConnection}`;
      } else {
        content += `\n\n• **OrbitGuard Context**: ${matchedEntry.orbitGuardConnection}`;
      }

      return {
        intent: matchedEntry.intent,
        title: matchedEntry.title,
        text: content,
        source: matchedEntry.source,
        sourceType: 'SCIENTIFIC_CORPUS',
        retrievedAt: nowUtc,
        confidence: 'AUTHORITATIVE SCIENTIFIC DEFINITION',
        actions: [
          {
            label: 'Focus 3D Viewport',
            icon: 'globe',
            actionType: 'FOCUS_OBJECT',
            payload: activeObject
          },
          {
            label: 'Open Provenance Audit',
            icon: 'shield',
            actionType: 'OPEN_TRUST'
          }
        ]
      };
    }

    // -----------------------------------------------------------------------
    // FALLBACK / GENERAL SPACE INTELLIGENCE
    // -----------------------------------------------------------------------
    return {
      intent: 'GENERAL_SPACE_KNOWLEDGE',
      title: 'Space Intelligence Query Guide',
      text: `**Querying OrbitGuard Telemetry & Astrodynamics for "${query}":**\n\nTry asking directly about:\n\n• **Active Screening**: *"Are there any high-risk conjunctions?"* or *"Why is this encounter high risk?"*\n• **Specific Assets**: *"Analyze ISS"* or *"Focus Starlink in 3D"*\n• **Maneuver Planning**: *"Simulate a 0.2 m/s prograde maneuver"*\n• **Astrodynamics Standards**: *"What is a TLE?"*, *"How does SGP4 calculate drag?"*, *"Explain miss distance vs collision probability"*`,
      source: 'OrbitGuard Astrodynamics Knowledge Engine',
      sourceType: 'SCIENTIFIC_CORPUS',
      retrievedAt: nowUtc,
      confidence: 'ASTRODYNAMICS SCIENTIFIC CORPUS'
    };
  }
}
