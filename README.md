# Nexus Links API

A full-stack link management application with a React frontend and Python backend.

## Tech Stack

**Frontend:** React 19, Vite 8, Tailwind CSS 4, React Router 7, Axios, Lucide React, React Hot Toast

**Backend:** Python (FastAPI), SQLite

## Features

- User authentication (login / register)
- Protected dashboard for authenticated users
- Link creation and management
- Responsive UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python run.py
```

## Scripts

| Command           | Description                |
| ----------------- | -------------------------- |
| `npm run dev`     | Start Vite dev server      |
| `npm run build`   | Production build           |
| `npm run preview` | Preview production build   |
| `npm run lint`    | Run oxlint                 |

## Project Structure

```
nexus-links-api/
├── frontend/          # React SPA
│   ├── src/
│   │   ├── api/       # Axios instance & API calls
│   │   ├── components/# Reusable UI components
│   │   ├── context/   # React context providers
│   │   ├── pages/     # Route pages
│   │   ├── App.jsx    # Root component with routing
│   │   └── main.jsx   # Entry point
│   └── package.json
├── backend/           # Python API
│   ├── app/
│   └── requirements.txt
└── README.md