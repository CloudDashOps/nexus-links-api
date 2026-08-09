# NexusLink API 🚀

A high-performance, production-ready URL shortener and management system built with **FastAPI** and **SQLAlchemy**. This project features asynchronous background analytics tracking to ensure zero-latency URL redirection under heavy traffic conditions.

## 🌟 Key Features

- **Asynchronous Analytics Engine**: Utilizes FastAPI's `BackgroundTasks` to log and increment link click metrics on a non-blocking background thread, optimizing user response times.
- **Collision-Resistant Shortcodes**: Automatically generates secure, unique 6-character alphanumeric slugs with an active database collision-prevention loop.
- **Enterprise-Grade Architecture**: Fully decoupled layer structure separating routing logic (`main.py`), database persistence profiles (`database.py`), data validation layers (`schemas.py`), and ORM models (`models.py`).
- **Robust CRUD Operations**:
  - `POST /create-links`: Securely ingests target URLs and structural metadata, enforcing payload constraints via Pydantic.
  - `GET /{short_code}`: Resolves shortcodes to target locations with instantaneous HTTP `307 Temporary Redirect` responses.
  - `GET /analytics/{short_code}`: Re-fetches operational telemetry and performance metrics.
  - `PUT /update/{short_code}`: Contextually updates structural fields and mapping pointers.
  - `DELETE /delete/{short_code}`: Disposes of active mapping configurations gracefully, returning explicit HTTP `204 No Content` status.

## 🛠️ Technical Stack

- **Framework**: FastAPI (Asynchronous Python Web Framework)
- **Database Layer**: SQLAlchemy ORM (Object-Relational Mapping)
- **Data Validation**: Pydantic v2 (Strict Schema Enforcement)
- **Engine**: SQLite (Configured for multi-threaded concurrent connections)
- **Server Gateway**: Uvicorn (ASGI Production Server)

---

## 🚀 Installation & Local Deployment

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd nexuslink-api