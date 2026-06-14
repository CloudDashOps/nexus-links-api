from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. The Address Book
SQLALCHEMY_DATABASE_URL = "sqlite:///./nexuslinks.db"

# 2. The Engine (The actual bridge)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. The Waiting Room
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. The Blueprint Paper
Base = declarative_base()

# 5. The Security Guard
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()