from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="BusCare API - Test Mode")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "BusCare Fleet Management System",
        "status": "Running in test mode",
        "note": "Database connection not configured - see API docs for endpoints",
        "api_docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "BusCare Backend",
        "version": "1.0.0"
    }

@app.get("/api/test")
async def test_endpoint():
    return {
        "message": "Backend is working!",
        "database_status": "Not configured - run database setup",
        "next_steps": [
            "1. Set up MySQL database",
            "2. Import schema and seed data", 
            "3. Restart with full server.py"
        ]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
