import * as THREE from 'three';
import { ObjectType } from '../types';

export type OrbitalIconCategory = 
  | 'ROCKET'
  | 'DEBRIS'
  | 'GPS'
  | 'STARLINK'
  | 'ONEWEB'
  | 'ISS'
  | 'PAYLOAD'
  | 'TARGET';

export interface IconCategoryMeta {
  key: OrbitalIconCategory;
  label: string;
  badge: string;
  color: string;
  glowColor: string;
  description: string;
}

export const ICON_CATEGORIES: Record<OrbitalIconCategory, IconCategoryMeta> = {
  ROCKET: {
    key: 'ROCKET',
    label: 'Rocket Bodies',
    badge: '🚀',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.8)',
    description: 'Upper stages & booster casings'
  },
  DEBRIS: {
    key: 'DEBRIS',
    label: 'Space Debris',
    badge: '💥',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.8)',
    description: 'Fragmentation shards & mission debris'
  },
  GPS: {
    key: 'GPS',
    label: 'GPS / GNSS',
    badge: '📡',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    description: 'Navigation & positioning constellations (GPS/GLONASS/Galileo/BeiDou)'
  },
  STARLINK: {
    key: 'STARLINK',
    label: 'Starlink',
    badge: '🛰️',
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.8)',
    description: 'SpaceX broadband flat-panel constellation'
  },
  ONEWEB: {
    key: 'ONEWEB',
    label: 'OneWeb / Comm',
    badge: '🛰️',
    color: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.85)',
    description: 'Global communications & relay satellites'
  },
  ISS: {
    key: 'ISS',
    label: 'Space Stations',
    badge: '🛰️',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.9)',
    description: 'Crewed orbital platforms (ISS, Tiangong)'
  },
  PAYLOAD: {
    key: 'PAYLOAD',
    label: 'Operational Satellites',
    badge: '🛰️',
    color: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.8)',
    description: 'Active Earth observation, weather & defense payloads'
  },
  TARGET: {
    key: 'TARGET',
    label: 'Selected Target',
    badge: '🎯',
    color: '#ffffff',
    glowColor: 'rgba(0, 240, 255, 1.0)',
    description: 'Active tracking target reticle'
  }
};

/**
 * Classify any orbital object or position into an icon category
 */
export function getOrbitalIconCategory(
  name: string = '',
  objectType?: string | ObjectType,
  noradId?: number
): OrbitalIconCategory {
  const nameUpper = name.toUpperCase();
  const typeStr = (typeof objectType === 'string' ? objectType : (objectType as any)?.value || '').toUpperCase();

  // 1. Specific Space Stations
  if (
    noradId === 25544 ||
    nameUpper.includes('ISS') ||
    nameUpper.includes('SPACE STATION') ||
    nameUpper.includes('TIANGONG') ||
    nameUpper.includes('CSS (TIANHE)')
  ) {
    return 'ISS';
  }

  // 2. Debris
  if (typeStr === 'DEBRIS' || nameUpper.includes('DEB') || nameUpper.includes('FRAGMENT')) {
    return 'DEBRIS';
  }

  // 3. Rocket Bodies
  if (
    typeStr === 'ROCKET_BODY' ||
    typeStr === 'ROCKET' ||
    nameUpper.includes(' R/B') ||
    nameUpper.includes('ROCKET') ||
    nameUpper.includes('FALCON 9 R/B') ||
    nameUpper.includes('CENTAUR') ||
    nameUpper.includes('BREEZE') ||
    nameUpper.includes('STAGE')
  ) {
    return 'ROCKET';
  }

  // 4. GPS / GNSS
  if (
    nameUpper.includes('GPS') ||
    nameUpper.includes('NAVSTAR') ||
    nameUpper.includes('GLONASS') ||
    nameUpper.includes('GALILEO') ||
    nameUpper.includes('BEIDOU') ||
    nameUpper.includes('QZSS') ||
    nameUpper.includes('IRNSS')
  ) {
    return 'GPS';
  }

  // 5. Starlink
  if (nameUpper.includes('STARLINK')) {
    return 'STARLINK';
  }

  // 6. OneWeb & Known Comm
  if (nameUpper.includes('ONEWEB') || nameUpper.includes('IRIDIUM') || nameUpper.includes('O3B')) {
    return 'ONEWEB';
  }

  // 7. Default Operational Payload
  return 'PAYLOAD';
}

