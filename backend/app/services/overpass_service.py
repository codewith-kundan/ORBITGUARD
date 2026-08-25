import math
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sgp4.api import Satrec, jday

from backend.app.models.orbital_object import OrbitalObject
from backend.app.schemas.overpass import (
    GroundStation,
    SkyPoint,
    OverpassEvent,
    OverpassResponse,
    GroundTrackRibbonPoint,
    GroundTrackResponse
)
from backend.app.services.propagation_service import (
    teme_to_ecef,
    ecef_to_geodetic,
    WGS84_A,
    WGS84_B,
    WGS84_E2,
    PropagationService
)
from backend.app.utils.time_utils import datetime_to_jd, gmst_from_jd

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0

# Predefined Global Ground Stations (ISRO, NASA, ESA, JAXA, CNES, DLR, KSAT, DSN, SANSA)
PREDEFINED_STATIONS: List[GroundStation] = [
    # India (ISRO / ISTRAC)
    GroundStation(id="isro_istrac", name="ISRO ISTRAC (Bengaluru, India)", country="India", latitude_deg=13.034, longitude_deg=77.512, altitude_m=920.0, min_elevation_deg=5.0),
    GroundStation(id="isro_shar", name="ISRO SDSC SHAR (Sriharikota, India)", country="India", latitude_deg=13.733, longitude_deg=80.235, altitude_m=20.0, min_elevation_deg=5.0),
    GroundStation(id="isro_lucknow", name="ISRO Ground Station (Lucknow, India)", country="India", latitude_deg=26.846, longitude_deg=80.946, altitude_m=123.0, min_elevation_deg=5.0),
    GroundStation(id="isro_portblair", name="ISRO Telemetry Station (Port Blair, Andaman)", country="India", latitude_deg=11.623, longitude_deg=92.726, altitude_m=16.0, min_elevation_deg=5.0),
    GroundStation(id="isro_byalalu", name="ISRO Deep Space Network IDSN (Byalalu, India)", country="India", latitude_deg=12.875, longitude_deg=77.368, altitude_m=815.0, min_elevation_deg=5.0),
    GroundStation(id="isro_mauritius", name="ISRO Tracking Station (Mauritius)", country="Mauritius", latitude_deg=-20.244, longitude_deg=57.574, altitude_m=420.0, min_elevation_deg=5.0),
    GroundStation(id="isro_svalbard", name="ISRO Ground Station Svalbard (Norway)", country="Norway", latitude_deg=78.223, longitude_deg=15.407, altitude_m=450.0, min_elevation_deg=5.0),
    GroundStation(id="isro_antarctica", name="ISRO AGEOS Bharati Station (Antarctica)", country="Antarctica", latitude_deg=-69.407, longitude_deg=76.187, altitude_m=35.0, min_elevation_deg=5.0),

    # United States (NASA, DSN, Space Force)
    GroundStation(id="nasa_ksc", name="NASA Kennedy Space Center (Florida, USA)", country="USA", latitude_deg=28.572, longitude_deg=-80.649, altitude_m=3.0, min_elevation_deg=5.0),
    GroundStation(id="dsn_goldstone", name="NASA DSN Goldstone (California, USA)", country="USA", latitude_deg=35.426, longitude_deg=-116.890, altitude_m=1036.0, min_elevation_deg=5.0),
    GroundStation(id="nasa_gsfc", name="NASA Goddard Space Flight Center (Maryland, USA)", country="USA", latitude_deg=38.991, longitude_deg=-76.852, altitude_m=53.0, min_elevation_deg=5.0),
    GroundStation(id="nasa_jsc", name="NASA Johnson Space Center (Houston, USA)", country="USA", latitude_deg=29.559, longitude_deg=-95.089, altitude_m=5.0, min_elevation_deg=5.0),
    GroundStation(id="vandenberg_sfb", name="Vandenberg Space Force Base (California, USA)", country="USA", latitude_deg=34.756, longitude_deg=-120.542, altitude_m=112.0, min_elevation_deg=5.0),
    GroundStation(id="nasa_wff", name="NASA Wallops Flight Facility (Virginia, USA)", country="USA", latitude_deg=37.940, longitude_deg=-75.466, altitude_m=12.0, min_elevation_deg=5.0),
    GroundStation(id="nasa_wsc", name="NASA White Sands Complex (New Mexico, USA)", country="USA", latitude_deg=32.541, longitude_deg=-106.609, altitude_m=1445.0, min_elevation_deg=5.0),
    GroundStation(id="amos_maui", name="Air Force AMOS Maui (Hawaii, USA)", country="USA", latitude_deg=20.708, longitude_deg=-156.258, altitude_m=3058.0, min_elevation_deg=5.0),
    GroundStation(id="poker_flat", name="Poker Flat Research Range (Alaska, USA)", country="USA", latitude_deg=65.119, longitude_deg=-147.433, altitude_m=200.0, min_elevation_deg=5.0),

    # Europe (ESA, CNES, DLR)
    GroundStation(id="esa_esoc", name="ESA ESOC (Darmstadt, Germany)", country="Germany", latitude_deg=49.871, longitude_deg=8.623, altitude_m=140.0, min_elevation_deg=5.0),
    GroundStation(id="dsn_madrid", name="NASA/ESA DSN Madrid (Robledo, Spain)", country="Spain", latitude_deg=40.427, longitude_deg=-4.249, altitude_m=834.0, min_elevation_deg=5.0),
    GroundStation(id="esa_kiruna", name="ESA ESTRACK Kiruna (Sweden)", country="Sweden", latitude_deg=67.857, longitude_deg=20.964, altitude_m=380.0, min_elevation_deg=5.0),
    GroundStation(id="cnes_toulouse", name="CNES Space Centre (Toulouse, France)", country="France", latitude_deg=43.428, longitude_deg=1.498, altitude_m=150.0, min_elevation_deg=5.0),
    GroundStation(id="esa_redu", name="ESA ESEC Redu (Belgium)", country="Belgium", latitude_deg=50.000, longitude_deg=5.145, altitude_m=380.0, min_elevation_deg=5.0),
    GroundStation(id="dlr_oberpfaffenhofen", name="DLR German Space Ops GSOC (Germany)", country="Germany", latitude_deg=48.083, longitude_deg=11.283, altitude_m=580.0, min_elevation_deg=5.0),
    GroundStation(id="esa_santa_maria", name="ESA ESTRACK Santa Maria (Azores, Portugal)", country="Portugal", latitude_deg=36.997, longitude_deg=-25.136, altitude_m=275.0, min_elevation_deg=5.0),
    GroundStation(id="esa_harwell", name="ESA ECSAT / Harwell (Oxfordshire, UK)", country="UK", latitude_deg=51.572, longitude_deg=-1.314, altitude_m=120.0, min_elevation_deg=5.0),

    # South America & Caribbean
    GroundStation(id="esa_kourou", name="ESA ESTRACK Kourou (French Guiana)", country="France", latitude_deg=5.251, longitude_deg=-52.805, altitude_m=15.0, min_elevation_deg=5.0),
    GroundStation(id="santiago_chile", name="Santiago Satellite Station (Santiago, Chile)", country="Chile", latitude_deg=-33.150, longitude_deg=-70.667, altitude_m=730.0, min_elevation_deg=5.0),
    GroundStation(id="alcantara_brazil", name="Alcântara Space Center (Maranhão, Brazil)", country="Brazil", latitude_deg=-2.373, longitude_deg=-44.396, altitude_m=10.0, min_elevation_deg=5.0),

    # Australia & Oceania
    GroundStation(id="dsn_canberra", name="NASA DSN Canberra (Tidbinbilla, Australia)", country="Australia", latitude_deg=-35.401, longitude_deg=148.981, altitude_m=650.0, min_elevation_deg=5.0),
    GroundStation(id="esa_new_norcia", name="ESA Deep Space DSA 1 (New Norcia, Australia)", country="Australia", latitude_deg=-31.048, longitude_deg=116.191, altitude_m=252.0, min_elevation_deg=5.0),
    GroundStation(id="woomera_australia", name="Woomera Test Range (South Australia)", country="Australia", latitude_deg=-31.168, longitude_deg=136.826, altitude_m=168.0, min_elevation_deg=5.0),

    # Asia & Middle East
    GroundStation(id="jaxa_tsukuba", name="JAXA Tsukuba Space Center (Japan)", country="Japan", latitude_deg=36.066, longitude_deg=140.128, altitude_m=30.0, min_elevation_deg=5.0),
    GroundStation(id="jaxa_tanegashima", name="JAXA Tanegashima Space Center (Japan)", country="Japan", latitude_deg=30.400, longitude_deg=131.003, altitude_m=40.0, min_elevation_deg=5.0),
    GroundStation(id="kari_daejeon", name="KARI Korea Satellite Ops (Daejeon, South Korea)", country="South Korea", latitude_deg=36.381, longitude_deg=127.358, altitude_m=75.0, min_elevation_deg=5.0),
    GroundStation(id="singapore_crisp", name="CRISP Satellite Station (Singapore)", country="Singapore", latitude_deg=1.297, longitude_deg=103.777, altitude_m=25.0, min_elevation_deg=5.0),

    # Africa & Arctic / Antarctic Poles
    GroundStation(id="sansa_hart", name="SANSA Space Operations (Hartebeesthoek, South Africa)", country="South Africa", latitude_deg=-25.887, longitude_deg=27.707, altitude_m=1560.0, min_elevation_deg=5.0),
    GroundStation(id="malindi_kenya", name="Broglio Space Centre (Malindi, Kenya)", country="Kenya", latitude_deg=-2.996, longitude_deg=40.194, altitude_m=10.0, min_elevation_deg=5.0),
    GroundStation(id="ksat_svalbard", name="KSAT Svalbard Satellite Station (Svalbard, Norway)", country="Norway", latitude_deg=78.229, longitude_deg=15.407, altitude_m=470.0, min_elevation_deg=5.0),
    GroundStation(id="ksat_tromso", name="KSAT Tromsø Network Station (Norway)", country="Norway", latitude_deg=69.662, longitude_deg=18.940, altitude_m=130.0, min_elevation_deg=5.0),
    GroundStation(id="mcmurdo_antarctica", name="NASA McMurdo Ground Station (Antarctica)", country="Antarctica", latitude_deg=-77.846, longitude_deg=166.668, altitude_m=40.0, min_elevation_deg=5.0),
    GroundStation(id="troll_antarctica", name="KSAT TrollSat Station (Queen Maud Land, Antarctica)", country="Antarctica", latitude_deg=-72.012, longitude_deg=2.534, altitude_m=1275.0, min_elevation_deg=5.0)
]


