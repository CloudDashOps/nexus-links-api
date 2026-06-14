from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import random
import string

import models
import schemas
import database

# =====================================================================
# ⚙️ SYSTEM INITIALIZATION & CORE CONFIG
# =====================================================================

# Automatically instantiate database tables on startup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="NexusLink API", 
    description="High-performance URL Shortener with Asynchronous Analytics Tracking",
    version="1.0.0"
)

@app.get("/", tags=["Root"])
def home(): 
    return {"Message": "NexusLinks API is live and connected to the Database!"}


# =====================================================================
# ⚡ ADVANCED ASYNC LOGIC (BACKGROUND WORKERS)
# =====================================================================

def update_click_count(short_code: str, db: Session):
    """
    Asynchronously increments the click analytics for a specific shortcode.
    Executed via BackgroundTasks to ensure zero-latency user redirects.
    """
    link = db.query(models.LinkModel).filter(models.LinkModel.short_code == short_code).first()
    if link:
        link.clicks += 1
        db.commit()


# =====================================================================
# 🚀 API ENDPOINTS (FULL CRUD OPERATIONS)
# =====================================================================

# --- 1. CREATE ---
@app.post("/create-links", response_model=schemas.LinkResponse, status_code=status.HTTP_201_CREATED, tags=["Links"])
def create_new_link(link: schemas.LinkCreate, db: Session = Depends(database.get_db)): 
    # Generate an initial 6-character shortcode
    new_code = "".join(random.choices(string.ascii_letters + string.digits, k=6))
    
    # Collision prevention loop: Guarantee absolute uniqueness in the database
    while db.query(models.LinkModel).filter(models.LinkModel.short_code == new_code).first():
        new_code = "".join(random.choices(string.ascii_letters + string.digits, k=6))
    
    new_db_link = models.LinkModel(
        target_url=str(link.target_url), 
        title=link.title,
        short_code=new_code,
        clicks=0
    )
    
    db.add(new_db_link)      
    db.commit()              
    db.refresh(new_db_link)  
    
    return new_db_link


# --- 2. READ (REDIRECT & TRACK) ---
@app.get("/{short_code}", tags=["Routing"])
def redirect_to_target(short_code: str, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    # Retrieve the mapping from the database
    link = db.query(models.LinkModel).filter(models.LinkModel.short_code == short_code).first()
    
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Short link not found or expired")
    
    # Offload database write to a non-blocking background thread
    background_tasks.add_task(update_click_count, short_code, db)
    
    # Execute high-speed HTTP redirection
    return RedirectResponse(url=link.target_url)


# --- 3. READ (ANALYTICS STATS) ---
@app.get("/analytics/{short_code}", response_model=schemas.LinkResponse, tags=["Analytics"])
def get_link_analytics(short_code: str, db: Session = Depends(database.get_db)):
    link = db.query(models.LinkModel).filter(models.LinkModel.short_code == short_code).first()
    
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analytics data not found")
    
    return link


# --- 4. UPDATE ---
@app.put("/update/{short_code}", response_model=schemas.LinkResponse, tags=["Links"])
def update_link(short_code: str, link_update: schemas.LinkCreate, db: Session = Depends(database.get_db)):
    link = db.query(models.LinkModel).filter(models.LinkModel.short_code == short_code).first()
    
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link target not found")
    
    # Update the URL payload mapping
    link.target_url = str(link_update.target_url)
    if link_update.title:
        link.title = link_update.title
        
    db.commit()
    db.refresh(link)
    
    return link


# --- 5. DELETE ---
@app.delete("/delete/{short_code}", status_code=status.HTTP_204_NO_CONTENT, tags=["Links"])
def delete_link(short_code: str, db: Session = Depends(database.get_db)):
    link = db.query(models.LinkModel).filter(models.LinkModel.short_code == short_code).first()
    
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link targeted for deletion not found")
    
    db.delete(link)
    db.commit()
    
    return None