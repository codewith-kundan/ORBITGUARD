import time
import threading
import functools
from typing import Any, Optional, Callable, Dict, Tuple

class FastCache:
    """
    High-performance thread-safe in-memory cache with TTL support.
    Ideal for FastAPI endpoints serving real-time orbital calculations,
    fleet statistics, and conjunction screenings.
    """
    _store: Dict[str, Tuple[Any, float]] = {}
    _lock = threading.Lock()

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """Retrieve item if not expired."""
        now = time.time()
        with cls._lock:
            if key in cls._store:
                val, expires_at = cls._store[key]
                if now < expires_at:
                    return val
                else:
                    del cls._store[key]
        return None

    @classmethod
    def set(cls, key: str, value: Any, ttl_seconds: float = 30.0) -> None:
        """Store item with TTL in seconds."""
        now = time.time()
        expires_at = now + ttl_seconds
        with cls._lock:
            # Self-clean if cache exceeds 3000 entries
            if len(cls._store) > 3000:
                cls._evict_expired_unlocked(now)
            cls._store[key] = (value, expires_at)

    @classmethod
    def invalidate(cls, prefix: str = "") -> int:
        """Invalidate all keys matching the prefix."""
        with cls._lock:
            if not prefix:
                count = len(cls._store)
                cls._store.clear()
                return count
            keys_to_del = [k for k in cls._store if k.startswith(prefix)]
            for k in keys_to_del:
                del cls._store[k]
            return len(keys_to_del)

    @classmethod
    def clear(cls) -> None:
        """Clear entire cache."""
        with cls._lock:
            cls._store.clear()

    @classmethod
    def _evict_expired_unlocked(cls, now: float) -> None:
        """Internal helper to prune expired entries without acquiring lock again."""
        expired = [k for k, (_, exp) in cls._store.items() if now >= exp]
        for k in expired:
            del cls._store[k]

fast_cache = FastCache

def cached(ttl_seconds: float = 30.0, prefix: str = ""):
    """
    Decorator for caching function return values.
    Supports both sync and async functions.
    """
    def decorator(func: Callable):
        func_prefix = prefix or f"{func.__module__}.{func.__qualname__}"

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Exclude non-hashable or db session objects from cache key
            filtered_kwargs = {k: v for k, v in kwargs.items() if not k.lower().endswith("db") and not hasattr(v, "query")}
            cache_key = f"{func_prefix}:{args}:{sorted(filtered_kwargs.items())}"
            
            cached_val = fast_cache.get(cache_key)
            if cached_val is not None:
                return cached_val
            
            result = await func(*args, **kwargs)
            fast_cache.set(cache_key, result, ttl_seconds=ttl_seconds)
            return result

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            filtered_kwargs = {k: v for k, v in kwargs.items() if not k.lower().endswith("db") and not hasattr(v, "query")}
            cache_key = f"{func_prefix}:{args}:{sorted(filtered_kwargs.items())}"
            
            cached_val = fast_cache.get(cache_key)
            if cached_val is not None:
                return cached_val
            
            result = func(*args, **kwargs)
            fast_cache.set(cache_key, result, ttl_seconds=ttl_seconds)
            return result

        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
