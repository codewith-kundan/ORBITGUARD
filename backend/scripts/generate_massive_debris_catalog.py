import os
import random

def compute_checksum(line: str) -> str:
    line_68 = line[:68]
    val = 0
    for c in line_68:
        if c.isdigit():
            val += int(c)
        elif c == '-':
            val += 1
    return f"{line_68}{val % 10}"

def make_tle(name: str, norad: int, inc: float, raan: float, ecc: float, argp: float, ma: float, mm: float, epoch_days: float = 236.5, bstar: str = " 10000-4") -> str:
    norad_str = f"{norad:5d}"
    inc_str = f"{inc:8.4f}"
    raan_str = f"{raan:8.4f}"
    ecc_str = f"{int(ecc * 10000000):07d}"
    argp_str = f"{argp:8.4f}"
    ma_str = f"{ma:8.4f}"
    mm_str = f"{mm:11.8f}"
    epoch_str = f"26{epoch_days:012.8f}"

    line1_raw = f"1 {norad_str}U 20001A   {epoch_str}  .00001000  00000+0 {bstar} 0  999"
    line1 = compute_checksum(line1_raw)

    line2_raw = f"2 {norad_str} {inc_str} {raan_str} {ecc_str} {argp_str} {ma_str} {mm_str}00001"
    line2 = compute_checksum(line2_raw)

    return f"{name}\n{line1}\n{line2}"

