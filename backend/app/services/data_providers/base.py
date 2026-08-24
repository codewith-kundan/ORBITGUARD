from abc import ABC, abstractmethod
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime

class BaseDataProvider(ABC):
    """Abstract interface for all orbital data providers."""

    name: str = "BaseProvider"
    is_live: bool = False
    requires_auth: bool = False

    @abstractmethod
    async def fetch_tle_data(self) -> Tuple[List[str], str, str, Optional[str]]:
        """
        Fetches raw TLE lines from the provider.
        Returns:
            Tuple[List[str], str, str, Optional[str]]:
                - List of raw TLE lines
                - Source name (e.g. 'CelesTrak', 'Space-Track', 'SatNOGS', 'Local Cache')
                - Mode ('LIVE', 'DEMO', 'LIVE ERROR')
                - Optional error message if any
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """
        Checks connectivity, latency, and status of the provider.
        Returns:
            Dict[str, Any]: Status summary including provider health, latency_ms, last_check, etc.
        """
        pass