/**
 * High-definition Canvas Generators for each Icon Category
 */

// 1. ROCKET ICON: Distinct multi-stage rocket with booster fins, fuselage bands, and thruster exhaust flame
export function drawRocketIcon(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128; // reference coordinate space 128x128

  ctx.save();
  ctx.translate(cx, cy);

  // Outer ambient glow
  const gradGlow = ctx.createRadialGradient(0, 0, 10 * s, 0, 0, 58 * s);
  gradGlow.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
  gradGlow.addColorStop(0.6, 'rgba(245, 158, 11, 0.15)');
  gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 58 * s, 0, Math.PI * 2);
  ctx.fill();

  // Thruster Flame (Exhaust plume with inner core)
  const flameGrad = ctx.createLinearGradient(0, 12 * s, 0, 48 * s);
  flameGrad.addColorStop(0, '#ffffff');
  flameGrad.addColorStop(0.2, '#fef08a');
  flameGrad.addColorStop(0.6, '#f97316');
  flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
  
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-7 * s, 16 * s);
  ctx.quadraticCurveTo(-14 * s, 32 * s, 0, 48 * s);
  ctx.quadraticCurveTo(14 * s, 32 * s, 7 * s, 16 * s);
  ctx.closePath();
  ctx.fill();

  // Rocket Body Fuselage
  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3 * s;

  // Main Cylinder
  ctx.beginPath();
  ctx.roundRect(-9 * s, -24 * s, 18 * s, 38 * s, [4 * s, 4 * s, 2 * s, 2 * s]);
  ctx.fill();
  ctx.stroke();

  // Aerodynamic Nose Cone Fairing
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -46 * s);
  ctx.quadraticCurveTo(-9 * s, -34 * s, -9 * s, -24 * s);
  ctx.lineTo(9 * s, -24 * s);
  ctx.quadraticCurveTo(9 * s, -34 * s, 0, -46 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Delta Stabilization Base Fins
  ctx.fillStyle = '#f59e0b';
  // Left fin
  ctx.beginPath();
  ctx.moveTo(-9 * s, 0);
  ctx.lineTo(-24 * s, 16 * s);
  ctx.lineTo(-9 * s, 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right fin
  ctx.beginPath();
  ctx.moveTo(9 * s, 0);
  ctx.lineTo(24 * s, 16 * s);
  ctx.lineTo(9 * s, 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Interstage banding rings
  ctx.fillStyle = '#d97706';
  ctx.fillRect(-9 * s, -14 * s, 18 * s, 3 * s);
  ctx.fillRect(-9 * s, -2 * s, 18 * s, 3 * s);

  // Engine Nozzle Bell
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(-7 * s, 14 * s);
  ctx.lineTo(-10 * s, 18 * s);
  ctx.lineTo(10 * s, 18 * s);
  ctx.lineTo(7 * s, 14 * s);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// 2. DEBRIS ICON: Multi-faceted shattered cluster / jagged fragmentation shard hazard
export function drawDebrisIcon(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  ctx.save();
  ctx.translate(cx, cy);

  // Hazard Red Radial Aura
  const gradGlow = ctx.createRadialGradient(0, 0, 6 * s, 0, 0, 56 * s);
  gradGlow.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
  gradGlow.addColorStop(0.5, 'rgba(220, 38, 38, 0.2)');
  gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 56 * s, 0, Math.PI * 2);
  ctx.fill();

  // Outer Shard 1 (Top Left)
  ctx.fillStyle = '#f87171';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(-18 * s, -32 * s);
  ctx.lineTo(-8 * s, -40 * s);
  ctx.lineTo(-4 * s, -24 * s);
  ctx.lineTo(-14 * s, -20 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Outer Shard 2 (Bottom Right)
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(22 * s, 16 * s);
  ctx.lineTo(36 * s, 26 * s);
  ctx.lineTo(24 * s, 34 * s);
  ctx.lineTo(14 * s, 22 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Outer Shard 3 (Bottom Left)
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.moveTo(-28 * s, 14 * s);
  ctx.lineTo(-14 * s, 28 * s);
  ctx.lineTo(-24 * s, 32 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main Central Jagged Rock / Impacted Mass
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-16 * s, -12 * s);
  ctx.lineTo(4 * s, -22 * s);
  ctx.lineTo(20 * s, -8 * s);
  ctx.lineTo(16 * s, 14 * s);
  ctx.lineTo(-2 * s, 20 * s);
  ctx.lineTo(-18 * s, 8 * s);
  ctx.closePath();
  ctx.fill();

  // Inner Dark Facets
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(-16 * s, -12 * s);
  ctx.lineTo(4 * s, -22 * s);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(4 * s, -22 * s);
  ctx.lineTo(20 * s, -8 * s);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(20 * s, -8 * s);
  ctx.lineTo(16 * s, 14 * s);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(16 * s, 14 * s);
  ctx.lineTo(-2 * s, 20 * s);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.moveTo(-2 * s, 20 * s);
  ctx.lineTo(-18 * s, 8 * s);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // Heavy Bright Contour
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(-16 * s, -12 * s);
  ctx.lineTo(4 * s, -22 * s);
  ctx.lineTo(20 * s, -8 * s);
  ctx.lineTo(16 * s, 14 * s);
  ctx.lineTo(-2 * s, 20 * s);
  ctx.lineTo(-18 * s, 8 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

// 3. GPS / GNSS ICON: Navigation satellite bus with cross-axis solar wings & radiating spherical RF broadcast arcs
export function drawGpsIcon(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  ctx.save();
  ctx.translate(cx, cy);

  // Emerald Beacon Glow
  const gradGlow = ctx.createRadialGradient(0, 0, 8 * s, 0, 0, 58 * s);
  gradGlow.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
  gradGlow.addColorStop(0.6, 'rgba(5, 150, 105, 0.15)');
  gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 58 * s, 0, Math.PI * 2);
  ctx.fill();

  // Radiating RF Spherical Signal Waves (Bottom Broadcast)
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.2 * s;

  for (let r = 18; r <= 42; r += 11) {
    ctx.beginPath();
    ctx.arc(0, 4 * s, r * s, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }

  // Left Large Solar Array Wing (with solar cells)
  ctx.fillStyle = '#064e3b';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(-46 * s, -11 * s, 32 * s, 22 * s, 2 * s);
  ctx.fill();
  ctx.stroke();

  // Left Solar Cell Dividers
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(-35 * s, -11 * s); ctx.lineTo(-35 * s, 11 * s);
  ctx.moveTo(-24 * s, -11 * s); ctx.lineTo(-24 * s, 11 * s);
  ctx.moveTo(-46 * s, 0); ctx.lineTo(-14 * s, 0);
  ctx.stroke();

  // Right Large Solar Array Wing
  ctx.fillStyle = '#064e3b';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(14 * s, -11 * s, 32 * s, 22 * s, 2 * s);
  ctx.fill();
  ctx.stroke();

  // Right Solar Cell Dividers
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(25 * s, -11 * s); ctx.lineTo(25 * s, 11 * s);
  ctx.moveTo(36 * s, -11 * s); ctx.lineTo(36 * s, 11 * s);
  ctx.moveTo(14 * s, 0); ctx.lineTo(46 * s, 0);
  ctx.stroke();

  // Solar Wing Connectors / Booms
  ctx.strokeStyle = '#a7f3d0';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(-14 * s, 0); ctx.lineTo(14 * s, 0);
  ctx.stroke();

  // Central Navigation Bus (Gold/White Foil Chassis)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.roundRect(-10 * s, -16 * s, 20 * s, 32 * s, 4 * s);
  ctx.fill();
  ctx.stroke();

  // Center L-Band Antenna Earth Deck
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(0, 4 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Top Atomic Clock / Sensor Mast
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(0, -16 * s); ctx.lineTo(0, -28 * s);
  ctx.stroke();
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(0, -28 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 4. STARLINK ICON: Distinctive flat-panel table-top bus with single continuous high-aspect solar array wing
export function drawStarlinkIcon(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  ctx.save();
  ctx.translate(cx, cy);

  // Purple Neon Glow
  const gradGlow = ctx.createRadialGradient(0, 0, 8 * s, 0, 0, 56 * s);
  gradGlow.addColorStop(0, 'rgba(192, 132, 252, 0.45)');
  gradGlow.addColorStop(0.6, 'rgba(147, 51, 234, 0.15)');
  gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 56 * s, 0, Math.PI * 2);
  ctx.fill();

  // Single Upward Articulated Solar Panel Wing (Starlink signature)
  ctx.fillStyle = '#3b0764';
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(-9 * s, -46 * s, 18 * s, 38 * s, 2 * s);
  ctx.fill();
  ctx.stroke();

  // Solar Panel Segments
  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 1 * s;
  for (let y = -38; y <= -14; y += 8) {
    ctx.beginPath();
    ctx.moveTo(-9 * s, y * s); ctx.lineTo(9 * s, y * s);
    ctx.stroke();
  }

  // Starlink Flat-Panel Main Chassis
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.roundRect(-22 * s, -6 * s, 44 * s, 14 * s, 3 * s);
  ctx.fill();
  ctx.stroke();

  // Phased Array Antenna Grid on bottom face
  ctx.fillStyle = '#a855f7';
  for (let x = -16; x <= 16; x += 8) {
    ctx.beginPath();
    ctx.arc(x * s, 1 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Krypton/Argon Ion Thruster Nozzle
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 10 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 5. ONEWEB / COMM ICON: Dual high-gain solar wings + twin parabolic dish antennas
export function drawOneWebIcon(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  ctx.save();
  ctx.translate(cx, cy);

  // Pure White/Silver Starburst Glow
  const gradGlow = ctx.createRadialGradient(0, 0, 8 * s, 0, 0, 56 * s);
  gradGlow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
  gradGlow.addColorStop(0.5, 'rgba(226, 232, 240, 0.2)');
  gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 56 * s, 0, Math.PI * 2);
  ctx.fill();

  // Left Solar Array Wing
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(-46 * s, -9 * s, 30 * s, 18 * s, 2 * s);
  ctx.fill();
  ctx.stroke();

  // Right Solar Array Wing
  ctx.beginPath();
  ctx.roundRect(16 * s, -9 * s, 30 * s, 18 * s, 2 * s);
  ctx.fill();
  ctx.stroke();

  // Solar Grid Lines
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(-31 * s, -9 * s); ctx.lineTo(-31 * s, 9 * s);
  ctx.moveTo(31 * s, -9 * s); ctx.lineTo(31 * s, 9 * s);
  ctx.stroke();

  // Center Satellite Body
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(-10 * s, -12 * s, 20 * s, 24 * s, 3 * s);
  ctx.fill();
  ctx.stroke();

  // Top Parabolic Comm Dish Antenna
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(0, -18 * s, 8 * s, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -12 * s); ctx.lineTo(0, -18 * s);
  ctx.stroke();

  // Bottom Earth Sensor Lens
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 6 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 6. OPERATIONAL SATELLITE / PAYLOAD ICON: Classic satellite with dual blue solar arrays & Earth-pointing optics
export function drawPayloadIcon(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  ctx.save();
  ctx.translate(cx, cy);

  // Cyan Neon Halo
  const gradGlow = ctx.createRadialGradient(0, 0, 8 * s, 0, 0, 58 * s);
  gradGlow.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
  gradGlow.addColorStop(0.6, 'rgba(14, 165, 233, 0.15)');
  gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 58 * s, 0, Math.PI * 2);
  ctx.fill();

  // Dual Wide Solar Panels
  ctx.fillStyle = '#082f49';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2 * s;

  // Left panel
  ctx.beginPath();
  ctx.roundRect(-48 * s, -14 * s, 34 * s, 28 * s, 3 * s);
  ctx.fill();
  ctx.stroke();

  // Right panel
  ctx.beginPath();
  ctx.roundRect(14 * s, -14 * s, 34 * s, 28 * s, 3 * s);
  ctx.fill();
  ctx.stroke();

  // Panel Blue Silicon Cell Grids
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(-36 * s, -14 * s); ctx.lineTo(-36 * s, 14 * s);
  ctx.moveTo(-25 * s, -14 * s); ctx.lineTo(-25 * s, 14 * s);
  ctx.moveTo(-48 * s, 0); ctx.lineTo(-14 * s, 0);

  ctx.moveTo(25 * s, -14 * s); ctx.lineTo(25 * s, 14 * s);
  ctx.moveTo(36 * s, -14 * s); ctx.lineTo(36 * s, 14 * s);
  ctx.moveTo(14 * s, 0); ctx.lineTo(48 * s, 0);
  ctx.stroke();

  // Panel Booms
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(-14 * s, 0); ctx.lineTo(14 * s, 0);
  ctx.stroke();

  // Central Gold-Foil / White Satellite Core Chassis
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.roundRect(-10 * s, -15 * s, 20 * s, 30 * s, 4 * s);
  ctx.fill();
  ctx.stroke();

  // Optical Aperture / Camera Lens (Center)
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(0, 0, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Parabolic Top Dish
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(0, -20 * s, 7 * s, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -15 * s); ctx.lineTo(0, -20 * s);
  ctx.stroke();

  ctx.restore();
}

// 7. ISS / SPACE STATION ICON: Pressurized modules, integrated truss structure & 4 pairs of giant solar wings
export function drawIssIcon(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  ctx.save();
  ctx.translate(cx, cy);

  // High-Energy Blue Aurora
  const gradGlow = ctx.createRadialGradient(0, 0, 10 * s, 0, 0, 60 * s);
  gradGlow.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
  gradGlow.addColorStop(0.6, 'rgba(14, 165, 233, 0.2)');
  gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 60 * s, 0, Math.PI * 2);
  ctx.fill();

  // Integrated Main Truss Backbone (Horizontal)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.moveTo(-50 * s, 0); ctx.lineTo(50 * s, 0);
  ctx.stroke();

  // 4 Pairs of Solar Array Wings (Gold/Amber Solar Cell Silicon)
  const drawSolarPair = (xOffset: number) => {
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8 * s;

    // Top array
    ctx.beginPath();
    ctx.roundRect((xOffset - 7) * s, -38 * s, 14 * s, 30 * s, 2 * s);
    ctx.fill();
    ctx.stroke();

    // Bottom array
    ctx.beginPath();
    ctx.roundRect((xOffset - 7) * s, 8 * s, 14 * s, 30 * s, 2 * s);
    ctx.fill();
    ctx.stroke();

    // Cell divisions
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1 * s;
    for (let y = -32; y <= -14; y += 6) {
      ctx.beginPath();
      ctx.moveTo((xOffset - 7) * s, y * s); ctx.lineTo((xOffset + 7) * s, y * s);
      ctx.stroke();
    }
    for (let y = 14; y <= 32; y += 6) {
      ctx.beginPath();
      ctx.moveTo((xOffset - 7) * s, y * s); ctx.lineTo((xOffset + 7) * s, y * s);
      ctx.stroke();
    }
  };

  drawSolarPair(-42);
  drawSolarPair(-24);
  drawSolarPair(24);
  drawSolarPair(42);

  // Central Pressurized Habitation Modules (Destiny, Zvezda, Zarya, Kibo)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.roundRect(-6 * s, -18 * s, 12 * s, 36 * s, 3 * s);
  ctx.fill();
  ctx.stroke();

  // Radiator Panels (White rectangular heat rejection fins)
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.roundRect(-10 * s, -7 * s, 6 * s, 14 * s, 1 * s);
  ctx.roundRect(4 * s, -7 * s, 6 * s, 14 * s, 1 * s);
  ctx.fill();
  ctx.stroke();

  // Cupola Observation Dome (Cyan glass highlight)
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath();
  ctx.arc(0, 10 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 8. TARGET LOCK RETICLE: Futuristic aerospace HUD bracket with pulsing corner tick marks
export function drawTargetReticle(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  ctx.save();
  ctx.translate(cx, cy);

  // Glowing Outer Lock Ring
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.5 * s;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12 * s;

  ctx.beginPath();
  ctx.arc(0, 0, 36 * s, 0, Math.PI * 2);
  ctx.stroke();

  // 4 Corner Brackets
  const bDist = 44 * s;
  const bLen = 14 * s;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5 * s;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8 * s;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(-bDist + bLen, -bDist);
  ctx.lineTo(-bDist, -bDist);
  ctx.lineTo(-bDist, -bDist + bLen);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(bDist - bLen, -bDist);
  ctx.lineTo(bDist, -bDist);
  ctx.lineTo(bDist, -bDist + bLen);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(-bDist + bLen, bDist);
  ctx.lineTo(-bDist, bDist);
  ctx.lineTo(-bDist, bDist - bLen);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(bDist - bLen, bDist);
  ctx.lineTo(bDist, bDist);
  ctx.lineTo(bDist, bDist - bLen);
  ctx.stroke();

  // Center Crosshair Dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 4 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Three.js CanvasTexture Cache for all Categories
 */
const textureCache = new Map<OrbitalIconCategory, THREE.CanvasTexture>();
const dataUrlCache = new Map<OrbitalIconCategory, string>();

export function getOrbitalCanvasTexture(category: OrbitalIconCategory, size: number = 128): THREE.CanvasTexture {
  if (textureCache.has(category)) {
    return textureCache.get(category)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  switch (category) {
    case 'ROCKET':
      drawRocketIcon(ctx, size);
      break;
    case 'DEBRIS':
      drawDebrisIcon(ctx, size);
      break;
    case 'GPS':
      drawGpsIcon(ctx, size);
      break;
    case 'STARLINK':
      drawStarlinkIcon(ctx, size);
      break;
    case 'ONEWEB':
      drawOneWebIcon(ctx, size);
      break;
    case 'ISS':
      drawIssIcon(ctx, size);
      break;
    case 'TARGET':
      drawTargetReticle(ctx, size);
      break;
    case 'PAYLOAD':
    default:
      drawPayloadIcon(ctx, size);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  textureCache.set(category, texture);
  dataUrlCache.set(category, canvas.toDataURL());

  return texture;
}

/**
 * Get Data URL icon for UI components, tooltips and tables
 */
export function getOrbitalIconDataUrl(category: OrbitalIconCategory, size: number = 64): string {
  if (dataUrlCache.has(category)) {
    return dataUrlCache.get(category)!;
  }
  // Populate cache
  getOrbitalCanvasTexture(category, size);
  return dataUrlCache.get(category) || '';
}
