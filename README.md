# 🏥 AI Clinical Notes Generator v2

**FastAPI · SQLModel · JWT Auth · React · Tailwind CSS v4 · Google Gemini**

Full-stack app that converts doctor-patient conversations into structured clinical notes, with user authentication, a personal dashboard, and full patient record history.

---

## ✨ What's New in v2

| Feature | v1 | v2 |
|---------|----|----|
| User auth (signup/login) | ❌ | ✅ JWT + bcrypt |
| Patient record history | ❌ | ✅ SQLite / PostgreSQL |
| Dashboard with stats | ❌ | ✅ Notes this week/month |
| Top diagnoses chart | ❌ | ✅ Visual bar breakdown |
| Searchable records | ❌ | ✅ Name + diagnosis search |
| Paginated record list | ❌ | ✅ 10 per page |
| Record detail page | ❌ | ✅ Full note + source convo |
| Sidebar navigation | ❌ | ✅ Persistent across pages |
| Protected routes | ❌ | ✅ React Router guards |

---

## 🗂️ Project Structure

```
ai-clinical-notes/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app + CORS + startup
│   │   ├── models/
│   │   │   ├── database.py            # SQLModel ORM: User, PatientRecord
│   │   │   └── schemas.py             # Pydantic schemas: auth + notes + records
│   │   ├── routes/
│   │   │   ├── auth.py                # POST /signup, POST /login, GET /me
│   │   │   ├── notes.py               # POST /generate, /generate/audio, /transcribe
│   │   │   └── records.py             # GET /dashboard, GET /records, GET /:id, DELETE /:id
│   │   └── services/
│   │       ├── ai_pipeline.py         # LangChain + Gemini chain
│   │       ├── auth.py                # JWT + bcrypt helpers + FastAPI dependency
│   │       ├── transcription.py       # Gemini multimodal audio transcription
│   │       └── vector_store.py        # FAISS semantic search
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router: public + protected routes
│   │   ├── main.jsx
│   │   ├── index.css                  # Tailwind v4 @theme design tokens
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # Global auth state + localStorage
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx          # Sign-in form
│   │   │   ├── SignupPage.jsx         # Create account form
│   │   │   ├── DashboardPage.jsx      # Stats + recent records
│   │   │   ├── GeneratePage.jsx       # Note generation flow
│   │   │   ├── RecordsPage.jsx        # Paginated + searchable record list
│   │   │   └── RecordDetailPage.jsx   # Full note detail view
│   │   ├── components/
│   │   │   ├── Sidebar.jsx            # App-wide navigation
│   │   │   ├── ProtectedRoute.jsx     # Auth guard
│   │   │   ├── ConversationInput.jsx  # Text/audio dual input
│   │   │   ├── LoadingState.jsx       # Animated progress panel
│   │   │   ├── ClinicalNoteDisplay.jsx # Structured note renderer
│   │   │   └── ErrorState.jsx         # Error + suggestions
│   │   ├── hooks/
│   │   │   └── useClinicalNotes.js    # State machine hook
│   │   └── utils/
│   │       └── api.js                 # Axios + Bearer token injection
│   ├── vite.config.js                 # Vite 6 + @tailwindcss/vite
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## 🚀 Getting Started

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env — set GOOGLE_API_KEY and SECRET_KEY

uvicorn app.main:app --reload --port 8000
```

**Required env vars:**

| Variable | How to get |
|----------|------------|
| `GOOGLE_API_KEY` | Free at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `SECRET_KEY` | Run: `python -c "import secrets; print(secrets.token_hex(32))"` |

The SQLite database (`data/clinical_notes.db`) is created automatically on first run.

Swagger docs at **http://localhost:8000/docs**

---

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

### 3. Docker (both services)

```bash
cp backend/.env.example backend/.env  # fill in GOOGLE_API_KEY + SECRET_KEY
docker-compose up --build
```

---

## 🔐 Auth Flow

```
POST /api/auth/signup  →  { email, full_name, password, specialty? }
                        ←  { access_token, user }

POST /api/auth/login   →  { email, password }
                        ←  { access_token, user }

# All /api/notes/* and /api/records/* require:
Authorization: Bearer <access_token>
```

The frontend stores the JWT in `localStorage` and attaches it automatically to every API request via an Axios interceptor. On page refresh, the token is validated against `GET /api/auth/me`.

---

## 📡 API Reference

### Auth
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/signup` | `{email, full_name, password, specialty?}` | `{access_token, user}` |
| POST | `/api/auth/login`  | `{email, password}` | `{access_token, user}` |
| GET  | `/api/auth/me`     | — | `UserProfile` |

### Notes (🔒 auth required)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/notes/generate` | JSON body: `{conversation, patient_name?, visit_date?}` |
| POST | `/api/notes/generate/audio` | Multipart: `audio_file`, `patient_name?`, `visit_date?` |
| POST | `/api/notes/transcribe` | Multipart: `audio_file` |
| GET  | `/api/notes/search` | `?query=...&k=5` |

### Records (🔒 auth required)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/records/dashboard` | Stats + recent 6 records |
| GET | `/api/records` | `?page=1&limit=10&search=` |
| GET | `/api/records/{id}` | Full record detail |
| DELETE | `/api/records/{id}` | Permanent delete |

---

## 🗄️ Database Schema

**users**
```
id            UUID PK
email         unique, indexed
full_name     text
hashed_password  bcrypt hash
specialty     text (nullable)
created_at    datetime
is_active     bool
```

**patient_records**
```
id               UUID PK
user_id          FK → users.id
patient_name     text (nullable)
visit_date       text (nullable)
conversation     text  ← raw dialogue
input_mode       "text" | "audio"
transcription    text (nullable)
patient_symptoms text
diagnosis        text
treatment_plan   text
medications      text
follow_up        text
gemini_model     text
created_at       datetime
updated_at       datetime
```

---

## 🎨 Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login`       | LoginPage    | Sign in with email + password |
| `/signup`      | SignupPage   | Create account with specialty |
| `/dashboard`   | DashboardPage | Stats cards + recent records + top diagnoses chart |
| `/generate`    | GeneratePage  | Text/audio input → loading → note display |
| `/records`     | RecordsPage   | Searchable, paginated record table with delete |
| `/records/:id` | RecordDetailPage | Full note, source conversation, metadata panel |

All routes except `/login` and `/signup` are protected — unauthenticated users are redirected to `/login`.

---

## 📦 Key Dependencies

**Backend**
- `fastapi` + `uvicorn` — web framework
- `sqlmodel` — SQLAlchemy + Pydantic ORM
- `python-jose[cryptography]` — JWT signing
- `passlib[bcrypt]` — password hashing
- `langchain-google-genai` — Gemini LangChain integration
- `email-validator` — Pydantic EmailStr support

**Frontend**
- `react` + `react-router-dom` — UI + routing
- `axios` — HTTP with token interceptor
- `tailwindcss` v4 + `@tailwindcss/vite` — CSS-first styling
- `lucide-react` — icon set
