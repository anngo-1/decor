# Decor

stuff

## Project Structure

- `/frontend`: Next.js application (React, Three.js, Tailwind)
- `/backend`: FastAPI application (Python, SQLAlchemy, PostgreSQL)

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Environment Variables

### Frontend (`frontend/.env.local`)
- `BACKEND_URL`: The URL of the Python backend.
  - **Local**: `http://localhost:8000`
  - **Production**: The actual URL of your deployed backend (e.g., `https://api.decor-app.com`)
- `FAL_KEY`: Your Fal.ai API key for 3D model generation (required).

### Backend (`backend/.env`)
- `DATABASE_URL`: SQLAlchemy-compatible database connection string.
  - **Local**: `sqlite:///./decor.db`
  - **Production**: A connection string for a managed database (e.g., `postgresql://user:password@host:port/dbname`)
