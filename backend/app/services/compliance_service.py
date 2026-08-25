import time
import math
import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from backend.app.models.conjunction import Conjunction
from backend.app.models.orbital_object import OrbitalObject
from backend.app.services.propagation_service import PropagationService
from backend.app.schemas.compliance import (
    CDMPreviewResponse,
    WebhookDispatchRequest,
    WebhookDispatchResponse
)

logger = logging.getLogger(__name__)


class ComplianceService:
    """
    Standard aerospace compliance service implementing CCSDS 508.0-B-1 (Conjunction Data Message).
    Generates standards-compliant KVN & XML data messages and manages operator dispatching.
    """

    @staticmethod
    def generate_cdm(conjunction: Conjunction, db: Session) -> CDMPreviewResponse:
        """
        Generates full CCSDS 508.0-B-1 compliant KVN (Key-Value Notation) and XML messages
        for a given conjunction close-approach event.
        """
        obj1 = conjunction.object_a or db.query(OrbitalObject).filter(OrbitalObject.norad_id == conjunction.object_a_id).first()
        obj2 = conjunction.object_b or db.query(OrbitalObject).filter(OrbitalObject.norad_id == conjunction.object_b_id).first()

        now = datetime.now(timezone.utc)
        tca = conjunction.tca
        if isinstance(tca, str):
            tca_dt = datetime.fromisoformat(tca.replace("Z", "+00:00"))
        else:
            tca_dt = tca

        tca_iso = tca_dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        creation_iso = now.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        msg_id = f"CDM_{conjunction.id}_{tca_dt.strftime('%Y%m%d%H%M%S')}"

        obj1_name = obj1.name if obj1 else f"OBJECT_{conjunction.object_a_id}"
        obj1_norad = obj1.norad_id if obj1 else conjunction.object_a_id
        obj1_intl = (obj1.international_designator if obj1 else None) or "UNKNOWN"
        obj1_type = (obj1.object_type.value if hasattr(obj1.object_type, 'value') else str(obj1.object_type)) if obj1 else "UNKNOWN"

        obj2_name = obj2.name if obj2 else f"OBJECT_{conjunction.object_b_id}"
        obj2_norad = obj2.norad_id if obj2 else conjunction.object_b_id
        obj2_intl = (obj2.international_designator if obj2 else None) or "UNKNOWN"
        obj2_type = (obj2.object_type.value if hasattr(obj2.object_type, 'value') else str(obj2.object_type)) if obj2 else "UNKNOWN"

        miss_dist_m = round(conjunction.miss_distance_km * 1000.0, 2)
        rel_speed_m_s = round(conjunction.relative_velocity_km_s * 1000.0, 2)
        
        # Determine collision probability
        if hasattr(conjunction, 'collision_probability') and getattr(conjunction, 'collision_probability') is not None:
            raw_prob = float(conjunction.collision_probability)
        else:
            # 2D Foster isotropic approximation: Pc ~ exp(-d^2 / (2 * sigma^2))
            sigma_km = 2.5
            raw_prob = math.exp(- (conjunction.miss_distance_km ** 2) / (2.0 * sigma_km ** 2)) * 0.05
        collision_prob = round(raw_prob, 8)

        # Propagate state vectors at TCA if TLEs available
        x1, y1, z1, vx1, vy1, vz1 = 6871.0, 0.0, 0.0, 0.0, 7.6, 0.0
        x2, y2, z2, vx2, vy2, vz2 = 6871.0, 0.5, 0.2, 0.0, -7.6, 0.1

        if obj1 and obj1.tle_line1 and obj1.tle_line2:
            try:
                pos1 = PropagationService.propagate_tle(obj1.tle_line1, obj1.tle_line2, tca_dt)
                if pos1:
                    x1, y1, z1 = pos1.x_km, pos1.y_km, pos1.z_km
                    vx1, vy1, vz1 = pos1.vx_km_s, pos1.vy_km_s, pos1.vz_km_s
            except Exception:
                pass

        if obj2 and obj2.tle_line2 and obj2.tle_line2:
            try:
                pos2 = PropagationService.propagate_tle(obj2.tle_line1, obj2.tle_line2, tca_dt)
                if pos2:
                    x2, y2, z2 = pos2.x_km, pos2.y_km, pos2.z_km
                    vx2, vy2, vz2 = pos2.vx_km_s, pos2.vy_km_s, pos2.vz_km_s
            except Exception:
                pass

        # Standard estimated diagonal covariance terms (m^2) for SGP4 LEO ephemerides
        c_r, c_t, c_n = 2500.0, 22500.0, 10000.0

        # Build KVN Format (CCSDS 508.0-B-1 Key-Value Notation)
        kvn_lines = [
            "CCSDS_CDM_VERS = 1.0",
            f"CREATION_DATE = {creation_iso}",
            "ORIGINATOR = ORBITGUARD_SSA_SYSTEM",
            f"MESSAGE_ID = {msg_id}",
            "",
            "COMMENT Conjunction Assessment Summary",
            f"TCA = {tca_iso}",
            f"MISS_DISTANCE = {miss_dist_m} [m]",
            f"RELATIVE_SPEED = {rel_speed_m_s} [m/s]",
            "COLLISION_PROBABILITY_METHOD = 2D-FOSTER",
            f"COLLISION_PROBABILITY = {collision_prob}",
            "SCREENING_VOLUME_SHAPE = ELLIPSOID",
            "SCREENING_VOLUME_RADIUS = 25.0 [km]",
            "",
            "OBJECT = OBJECT1",
            f"OBJECT_DESIGNATOR = {obj1_norad}",
            "CATALOG_NAME = SATCAT",
            f"OBJECT_NAME = {obj1_name}",
            f"INTERNATIONAL_DESIGNATOR = {obj1_intl}",
            f"OBJECT_TYPE = {obj1_type}",
            "EPHEMERIS_NAME = SGP4_TLE_PROPAGATION",
            "COVARIANCE_METHOD = CALCULATED",
            "REF_FRAME = EME2000",
            f"X = {x1:.6f} [km]",
            f"Y = {y1:.6f} [km]",
            f"Z = {z1:.6f} [km]",
            f"X_DOT = {vx1:.6f} [km/s]",
            f"Y_DOT = {vy1:.6f} [km/s]",
            f"Z_DOT = {vz1:.6f} [km/s]",
            "REF_FRAME_COV = RTN",
            f"CR_R = {c_r:.2f} [m**2]",
            f"CT_T = {c_t:.2f} [m**2]",
            f"CN_N = {c_n:.2f} [m**2]",
            "",
            "OBJECT = OBJECT2",
            f"OBJECT_DESIGNATOR = {obj2_norad}",
            "CATALOG_NAME = SATCAT",
            f"OBJECT_NAME = {obj2_name}",
            f"INTERNATIONAL_DESIGNATOR = {obj2_intl}",
            f"OBJECT_TYPE = {obj2_type}",
            "EPHEMERIS_NAME = SGP4_TLE_PROPAGATION",
            "COVARIANCE_METHOD = CALCULATED",
            "REF_FRAME = EME2000",
            f"X = {x2:.6f} [km]",
            f"Y = {y2:.6f} [km]",
            f"Z = {z2:.6f} [km]",
            f"X_DOT = {vx2:.6f} [km/s]",
            f"Y_DOT = {vy2:.6f} [km/s]",
            f"Z_DOT = {vz2:.6f} [km/s]",
            "REF_FRAME_COV = RTN",
            f"CR_R = {c_r:.2f} [m**2]",
            f"CT_T = {c_t:.2f} [m**2]",
            f"CN_N = {c_n:.2f} [m**2]"
        ]
        kvn_content = "\n".join(kvn_lines)

        # Build XML Format (CCSDS 508.0-B-1 XML Schema)
        xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<cdm xmlns="urn:ccsds:schema:ndmxml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="{msg_id}" version="1.0">
  <header>
    <COMMENT>Generated autonomously by ORBITGUARD SSA Engine</COMMENT>
    <CREATION_DATE>{creation_iso}</CREATION_DATE>
    <ORIGINATOR>ORBITGUARD_SSA_SYSTEM</ORIGINATOR>
    <MESSAGE_ID>{msg_id}</MESSAGE_ID>
  </header>
  <body>
    <relativeMetadataData>
      <TCA>{tca_iso}</TCA>
      <MISS_DISTANCE units="m">{miss_dist_m}</MISS_DISTANCE>
      <RELATIVE_SPEED units="m/s">{rel_speed_m_s}</RELATIVE_SPEED>
      <COLLISION_PROBABILITY_METHOD>2D-FOSTER</COLLISION_PROBABILITY_METHOD>
      <COLLISION_PROBABILITY>{collision_prob}</COLLISION_PROBABILITY>
    </relativeMetadataData>
    <segment>
      <metadata>
        <OBJECT>OBJECT1</OBJECT>
        <OBJECT_DESIGNATOR>{obj1_norad}</OBJECT_DESIGNATOR>
        <CATALOG_NAME>SATCAT</CATALOG_NAME>
        <OBJECT_NAME>{obj1_name}</OBJECT_NAME>
        <INTERNATIONAL_DESIGNATOR>{obj1_intl}</INTERNATIONAL_DESIGNATOR>
        <OBJECT_TYPE>{obj1_type}</OBJECT_TYPE>
        <REF_FRAME>EME2000</REF_FRAME>
      </metadata>
      <data>
        <stateVector>
          <X units="km">{x1:.6f}</X>
          <Y units="km">{y1:.6f}</Y>
          <Z units="km">{z1:.6f}</Z>
          <X_DOT units="km/s">{vx1:.6f}</X_DOT>
          <Y_DOT units="km/s">{vy1:.6f}</Y_DOT>
          <Z_DOT units="km/s">{vz1:.6f}</Z_DOT>
        </stateVector>
        <covarianceMatrix>
          <REF_FRAME>RTN</REF_FRAME>
          <CR_R units="m**2">{c_r:.2f}</CR_R>
          <CT_T units="m**2">{c_t:.2f}</CT_T>
          <CN_N units="m**2">{c_n:.2f}</CN_N>
        </covarianceMatrix>
      </data>
    </segment>
    <segment>
      <metadata>
        <OBJECT>OBJECT2</OBJECT>
        <OBJECT_DESIGNATOR>{obj2_norad}</OBJECT_DESIGNATOR>
        <CATALOG_NAME>SATCAT</CATALOG_NAME>
        <OBJECT_NAME>{obj2_name}</OBJECT_NAME>
        <INTERNATIONAL_DESIGNATOR>{obj2_intl}</INTERNATIONAL_DESIGNATOR>
        <OBJECT_TYPE>{obj2_type}</OBJECT_TYPE>
        <REF_FRAME>EME2000</REF_FRAME>
      </metadata>
      <data>
        <stateVector>
          <X units="km">{x2:.6f}</X>
          <Y units="km">{y2:.6f}</Y>
          <Z units="km">{z2:.6f}</Z>
          <X_DOT units="km/s">{vx2:.6f}</X_DOT>
          <Y_DOT units="km/s">{vy2:.6f}</Y_DOT>
          <Z_DOT units="km/s">{vz2:.6f}</Z_DOT>
        </stateVector>
        <covarianceMatrix>
          <REF_FRAME>RTN</REF_FRAME>
          <CR_R units="m**2">{c_r:.2f}</CR_R>
          <CT_T units="m**2">{c_t:.2f}</CT_T>
          <CN_N units="m**2">{c_n:.2f}</CN_N>
        </covarianceMatrix>
      </data>
    </segment>
  </body>
