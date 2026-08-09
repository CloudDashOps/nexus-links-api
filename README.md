# NexusLinks API

A full-stack URL shortening and link management application with click analytics, QR code generation, and JWT-based authentication. Built with a **FastAPI** backend and a **React** frontend.

---

## Features

- **User Authentication** — Register and login with email/password; JWT bearer tokens for secure API access.
- **Link Management** — Create, read, update, and delete shortened links.
- **Custom Slugs** — Optionally assign a custom short code instead of a randomly generated one.
- **Link Expiration** — Set an expiry date for time-limited links.
- **Click Tracking** — Every redirect increments a click counter and records referrer + user-agent.
- **Analytics** — Retrieve per-link analytics including total clicks and referrer breakdown.
- **QR Code Generation** — Generate a QR code image for any shortened link.
- **Protected Dashboard** — Authenticated users access a responsive dashboard to manage links.
- **Responsive UI** — Tailwind CSS 4 with a clean, modern design.

---

## Tech Stack

### Frontend

| Technology       | Purpose                        |
|------------------|--------------------------------|
| React 19         | UI library                     |
| Vite 8           | Build tool and dev server      |
| Tailwind CSS 4   | Utility-first styling          |
| React Router 7   | Client-side routing            |
| Axios            | HTTP client with interceptors  |
| Lucide React     | Icon library                   |
| React Hot Toast  | Toast notifications            |
| clsx / tailwind-merge | Conditional class merging |

### Backend

| Technology       | Purpose                        |
|------------------|--------------------------------|
| Python 3.10+     | Runtime                        |
| FastAPI          | Web framework                  |
| SQLAlchemy 2.0   | ORM                            |
| SQLite           | Database                       |
| Pydantic v2      | Data validation & serialization|
| python-jose      | JWT encoding/decoding          |
| passlib (bcrypt) | Password hashing               |
| python-dotenv    | Environment variable loading   |
| qrcode (Pillow)  | QR code image generation       |
| uvicorn          | ASGI server                    |

---

## Backend Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app, CORS, router registration
│   ├── database.py      # SQLAlchemy engine, session, Base
│   ├── models.py        # ORM models: User, LinkModel, ClickAnalytics
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── security.py      # Password hashing, JWT creation/verification, auth dependency
│   └── routers/
│       ├── auth.py      # /auth/register, /auth/login, /auth/users/me
│       ├── links.py     # CRUD for links, QR code, analytics
│       └── redirect.py  # /{short_code} redirect with click tracking
├── requirements.txt
└── .env
```

### Database Models

- **User** — `id`, `username`, `email` (unique), `hashed_password`, `created_at`
- **LinkModel** — `id`, `target_url`, `short_code` (unique, indexed), `custom_slug` (unique, nullable), `title`, `clicks`, `expires_at`, `created_at`
- **ClickAnalytics** — `id`, `link_id` (FK → links), `timestamp`, `referrer`, `user_agent`

### Authentication Flow

1. User registers or logs in via `/auth/register` or `/auth/login`.
2. Server returns a JWT access token (30-minute expiry, HS256).
3. Client stores the token in `localStorage` and sends it as `Authorization: Bearer <token>`.
4. Protected endpoints use the `get_current_user` dependency to validate the token and fetch the user.

---

## Frontend Overview

```
frontend/
├── src/
│   ├── api/
│   │   └── axios.js          # Axios instance with auth interceptor
│   ├── components/
│   │   ├── common/
│   │   │   └── StatCard.jsx  # Reusable stat display card
│   │   ├── layout/
│   │   │   └── Navbar.jsx    # Top navigation bar
│   │   └── links/
│   │       ├── CreateLinkModal.jsx  # Modal form for creating links
│   │       └── LinkTable.jsx        # Table listing all links
│   ├── context/
│   │   └── AuthContext.jsx   # Auth state, login/register/logout
│   ├── pages/
│   │   ├── Auth/
│   │   │   ├── Login.jsx     # Login page
│   │   │   └── Register.jsx  # Register page
│   │   └── Dashboard.jsx     # Protected dashboard
│   ├── App.jsx               # Root component with routing
│   ├── main.jsx              # Entry point
│   └── index.css             # Tailwind CSS imports
├── index.html
├── package.json
└── vite.config.js
```

### Frontend Routes

| Path         | Component  | Access     |
|--------------|------------|------------|
| `/login`     | Login      | Public     |
| `/register`  | Register   | Public     |
| `/dashboard` | Dashboard  | Protected  |
| `/`          | —          | Redirects to `/dashboard` |

---

## Installation

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **pip** (Python package manager)

### 1. Clone the repository

```bash
git clone https://github.com/CloudDashOps/nexus-links-api.git
cd nexus-links-api
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
SECRET_KEY=your-secure-random-secret-key
DATABASE_URL=sqlite:///./nexuslinks.db
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Environment Variables

| Variable       | Description                          | Default                        |
|----------------|--------------------------------------|--------------------------------|
| `SECRET_KEY`   | Secret key for JWT token signing     | `change-this-to-a-long-random-secret-key` |
| `DATABASE_URL` | SQLAlchemy database connection URL   | `sqlite:///./nexuslinks.db`    |

> **Note:** Change the `SECRET_KEY` to a strong, random value in production. Never commit secrets to version control.

---

## API Overview

Base URL: `http://127.0.0.1:8000`

### Health

| Method | Endpoint | Description          |
|--------|----------|----------------------|
| GET    | `/`      | API health check     |

### Authentication

| Method | Endpoint          | Description          | Auth Required |
|--------|-------------------|----------------------|---------------|
| POST   | `/auth/register`  | Register a new user  | No            |
| POST   | `/auth/login`     | Login and get token  | No            |
| GET    | `/auth/users/me`  | Get current user     | Yes           |

### Links

| Method | Endpoint             | Description              | Auth Required |
|--------|----------------------|--------------------------|---------------|
| POST   | `/links/`            | Create a shortened link  | Yes           |
| GET    | `/links/`            | List all links           | Yes           |
| GET    | `/links/{id}`        | Get a single link        | Yes           |
| PUT    | `/links/{id}`        | Update a link            | Yes           |
| DELETE | `/links/{id}`        | Delete a link            | Yes           |
| GET    | `/links/{id}/qr`     | Get QR code image (PNG)  | Yes           |
| GET    | `/links/{id}/analytics` | Get click analytics   | Yes           |

### Redirect

| Method | Endpoint          | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | `/{short_code}`   | Redirect to the target URL (public)      |

---

## Screenshots

> Screenshots will be added here in a future update.

---

## Future Improvements

- Pagination for link listing
- User-specific link ownership (currently all links are visible to all authenticated users)
- Link search and filtering
- Rate limiting on redirect and API endpoints
- Email verification for new accounts
- Password reset flow
- Dark mode toggle
- Docker Compose setup for one-command deployment
- PostgreSQL support as an alternative to SQLite

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.