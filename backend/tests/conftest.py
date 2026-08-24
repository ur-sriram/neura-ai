import pytest
import asyncio
from app.database import AsyncSessionLocal

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def db():
    async with AsyncSessionLocal() as session:
        yield session
