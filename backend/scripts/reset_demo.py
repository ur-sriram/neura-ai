import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def reset_demo_state():
    async with AsyncSessionLocal() as session:
        print("🔄 Resetting NE-Setu runtime state...")

        # Truncate/Clear runtime tables
        runtime_tables = [
            "approval_events", "decision_records", "route_candidates", "stops",
            "assignments", "plans", "event_segment_impacts", "events",
            "road_status_history", "hazard_forecasts", "segment_overlays",
            "simulation_runs", "audit_log"
        ]

        for table in runtime_tables:
            await session.execute(text(f"DELETE FROM {table};"))
            
        # Reset deliveries to NEW status
        await session.execute(text("UPDATE deliveries SET status = 'NEW';"))
        
        # Reset vehicle states
        await session.execute(text("DELETE FROM vehicle_states;"))

        await session.commit()
        print("  ✓ Runtime tables cleared and deliveries reset to NEW.")
        print("🎉 Reset complete!")

if __name__ == "__main__":
    asyncio.run(reset_demo_state())