def generate_massive_catalog():
    tles = []
    random.seed(42)

    # 1. Primary International Space Stations & Observatories
    tles.append(make_tle("ISS (ZARYA)", 25544, 51.6416, 182.2582, 0.0005423, 94.3982, 22.8423, 15.49842105))
    tles.append(make_tle("TIANGONG (CSS)", 48274, 41.4723, 150.8123, 0.0003500, 75.2341, 285.1245, 15.62500000))
    tles.append(make_tle("HST (HUBBLE)", 20580, 28.4695, 245.1234, 0.0002845, 320.1234, 140.5678, 15.09245678))
    tles.append(make_tle("CHANDRAYAAN-2 ORBITER", 44441, 90.0000, 45.0000, 0.0012000, 120.0000, 240.0000, 12.50000000))
    tles.append(make_tle("CARTOSAT-3", 44804, 97.5000, 110.0000, 0.0015000, 80.0000, 280.0000, 15.18000000))
    tles.append(make_tle("RISAT-2B", 44262, 37.0000, 160.0000, 0.0011000, 95.0000, 265.0000, 15.22000000))
    tles.append(make_tle("OCEANSAT-3", 54361, 98.2000, 130.0000, 0.0014000, 70.0000, 290.0000, 14.85000000))
    tles.append(make_tle("ENVISAT", 27386, 98.5400, 205.1200, 0.0001200, 85.1200, 275.1200, 14.38000000))
    tles.append(make_tle("TERRA", 25994, 98.1980, 142.3400, 0.0001450, 65.1200, 295.1200, 14.57000000))
    tles.append(make_tle("AQUA", 27424, 98.2010, 143.1200, 0.0001480, 66.4500, 294.1000, 14.57100000))
    tles.append(make_tle("NOAA 19", 33591, 98.7120, 70.2310, 0.0014000, 110.1200, 250.3400, 14.12000000))
    tles.append(make_tle("NOAA 20", 43013, 98.7400, 85.1200, 0.0013000, 115.0000, 245.0000, 14.19000000))
    tles.append(make_tle("LANDSAT 8", 39084, 98.2100, 160.1200, 0.0001500, 70.1200, 290.1200, 14.57100000))
    tles.append(make_tle("LANDSAT 9", 49260, 98.2200, 165.0000, 0.0001400, 72.0000, 288.0000, 14.57100000))
    tles.append(make_tle("SENTINEL-1A", 39634, 98.1800, 175.4500, 0.0001300, 80.4500, 280.1200, 14.59000000))
    tles.append(make_tle("SENTINEL-2A", 40697, 98.5700, 190.0000, 0.0001100, 90.0000, 270.0000, 14.31000000))
    tles.append(make_tle("SENTINEL-3A", 41335, 98.6300, 215.0000, 0.0001000, 100.0000, 260.0000, 14.28000000))

    # Close Approach Conjunction Pair
    tles.append(make_tle("STARLINK-1007", 44713, 53.0534, 110.4562, 0.0001420, 80.1245, 280.1245, 15.06450000))
    tles.append(make_tle("STARLINK-1019", 44725, 53.0540, 110.4650, 0.0001435, 80.1300, 280.1100, 15.06450000))

    # 2. Cosmos-2251 Collision Debris Field (1,200 Fragments)
    for i in range(1, 1201):
        norad = 33800 + i
        inc = 74.0 + random.uniform(-2.5, 2.5)
        raan = random.uniform(0, 360)
        ecc = random.uniform(0.001, 0.045)
        mm = 14.0 + random.uniform(-0.8, 1.2)
        argp = random.uniform(0, 360)
        ma = random.uniform(0, 360)
        tles.append(make_tle(f"COSMOS 2251 DEBRIS #{i}", norad, inc, raan, ecc, argp, ma, mm))

    # 3. Fengyun-1C ASAT Intercept Debris Cloud (1,200 Fragments)
    for i in range(1, 1201):
        norad = 31200 + i
        inc = 98.6 + random.uniform(-3.0, 3.0)
        raan = random.uniform(0, 360)
        ecc = random.uniform(0.002, 0.060)
        mm = 13.5 + random.uniform(-0.9, 1.5)
        argp = random.uniform(0, 360)
        ma = random.uniform(0, 360)
        tles.append(make_tle(f"FENGYUN 1C DEBRIS #{i}", norad, inc, raan, ecc, argp, ma, mm))

    # 4. Iridium 33 Collision Debris Cloud (600 Fragments)
    for i in range(1, 601):
        norad = 34300 + i
        inc = 86.4 + random.uniform(-2.0, 2.0)
        raan = random.uniform(0, 360)
        ecc = random.uniform(0.001, 0.035)
        mm = 14.2 + random.uniform(-0.6, 0.8)
        argp = random.uniform(0, 360)
        ma = random.uniform(0, 360)
        tles.append(make_tle(f"IRIDIUM 33 DEBRIS #{i}", norad, inc, raan, ecc, argp, ma, mm))

    # 5. Cosmos 1408 Anti-Satellite Debris Field (600 Fragments)
    for i in range(1, 601):
        norad = 49900 + i
        inc = 82.5 + random.uniform(-2.0, 2.0)
        raan = random.uniform(0, 360)
        ecc = random.uniform(0.002, 0.040)
        mm = 15.0 + random.uniform(-0.8, 0.9)
        argp = random.uniform(0, 360)
        ma = random.uniform(0, 360)
        tles.append(make_tle(f"COSMOS 1408 DEBRIS #{i}", norad, inc, raan, ecc, argp, ma, mm))

    # 6. Spent Rocket Bodies (Upper Stages) (400 Rocket Bodies)
    rocket_types = [
        "FALCON 9 R/B", "CZ-4C R/B", "SL-16 R/B", "CENTAUR R/B",
        "DELTA 4 R/B", "ARIANE 5 R/B", "PSLV R/B", "GSLV R/B",
        "TITAN 3C R/B", "H-2A R/B", "ATLAS 5 R/B", "SOYUZ R/B"
    ]
    for i in range(1, 401):
        norad = 26100 + i
        model = rocket_types[i % len(rocket_types)]
        inc = random.choice([28.5, 45.0, 51.6, 63.4, 74.0, 98.2, 98.7]) + random.uniform(-0.5, 0.5)
        raan = random.uniform(0, 360)
        ecc = random.uniform(0.003, 0.080)
        mm = random.uniform(13.0, 15.6)
        argp = random.uniform(0, 360)
        ma = random.uniform(0, 360)
        tles.append(make_tle(f"{model} [NORAD-{norad}]", norad, inc, raan, ecc, argp, ma, mm))

    # 7. Mega Constellations & Satellites (1,000 Satellites)
    for i in range(1, 601):
        norad = 45500 + i
        raan = (i * 2.4) % 360.0
        ma = (i * 8.7) % 360.0
        tles.append(make_tle(f"STARLINK-{2000 + i}", norad, 53.2, raan, 0.00015, 80.0, ma, 15.0645))

    for i in range(1, 401):
        norad = 46500 + i
        raan = (i * 3.6) % 360.0
        ma = (i * 11.2) % 360.0
        tles.append(make_tle(f"ONEWEB-{100 + i:04d}", norad, 87.9, raan, 0.00120, 90.0, ma, 13.1000))

    return "\n".join(tles)

if __name__ == "__main__":
    content = generate_massive_catalog()
    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "cache", "celestrak_sample.tle"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    root_out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "cache", "celestrak_sample.tle"))
    os.makedirs(os.path.dirname(root_out), exist_ok=True)
    with open(root_out, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Generated {len(content.strip().splitlines()) // 3} orbital objects in {out_path} and {root_out}")