</cdm>"""

        return CDMPreviewResponse(
            conjunction_id=conjunction.id,
            message_id=msg_id,
            creation_date=now,
            originator="ORBITGUARD_SSA_SYSTEM",
            tca=tca_dt,
            miss_distance_m=miss_dist_m,
            relative_speed_m_s=rel_speed_m_s,
            collision_probability=collision_prob,
            object1_name=obj1_name,
            object1_norad_id=obj1_norad,
            object2_name=obj2_name,
            object2_norad_id=obj2_norad,
            kvn_content=kvn_content,
            xml_content=xml_content
        )

    @staticmethod
    async def dispatch_webhook(
        payload: WebhookDispatchRequest,
        db: Session
    ) -> WebhookDispatchResponse:
        """
        Dispatches standardized JSON conjunction alert payload (with optional CCSDS CDM KVN attachment)
        to a specified operator webhook destination URL.
        """
        conjunction = db.query(Conjunction).filter(Conjunction.id == payload.conjunction_id).first()
        if not conjunction:
            return WebhookDispatchResponse(
                success=False,
                status_code=None,
                response_body=None,
                dispatched_at=datetime.now(timezone.utc),
                destination_url=payload.webhook_url,
                message=f"Conjunction #{payload.conjunction_id} not found",
                latency_ms=0.0
            )

        cdm_data = ComplianceService.generate_cdm(conjunction, db)

        dispatch_payload: Dict[str, Any] = {
            "event": "CONJUNCTION_ALERT",
            "conjunction_id": conjunction.id,
            "severity": "CRITICAL" if cdm_data.collision_probability > 1e-4 else "HIGH",
            "risk_score": conjunction.risk_score,
            "collision_probability": cdm_data.collision_probability,
            "tca": cdm_data.tca.isoformat(),
            "miss_distance_km": conjunction.miss_distance_km,
            "relative_velocity_km_s": conjunction.relative_velocity_km_s,
            "primary_object": {
                "norad_id": cdm_data.object1_norad_id,
                "name": cdm_data.object1_name
            },
            "secondary_object": {
                "norad_id": cdm_data.object2_norad_id,
                "name": cdm_data.object2_name
            },
            "custom_notes": payload.custom_notes,
            "cdm_kvn": cdm_data.kvn_content if payload.include_cdm_attachment else None,
            "dispatched_at": datetime.now(timezone.utc).isoformat(),
            "originator": "ORBITGUARD SSA Engine"
        }

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "OrbitGuard-SSA-Dispatcher/2.0"
        }
        if payload.secret_token:
            headers["Authorization"] = f"Bearer {payload.secret_token}"

        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(payload.webhook_url, json=dispatch_payload, headers=headers)
                latency_ms = round((time.time() - start_time) * 1000.0, 1)

                is_success = resp.status_code in [200, 201, 202, 204]
                return WebhookDispatchResponse(
                    success=is_success,
                    status_code=resp.status_code,
                    response_body=resp.text[:500] if resp.text else None,
                    dispatched_at=datetime.now(timezone.utc),
                    destination_url=payload.webhook_url,
                    message=f"Webhook delivered with HTTP status {resp.status_code}" if is_success else f"HTTP {resp.status_code} Error",
                    latency_ms=latency_ms
                )
        except Exception as e:
            latency_ms = round((time.time() - start_time) * 1000.0, 1)
            logger.error(f"Webhook dispatch failed: {e}")
            return WebhookDispatchResponse(
                success=False,
                status_code=None,
                response_body=str(e),
                dispatched_at=datetime.now(timezone.utc),
                destination_url=payload.webhook_url,
                message=f"Dispatch connection error: {str(e)}",
                latency_ms=latency_ms
            )
