import os
import math

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

def generate_catalog():
    tles = []

    # 1. Flagship Space Stations & Earth Observatories
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

    # Close Approach Conjunction Pair (Starlink-1007 & Starlink-1019)
    tles.append(make_tle("STARLINK-1007", 44713, 53.0534, 110.4562, 0.0001420, 80.1245, 280.1245, 15.06450000))
    tles.append(make_tle("STARLINK-1019", 44725, 53.0540, 110.4650, 0.0001435, 80.1300, 280.1100, 15.06450000))

    # 2. Starlink Constellation (80 Satellites)
    for i in range(1, 81):
        norad = 44700 + i
        if norad in (44713, 44725):
            continue
        raan = (i * 4.5) % 360.0
        ma = (i * 12.3) % 360.0
        tles.append(make_tle(f"STARLINK-{1000 + i}", norad, 53.05, raan, 0.00014, 80.0, ma, 15.0645))

    # 3. OneWeb Constellation (40 Satellites)
    for i in range(1, 41):
        norad = 45000 + i
        raan = (i * 9.0) % 360.0
        ma = (i * 18.0) % 360.0
        tles.append(make_tle(f"ONEWEB-{i:03d}", norad, 87.9, raan, 0.0012, 90.0, ma, 13.1000))

    # 4. Cosmos-2251 Collision Debris Cloud (60 Fragments)
    for i in range(1, 61):
        norad = 33800 + i
        inc = 74.0 + (i % 5) * 0.2
        raan = (i * 6.0) % 360.0
        ecc = 0.001 + (i % 10) * 0.002
        mm = 14.2 + (i % 8) * 0.15
        tles.append(make_tle(f"COSMOS 2251 DEBRIS #{i}", norad, inc, raan, ecc, 120.0, (i * 23.0) % 360, mm))

    # 5. Fengyun-1C ASAT Debris Cloud (60 Fragments)
    for i in range(1, 61):
        norad = 31200 + i
        inc = 98.6 + (i % 4) * 0.15
        raan = (i * 5.8) % 360.0
        ecc = 0.002 + (i % 12) * 0.003
        mm = 13.8 + (i % 10) * 0.12
        tles.append(make_tle(f"FENGYUN 1C DEBRIS #{i}", norad, inc, raan, ecc, 140.0, (i * 31.0) % 360, mm))

    # 6. Iridium 33 Debris Cloud (30 Fragments)
    for i in range(1, 31):
        norad = 34200 + i
        inc = 86.4 + (i % 3) * 0.2
        raan = (i * 11.5) % 360.0
        ecc = 0.002 + (i % 8) * 0.002
        mm = 14.3 + (i % 6) * 0.1
        tles.append(make_tle(f"IRIDIUM 33 DEBRIS #{i}", norad, inc, raan, ecc, 45.0, (i * 19.0) % 360, mm))

    # 7. Spent Rocket Bodies (35 Rocket Bodies)
    rocket_models = ["FALCON 9 R/B", "CZ-4C R/B", "SL-16 R/B", "CENTAUR R/B", "DELTA 4 R/B", "ARIANE 5 R/B", "PSLV R/B", "GSLV R/B"]
    for i in range(1, 36):
        norad = 26000 + i
        model = rocket_models[i % len(rocket_models)]
        inc = 45.0 + (i % 8) * 7.5
        raan = (i * 10.2) % 360.0
        ecc = 0.005 + (i % 15) * 0.004
        mm = 14.0 + (i % 7) * 0.18
        tles.append(make_tle(f"{model} [STAGE-{i}]", norad, inc, raan, ecc, 180.0, (i * 27.0) % 360, mm))

    # 8. GPS / Navigation Constellation (MEO) (24 Satellites)
    for i in range(1, 25):
        norad = 28000 + i
        raan = (i * 15.0) % 360.0
        ma = (i * 30.0) % 360.0
        tles.append(make_tle(f"NAVSTAR GPS #{i} (USA-{100+i})", norad, 55.0, raan, 0.005, 45.0, ma, 2.0056))

    # 9. Galileo Navigation Constellation (MEO) (18 Satellites)
    for i in range(1, 19):
        norad = 37000 + i
        raan = (i * 20.0) % 360.0
        ma = (i * 40.0) % 360.0
        tles.append(make_tle(f"GSAT {i:04d} (GALILEO-{i})", norad, 56.0, raan, 0.0003, 60.0, ma, 1.7047))

    return "\n".join(tles)

if __name__ == "__main__":
    content = generate_catalog()
    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "cache", "celestrak_sample.tle"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    # Also write to root data/cache
    root_out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "cache", "celestrak_sample.tle"))
    os.makedirs(os.path.dirname(root_out), exist_ok=True)
    with open(root_out, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated {len(content.strip().splitlines()) // 3} orbital objects in {out_path} and {root_out}")
