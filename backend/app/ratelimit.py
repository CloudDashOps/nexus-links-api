"""Tiny in-memory sliding-window rate limiter.

Sufficient for a single-process deployment; swap for Redis-backed limiting
if you scale to multiple workers.
"""

import threading
import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_events: int, window_seconds: float):
        self.max_events = max_events
        self.window_seconds = window_seconds
        self._events: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> bool:
        """Return True when an event would be allowed under the limit,
        without recording one."""
        now = time.monotonic()
        with self._lock:
            events = self._events[key]
            cutoff = now - self.window_seconds
            while events and events[0] < cutoff:
                events.popleft()
            return len(events) < self.max_events

    def record(self, key: str) -> None:
        """Record an event against the key's limit."""
        with self._lock:
            self._events[key].append(time.monotonic())

    def allow(self, key: str) -> bool:
        """Return True when the event is allowed under the limit."""
        if not self.check(key):
            return False
        self.record(key)
        return True

    def reset(self) -> None:
        with self._lock:
            self._events.clear()
