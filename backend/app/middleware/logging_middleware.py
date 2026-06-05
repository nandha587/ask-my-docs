import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram

# Set up logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("askmydocs_gateway")

# Prometheus Metrics
REQUEST_COUNT = Counter(
    "http_requests_total", 
    "Total HTTP Requests", 
    ["method", "endpoint", "status_code"]
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds", 
    "HTTP Request Latency", 
    ["method", "endpoint"]
)

class TelemetryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        method = request.method
        path = request.url.path
        
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as e:
            status_code = 500
            logger.error(f"Request failed: {method} {path} - Error: {str(e)}")
            raise e
        finally:
            process_time = time.time() - start_time
            # Record metrics
            REQUEST_COUNT.labels(method=method, endpoint=path, status_code=status_code).inc()
            REQUEST_LATENCY.labels(method=method, endpoint=path).observe(process_time)
            logger.info(f"{method} {path} responded {status_code} in {process_time:.4f}s")