class OverpassService:
    @staticmethod
    def get_predefined_stations() -> List[GroundStation]:
        return PREDEFINED_STATIONS

    @staticmethod
    def _observer_to_ecef(lat_deg: float, lon_deg: float, alt_m: float) -> Tuple[float, float, float]:
        """Converts observer geodetic position to ECEF (km)."""
        lat_rad = math.radians(lat_deg)
        lon_rad = math.radians(lon_deg)
        alt_km = alt_m / 1000.0

        sin_lat = math.sin(lat_rad)
        cos_lat = math.cos(lat_rad)
        sin_lon = math.sin(lon_rad)
        cos_lon = math.cos(lon_rad)

        N = WGS84_A / math.sqrt(1.0 - WGS84_E2 * sin_lat * sin_lat)

        x = (N + alt_km) * cos_lat * cos_lon
        y = (N + alt_km) * cos_lat * sin_lon
        z = (N * (1.0 - WGS84_E2) + alt_km) * sin_lat
        return x, y, z

    @staticmethod
    def _calculate_topocentric_az_el(
        sat_ecef: Tuple[float, float, float],
        obs_ecef: Tuple[float, float, float],
        obs_lat_deg: float,
        obs_lon_deg: float
    ) -> Tuple[float, float, float]:
        """
        Computes Topocentric (East, North, Up) coordinates, Azimuth, Elevation, and Range.
        Returns: (azimuth_deg [0, 360], elevation_deg [-90, 90], range_km).
        """
        rx = sat_ecef[0] - obs_ecef[0]
        ry = sat_ecef[1] - obs_ecef[1]
        rz = sat_ecef[2] - obs_ecef[2]

        lat_rad = math.radians(obs_lat_deg)
        lon_rad = math.radians(obs_lon_deg)
        sin_lat = math.sin(lat_rad)
        cos_lat = math.cos(lat_rad)
        sin_lon = math.sin(lon_rad)
        cos_lon = math.cos(lon_rad)

        # Rotate ECEF vector to Topocentric ENU Frame
        east = -sin_lon * rx + cos_lon * ry
        north = -sin_lat * cos_lon * rx - sin_lat * sin_lon * ry + cos_lat * rz
        up = cos_lat * cos_lon * rx + cos_lat * sin_lon * ry + sin_lat * rz

        range_km = math.sqrt(east * east + north * north + up * up)
        if range_km < 1e-4:
            return 0.0, 90.0, 0.0

        elevation_rad = math.asin(max(-1.0, min(1.0, up / range_km)))
        elevation_deg = math.degrees(elevation_rad)

        azimuth_rad = math.atan2(east, north)
        azimuth_deg = (math.degrees(azimuth_rad) + 360.0) % 360.0

        return round(azimuth_deg, 2), round(elevation_deg, 2), round(range_km, 2)

    @staticmethod
    def _calculate_sun_position_ecef(time_utc: datetime) -> Tuple[Tuple[float, float, float], float, float]:
        """
        Computes Sun position in ECEF and Sun sub-solar point (lat, lon).
        """
        jd, frac = jday(time_utc.year, time_utc.month, time_utc.day, time_utc.hour, time_utc.minute, time_utc.second + time_utc.microsecond / 1e6)
        T = (jd + frac - 2451545.0) / 36525.0

        # Mean longitude and anomaly
        L0 = (280.46646 + 36000.76983 * T) % 360.0
        M = (357.52911 + 35999.05029 * T) % 360.0
        M_rad = math.radians(M)

        # Ecliptic longitude
        ecl_lon = L0 + 1.914602 * math.sin(M_rad) + 0.019993 * math.sin(2 * M_rad)
        ecl_lon_rad = math.radians(ecl_lon)

        # Obliquity
        eps = math.radians(23.439291 - 0.0130042 * T)

        # Sun ECI unit vector
        x_sun = math.cos(ecl_lon_rad)
        y_sun = math.sin(ecl_lon_rad) * math.cos(eps)
        z_sun = math.sin(ecl_lon_rad) * math.sin(eps)

        r_sun_km = 149597870.7  # 1 AU
        sun_eci = (x_sun * r_sun_km, y_sun * r_sun_km, z_sun * r_sun_km)

        # Rotate to ECEF
        gmst = gmst_from_jd(jd + frac)
        sun_ecef = teme_to_ecef(sun_eci[0], sun_eci[1], sun_eci[2], gmst)

        # Sub-solar point
        sun_lat, sun_lon, _ = ecef_to_geodetic(sun_ecef[0], sun_ecef[1], sun_ecef[2])
        return sun_ecef, round(sun_lat, 2), round(sun_lon, 2)

    @staticmethod
    def _is_satellite_sunlit(sat_eci: Tuple[float, float, float], sun_eci_dir: Tuple[float, float, float]) -> bool:
        """Determines if satellite is illuminated by the Sun (cylindrical Earth shadow test)."""
        dot = sat_eci[0] * sun_eci_dir[0] + sat_eci[1] * sun_eci_dir[1] + sat_eci[2] * sun_eci_dir[2]
        if dot >= 0:
            return True  # Day side of Earth
        
        # Satellite on night side: check if inside shadow cylinder
        dist_sq = (sat_eci[0]**2 + sat_eci[1]**2 + sat_eci[2]**2) - (dot**2)
        return dist_sq > (EARTH_RADIUS_KM**2)

    @staticmethod
    def _calculate_footprint_radius_km(altitude_km: float, min_elevation_deg: float = 10.0) -> float:
        """
        Calculates ground coverage footprint radius (km) for an antenna or optical sensor.
        r = R_E * (arccos(R_E * cos(El) / (R_E + h)) - El)
        """
        el_rad = math.radians(min_elevation_deg)
        cos_el = math.cos(el_rad)
        r_earth = EARTH_RADIUS_KM
        arg = (r_earth * cos_el) / (r_earth + max(100.0, altitude_km))
        arg = max(-1.0, min(1.0, arg))
        central_angle_rad = math.acos(arg) - el_rad
        if central_angle_rad <= 0:
            return 200.0
        return round(r_earth * central_angle_rad, 1)

    @staticmethod
    def predict_overpasses(
        obj: OrbitalObject,
        station_lat: float,
        station_lon: float,
        station_alt_m: float = 0.0,
        station_name: str = "Ground Station",
        min_elevation_deg: float = 10.0,
        prediction_hours: float = 48.0
    ) -> OverpassResponse:
        """
        Scans future orbital passes over a designated ground station, finding
        Acquisition of Signal (AOS), Peak Elevation (TCA), and Loss of Signal (LOS),
        along with optical telescope visibility conditions.
        """
        if not obj.tle_line1 or not obj.tle_line2:
            return OverpassResponse(
                norad_id=obj.norad_id,
                object_name=obj.name,
                station_name=station_name,
                station_latitude=station_lat,
                station_longitude=station_lon,
                total_passes_found=0,
                passes=[]
            )

        satrec = Satrec.twoline2rv(obj.tle_line1, obj.tle_line2)
        obs_ecef = OverpassService._observer_to_ecef(station_lat, station_lon, station_alt_m)

        start_time = datetime.now(timezone.utc)
        end_time = start_time + timedelta(hours=prediction_hours)

        step_seconds = 20
        total_steps = int((prediction_hours * 3600) / step_seconds)

        passes: List[OverpassEvent] = []
        in_pass = False
        current_pass_points: List[SkyPoint] = []
        aos_time: Optional[datetime] = None
        aos_az: float = 0.0

        for i in range(total_steps):
            t = start_time + timedelta(seconds=i * step_seconds)
            jd, frac = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)

            err, r_teme, v_teme = satrec.sgp4(jd, frac)
            if err != 0:
                continue

            gmst = gmst_from_jd(jd + frac)
            sat_ecef = teme_to_ecef(r_teme[0], r_teme[1], r_teme[2], gmst)

            az, el, rng = OverpassService._calculate_topocentric_az_el(
                sat_ecef, obs_ecef, station_lat, station_lon
            )

            # Approximate range rate
            range_rate = 0.0
            if current_pass_points:
                dt_s = (t - current_pass_points[-1].timestamp).total_seconds()
                if dt_s > 0:
                    range_rate = round((rng - current_pass_points[-1].range_km) / dt_s, 2)

            sun_ecef, sun_lat, sun_lon = OverpassService._calculate_sun_position_ecef(t)
            sun_obs_az, sun_obs_el, _ = OverpassService._calculate_topocentric_az_el(
                sun_ecef, obs_ecef, station_lat, station_lon
            )

            # Check if sat is sunlit
            sun_dir_len = math.sqrt(sun_ecef[0]**2 + sun_ecef[1]**2 + sun_ecef[2]**2)
            sun_dir = (sun_ecef[0] / sun_dir_len, sun_ecef[1] / sun_dir_len, sun_ecef[2] / sun_dir_len)
            is_sat_sunlit = OverpassService._is_satellite_sunlit(sat_ecef, sun_dir)

            if el >= min_elevation_deg:
                sky_pt = SkyPoint(
                    timestamp=t,
                    azimuth_deg=az,
                    elevation_deg=el,
                    range_km=rng,
                    range_rate_km_s=range_rate,
                    is_sunlit=is_sat_sunlit
                )
                if not in_pass:
                    in_pass = True
                    aos_time = t
                    aos_az = az
                    current_pass_points = [sky_pt]
                else:
                    current_pass_points.append(sky_pt)
            else:
                if in_pass:
                    # Pass completed: process event
                    in_pass = False
                    if current_pass_points and aos_time:
                        los_time = current_pass_points[-1].timestamp
                        los_az = current_pass_points[-1].azimuth_deg
                        duration = (los_time - aos_time).total_seconds()

                        # Find peak elevation point
                        peak_pt = max(current_pass_points, key=lambda p: p.elevation_deg)
                        peak_time = peak_pt.timestamp
                        peak_az = peak_pt.azimuth_deg
                        max_el = peak_pt.elevation_deg
                        min_rng = min(p.range_km for p in current_pass_points)

                        # Determine optical visibility
                        # Optical visible: Ground is dark (sun_obs_el < -6 deg) and sat is sunlit
                        if sun_obs_el < -6.0 and peak_pt.is_sunlit:
                            vis_type = "OPTICAL_VISIBLE"
                            vis_label = "Visible (Dawn/Dusk Sky)"
                        elif sun_obs_el >= -6.0:
                            vis_type = "SUNLIT_DAYLIGHT"
                            vis_label = "Daylight Pass (Radio Only)"
                        else:
                            vis_type = "ECLIPSED_NIGHT"
                            vis_label = "Eclipsed in Earth Shadow"

                        passes.append(OverpassEvent(
                            norad_id=obj.norad_id,
                            object_name=obj.name,
                            station_id="station",
                            station_name=station_name,
                            aos_time=aos_time,
                            peak_time=peak_time,
                            los_time=los_time,
                            duration_seconds=round(duration, 0),
                            max_elevation_deg=round(max_el, 1),
                            aos_azimuth_deg=round(aos_az, 1),
                            peak_azimuth_deg=round(peak_az, 1),
                            los_azimuth_deg=round(los_az, 1),
                            min_range_km=round(min_rng, 1),
                            visibility_type=vis_type,
                            visibility_label=vis_label,
                            sky_trajectory=current_pass_points[::2]  # Subsample for lightweight transport
                        ))
                        current_pass_points = []

        return OverpassResponse(
            norad_id=obj.norad_id,
            object_name=obj.name,
            station_name=station_name,
            station_latitude=station_lat,
            station_longitude=station_lon,
            total_passes_found=len(passes),
            passes=passes
        )

    @staticmethod
    def get_ground_track_ribbon(obj: OrbitalObject) -> Optional[GroundTrackResponse]:
        """
        Generates continuous 2D ground track with past 1 orbit, future 2 orbits,
        sensor footprint radius, and live sub-solar point.
        """
        if not obj.tle_line1 or not obj.tle_line2:
            return None

        satrec = Satrec.twoline2rv(obj.tle_line1, obj.tle_line2)
        period_min = obj.period_minutes or 95.0
        now = datetime.now(timezone.utc)

        # Current point
        jd, frac = jday(now.year, now.month, now.day, now.hour, now.minute, now.second + now.microsecond / 1e6)
        err, r_teme, _ = satrec.sgp4(jd, frac)
        if err != 0:
            return None

        gmst = gmst_from_jd(jd + frac)
        sat_ecef = teme_to_ecef(r_teme[0], r_teme[1], r_teme[2], gmst)
        curr_lat, curr_lon, curr_alt = ecef_to_geodetic(sat_ecef[0], sat_ecef[1], sat_ecef[2])
        curr_footprint = OverpassService._calculate_footprint_radius_km(curr_alt)

        sun_ecef, sun_lat, sun_lon = OverpassService._calculate_sun_position_ecef(now)
        sun_dir_len = math.sqrt(sun_ecef[0]**2 + sun_ecef[1]**2 + sun_ecef[2]**2)
        sun_dir = (sun_ecef[0] / sun_dir_len, sun_ecef[1] / sun_dir_len, sun_ecef[2] / sun_dir_len)
        curr_sunlit = OverpassService._is_satellite_sunlit(sat_ecef, sun_dir)

        current_pt = GroundTrackRibbonPoint(
            timestamp=now,
            latitude=round(curr_lat, 4),
            longitude=round(curr_lon, 4),
            altitude_km=round(curr_alt, 2),
            footprint_radius_km=curr_footprint,
            is_sunlit=curr_sunlit
        )

        # Past track: 1 full orbit (~95 min)
        past_points: List[GroundTrackRibbonPoint] = []
        past_steps = 45
        for step in range(past_steps, 0, -1):
            t = now - timedelta(minutes=(step * (period_min / past_steps)))
            jd_p, frac_p = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
            err_p, r_p, _ = satrec.sgp4(jd_p, frac_p)
            if err_p == 0:
                gmst_p = gmst_from_jd(jd_p + frac_p)
                ecef_p = teme_to_ecef(r_p[0], r_p[1], r_p[2], gmst_p)
                lat_p, lon_p, alt_p = ecef_to_geodetic(ecef_p[0], ecef_p[1], ecef_p[2])
                past_points.append(GroundTrackRibbonPoint(
                    timestamp=t,
                    latitude=round(lat_p, 4),
                    longitude=round(lon_p, 4),
                    altitude_km=round(alt_p, 2),
                    footprint_radius_km=OverpassService._calculate_footprint_radius_km(alt_p),
                    is_sunlit=OverpassService._is_satellite_sunlit(ecef_p, sun_dir)
                ))

        # Future track: 2 full orbits (~190 min)
        future_points: List[GroundTrackRibbonPoint] = []
        future_steps = 90
        for step in range(1, future_steps + 1):
            t = now + timedelta(minutes=(step * (2.0 * period_min / future_steps)))
            jd_f, frac_f = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
            err_f, r_f, _ = satrec.sgp4(jd_f, frac_f)
            if err_f == 0:
                gmst_f = gmst_from_jd(jd_f + frac_f)
                ecef_f = teme_to_ecef(r_f[0], r_f[1], r_f[2], gmst_f)
                lat_f, lon_f, alt_f = ecef_to_geodetic(ecef_f[0], ecef_f[1], ecef_f[2])
                future_points.append(GroundTrackRibbonPoint(
                    timestamp=t,
                    latitude=round(lat_f, 4),
                    longitude=round(lon_f, 4),
                    altitude_km=round(alt_f, 2),
                    footprint_radius_km=OverpassService._calculate_footprint_radius_km(alt_f),
                    is_sunlit=OverpassService._is_satellite_sunlit(ecef_f, sun_dir)
                ))

        return GroundTrackResponse(
            norad_id=obj.norad_id,
            object_name=obj.name,
            period_minutes=round(period_min, 2),
            current_position=current_pt,
            past_track=past_points,
            future_track=future_points,
            footprint_radius_km=curr_footprint,
            sub_solar_point={"latitude": sun_lat, "longitude": sun_lon}
        )
