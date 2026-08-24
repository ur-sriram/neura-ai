import asyncio
from typing import Callable, List
from app.config import settings

class SimClockService:
    """Authoritative simulation clock service."""
    def __init__(self):
        self.sim_hour: int = settings.SIM_START_HOUR
        self.speed: int = 1  # 1x, 5x, 10x, 20x demo multiplier
        self.is_running: bool = False
        self.listeners: List[Callable[[int], None]] = []

    def set_speed(self, multiplier: int):
        self.speed = max(1, min(100, multiplier))

    def seek(self, target_hour: int):
        self.sim_hour = max(0, min(95, target_hour))

    def tick(self) -> int:
        self.sim_hour = (self.sim_hour + 1) % 96
        for listener in self.listeners:
            try:
                listener(self.sim_hour)
            except Exception:
                pass
        return self.sim_hour

sim_clock = SimClockService()
