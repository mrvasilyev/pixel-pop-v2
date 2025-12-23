import pytest
import asyncio
from job_manager import JobManager

@pytest.mark.asyncio
async def test_memory_queue_enqueue_dequeue():
    # Force no redis
    manager = JobManager()
    manager.redis = None 
    
    job_id = await manager.enqueue_job("test prompt", {}, 123)
    assert job_id is not None
    
    job_status = await manager.get_job(job_id)
    assert job_status["status"] == "PENDING"
    assert job_status["prompt"] == "test prompt"
    
    # Pop
    job = await manager.pop_job()
    assert job["id"] == job_id
    assert job["status"] == "PENDING"
    
    # Update
    await manager.update_job(job_id, {"status": "PROCESSING"})
    updated = await manager.get_job(job_id)
    assert updated["status"] == "PROCESSING"
