# SyncroGo — Technology Stack

Derived from the actual project (`backend/requirements.txt`, `frontend/package.json`,
`frontend web/package.json`, `mobile/package.json`, `backend/app/db/database.py`).

---

## Backend — Python

| Layer | Technology | Version |
|---|---|---|
| Language | Python | 3.x |
| Web framework | FastAPI | 0.139.0 |
| ASGI server | Uvicorn | 0.51.0 |
| Real-time | WebSockets (`websockets`) | 16.1 |
| ORM | SQLAlchemy | 2.0.51 |
| Data validation | Pydantic | 2.13.4 |
| Migrations | Alembic | 1.18.5 |
| Auth / JWT | python-jose, passlib, bcrypt | 3.5.0 / 1.7.4 / 3.2.2 |
| Payments | Razorpay | 2.0.1 |
| Validation | email-validator, python-multipart | 2.3.0 / 0.0.32 |
| Env config | python-dotenv | 1.2.2 |
| HTTP client | httpx | 0.28.1 |
| Testing | pytest | — |

**Layout:** `backend/app/{routes, models, schemas, services, auth, db, middleware, utils, api}`

---

## Database — PostgreSQL

- Engine: **PostgreSQL** via SQLAlchemy `postgresql+psycopg` (psycopg 3 — `psycopg` / `psycopg-binary` 3.3.4)
- Hosted on **Supabase** (Session Pooler connection string), pooled access with `pool_pre_ping=True`, `pool_recycle=300`
- Migrations: **Alembic** (`backend/migrations/versions/*`)
- SQLite fallback is **dev-only** and refused in production/prod

---

## Frontend (Web) — HTML, CSS, React

Two Vite + React apps exist:

### `frontend/` — main dashboard app
| Concern | Technology |
|---|---|
| UI | React 19.2 + React DOM |
| Styling | **CSS** via Tailwind CSS 3.4.19 + PostCSS + Autoprefixer |
| Routing | React Router DOM 7.18 |
| State | Zustand 5.0 |
| HTTP | Axios 1.18 |
| Maps | Leaflet 1.9 + React Leaflet 5 |
| Charts | Recharts 3.10 |
| Animation | Framer Motion 12.43 |
| Icons | Lucide React |
| Realtime/Auth | Supabase JS client |
| Build | Vite 8 + TypeScript 6 |

### `frontend web/` — public/marketing site
React 19 + Tailwind + React Router + Leaflet + Axios, built with Vite.

---

## Mobile App — Expo + React Native

| Concern | Technology |
|---|---|
| Framework | Expo SDK ~54.0.27 (React Native 0.81.5) |
| Language | React 19.1 + TypeScript 5.9 |
| Navigation | expo-router ~6.0.24 |
| State | Zustand 5.0 |
| HTTP | Axios 1.7 |
| Maps | react-native-maps 1.20.1, expo-location 19.0.8 |
| Secure storage | expo-secure-store 15.0.8 |
| Camera / documents | expo-image-picker, expo-document-picker |
| UI kit | @expo/ui, @expo/vector-icons, expo-symbols |
| Motion | react-native-reanimated 4.1.7, react-native-gesture-handler |
| Build / release | EAS (`eas.json`) |

---

## Summary (short form)

```
backend  : Python 3 + FastAPI + Uvicorn, SQLAlchemy 2.0 + Alembic, Pydantic, JWT (python-jose),
           Razorpay, pytest
frontend : HTML + CSS (Tailwind/PostCSS) + React 19, React Router, Zustand, Axios,
           Leaflet, Recharts, built with Vite + TypeScript
database : PostgreSQL (psycopg 3) hosted on Supabase, Alembic migrations
mobile   : Expo (SDK 54) + React Native 0.81 + expo-router, Zustand, Axios,
           react-native-maps, expo-secure-store, EAS builds
```
