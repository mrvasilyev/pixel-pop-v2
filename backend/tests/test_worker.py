import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from worker import process_job, generate_with_retry

# Mock job data
sample_job = {
    "id": "test-job-123",
    "user_id": 123,
    "prompt": "A cute cat",
    "model_config": {"quality": "high"},
    "status": "PENDING"
}

@pytest.mark.asyncio
async def test_worker_flow_success():
    # Mock dependencies
    job_manager = AsyncMock()
    
    with patch("worker.generate_with_retry", new_callable=AsyncMock) as mock_gen, \
         patch("worker.requests.get") as mock_http, \
         patch("worker.s3_client") as mock_s3:
        
        # Setup mocks
        mock_response_obj = MagicMock()
        mock_response_obj.url = "https://openai.com/image.png"
        mock_response_obj.b64_json = None
        mock_gen.return_value = mock_response_obj
        
        mock_http.return_value.content = b"fake-image-data"
        
        # Run worker process one job
        await process_job(job_manager, sample_job)
        
        # Verify
        mock_gen.assert_awaited_once() # Called OpenAI
        mock_s3.upload_fileobj.assert_called_once() # Uploaded to S3
        
        # Verify status update
        job_manager.update_job.assert_called()
        call_args = job_manager.update_job.call_args_list[-1] # Last call should be COMPLETED
        assert call_args[0][0] == "test-job-123"
        assert call_args[0][1]["status"] == "COMPLETED"
        assert "result" in call_args[0][1]

@pytest.mark.asyncio
async def test_worker_retry_failure():
    # Test that it handles failure gracefully
    job_manager = AsyncMock()
    
    with patch("worker.generate_with_retry", side_effect=Exception("OpenAI Down")) as mock_gen:
        await process_job(job_manager, sample_job)
        
        # Verify it marked as FAILED
        call_args = job_manager.update_job.call_args_list[-1]
        assert call_args[0][1]["status"] == "FAILED"
        assert "error" in call_args[0][1]
