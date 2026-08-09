from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models
from app.database import engine
from app.routers import auth, links, redirect

# Auto-create database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NexusLink API",
    description="High-performance URL Shortener with Asynchronous Analytics Tracking",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def home():
    return {"Message": "NexusLinks API is live and connected to the Database!"}


# Include routers
app.include_router(auth.router)
app.include_router(links.router)
# Redirect router must be last since it catches /{short_code}
app.include_router(redirect.router)