# GexFME
 
Note: This application was built for the corporate Gexpertise.

A full‑stack web application for authenticated management of user workspaces and engineering files (notably DXF), with extraction, transfer, and report generation workflows. The app provides role‑based dashboards (Admin/User), integrates with a PostgreSQL database, and exposes a documented REST API backed by Flask. The frontend is built with React and Ant Design/PrimeReact components.


## Features
- **Authentication (JWT)**: Login, signup, and profile retrieval with JWT access tokens.
- **Role‑based access**: Separate dashboards and routes for `admin` and `user` roles.
- **User management**: CRUD endpoints and password updates; admin utilities to list users and synchronize folders.
- **Folder management**:
  - Create, check, list, and delete user folders recorded in DB and mirrored in the filesystem under `Backend/app/Ressources/`.
  - Automatic synchronization between physical folders and DB (helper endpoints).
- **File operations (DXF‑centric)**:
  - Upload and extract data from DXF files.
  - Transfer files into user‑scoped subfolders.
  - Generate and download "visa" and Excel files from extracted content.
  - Browse, download, and extract data from files within a user’s folder tree.
- **API documentation**: Implemented with Flask‑RESTx (Swagger UI initialization present).
- **CORS**: Configured for `http://localhost:3000` (React dev server).


## Tech Stack
- **Frontend**: React (CRA), React Router, Ant Design, PrimeReact, Axios, Tailwind CSS.
- **Backend**: Python, Flask, Flask‑SQLAlchemy, Flask‑Migrate, Flask‑RESTx, Flask‑JWT‑Extended, Flask‑CORS.
- **Data/Parsing**: `ezdxf`, `shapely`, `openpyxl`.
- **Database**: PostgreSQL via `psycopg2-binary`.


## Project Structure
```
GexFME/
├─ Backend/
│  ├─ app.py                     # Flask entry (uses create_app)
│  ├─ config.py                  # Env & app config (DB URI, JWT, CORS, Ressources path)
│  ├─ create_tables.py           # Utility to reset/create tables
│  ├─ folder_service.py          # High‑level folder/file routes (exposed via blueprint)
│  ├─ migrations/                # Flask‑Migrate (if used)
│  ├─ requirements.txt           # Backend deps
│  └─ app/
│     ├─ __init__.py             # create_app(), DB/JWT/CORS, Swagger API & blueprints
│     ├─ Ressources/             # Physical user folders live here
│     ├─ controllers/
│     │  ├─ auth_controller.py   # /api/auth (login/signup/me)
│     │  ├─ user_controller.py   # /api/users (CRUD, password, sync helpers)
│     │  ├─ folder_controller.py # /api/folders (CRUD)
│     │  ├─ file_controller.py   # /api/upload, extract, transfer, browse/download
│     │  └─ user_folders.py      # /api/user-folders (check/create)
│     ├─ models/
│     │  ├─ user.py              # AES‑encrypted passwords (PBKDF2‑derived key)
│     │  └─ folder.py            # Folder model
│     └─ services/
│        ├─ file_service.py      # DXF extraction and helpers
│        ├─ folder_service.py    # DB/filesystem sync helpers
│        └─ user_service.py      # Users CRUD & listings
├─ Frontend/
│  ├─ package.json               # CRA app (React 19, antd, primereact)
│  ├─ public/
│  └─ src/
│     ├─ App.js                  # Routes & guarded layouts
│     ├─ components/             # Admin/User dashboards + pages
│     └─ services/authService.js # Axios auth helpers
└─ start_application.bat         # Starts backend then frontend (Windows)
```


## Configuration
Create a `.env` in `Backend/` (same level as `app.py`) with at least:
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
SECRET_KEY=change-this-secret
JWT_SECRET_KEY=change-this-jwt-secret
```
Notes:
- `SECRET_KEY` is also used to derive the password encryption key in `app/models/user.py`.
- CORS is set to `http://localhost:3000` in `app/__init__.py`.


## Setup
### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL instance

### Backend
```
cd Backend
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell
pip install -r requirements.txt
```
Initialize the DB (choose one):
- Option A: Flask‑Migrate (recommended)
  - Set up migration scripts if not present, then run typical `flask db init/migrate/upgrade` with `FLASK_APP=app.py`
- Option B: Utility script (resets tables)
  ```
  python create_tables.py
  ```
Run the backend:
```
python app.py    # starts Flask on http://localhost:5000
```

### Frontend
```
cd Frontend
npm install
npm start        # runs on http://localhost:3000
```

### One‑shot start (Windows)
From project root:
```
start_application.bat
```
This spawns two terminals: backend then frontend.


## API Overview (selection)
Base URL: `http://localhost:5000`

- **Auth (`Backend/app/controllers/auth_controller.py`)**
  - `POST /api/auth/login` — { email, password } → JWT, user info
  - `POST /api/auth/signup` — { firstName, lastName, email, password }
  - `GET /api/auth/me` — profile (JWT required)

- **Users (`Backend/app/controllers/user_controller.py`)**
  - `GET /api/users/` — list users
  - `POST /api/users/` — create user { nom, prenom, email, password, role }
  - `GET /api/users/{id}` — get user
  - `PUT /api/users/{id}` — update profile fields
  - `DELETE /api/users/{id}` — delete user (+ folder), requires JWT and role rules
  - `PUT /api/users/{id}/password` — update password (JWT self‑identity)
  - `GET /api/users/users-with-folders` — sync + list users with folders
  - `GET /api/users/simple-users-folders` — simplified sync + listing

- **Folders (`Backend/app/controllers/folder_controller.py`)** (JWT)
  - `GET /api/folders` — list folders for current user
  - `POST /api/folders` — create folder { nom_dossier }
  - `GET /api/folders/{id}` — fetch folder (ownership enforced)
  - `DELETE /api/folders/{id}` — delete folder

- **User folder helpers (`Backend/app/controllers/user_folders.py`)** (JWT)
  - `GET /api/user-folders/check` — check existence; creates base `Ressources` if needed
  - `POST /api/user-folders/create` — create user folder under `Ressources`

- **Files (`Backend/app/controllers/file_controller.py`)** (JWT)
  - `POST /api/upload` — upload DXF into user folder
  - `POST /api/extract-data` — extract data from uploaded DXF
  - `POST /api/transfer-files` — save two files into custom subfolder { filename1, filename2, customFolderName }
  - `GET /api/user-folder/files` — recursive structure (folders + .dxf files)
  - `POST /api/user-folder/download-file` — download by JSON body { filename, folder }
  - `GET /api/user-folder/download-file` — download by query params
  - `POST /api/user-folder/extract-data-from-file` — extract using a file already in folder tree

- **High‑level routes re‑exposing folder service (`Backend/app/controllers/folder_service_routes.py`)**
  - `POST /create-folder`
  - `POST /check-folder`
  - `POST /get-folder-files`
  - `POST /transfer-files`
  - `POST /extract-data-from-file`
  - `POST /generate-visa-file`, `GET /download-visa-file`
  - `POST /generate-excel-file`, `GET /download-excel-file`

Authentication: endpoints marked JWT require `Authorization: Bearer <token>`.


## Frontend Routes
- `/login`, `/signup`
- `/admin-dashboard/*` (guarded for `admin`)
  - index (home), gestion‑utilisateurs, gestion‑ressources, gestion‑local, configuration
- `/user-dashboard/*` (guarded for `user`)
  - index (home), importation‑fichiers, calcul‑ta, ressources, contact, parametre_compte
Route protection is implemented by `src/components/ProtectedRoute/ProtectedRoute` using JWT + role claims.


## File Storage Model
- Physical user folders are under `Backend/app/Ressources/`.
- Folder name is derived from the user’s email local part (dots often replaced with `_` depending on endpoint).
- Many endpoints compute the user folder path from JWT claims.


## Surface/Area Calculation Details
The surface/area and TA-related computations are primarily implemented in `Backend/folder_service.py`.

- **Area of polylines (shoelace formula)**
  - Functions: `generate_excel_file.calculate_area()` (lines ~1006–1019), `generate_excel_file.calculate_polyline_area()` (lines ~1834–1846).
  - Uses the Shoelace (Gauss) formula on the polyline `vertices` to compute polygon area when there are at least 3 points.

- **Containment and intersections (Shapely)**
  - Containment: `generate_excel_file.is_contained()` uses `shapely.geometry.Polygon.contains()` to verify one polyline is fully inside another.
  - Intersection area: `generate_excel_file.calculate_intersection_area()` computes area of overlap between two polylines using Shapely. It applies:
    - Polygon validity checks and auto-repair via `.buffer(0)`.
    - A small tolerance buffer (`.buffer(0.001)`) to catch near-tangent intersections, then falls back to exact intersection if the buffered result is < 0.01.
    - Ensures polygons are closed (repeats first point if necessary) before computing.

- **Layer-driven business rules**
  - Special deduction layers: patterns `GEX_EDS_SDP_2`, `_3`, `_4`, `_5`, `_7` are treated as special/deduction layers (see `is_special_layer()` / `is_special_polyline()` usage). Main SDP polygons are identified via `is_main_sdp_polyline()` and used as the base areas for TA.
  - Destination parsing heuristics map raw layer names to business destinations; ambiguous cases are handled by partial matches and a `special_cases` mapping.

- **Height threshold rule (business rule)**
  - `zero_small_heights()` sets any height value `< 0.5` to zero across calculations and Excel output. The TA summary sheet additionally enforces this rule, writing an empty cell when the total H-180 result is zero or effectively below the threshold.

- **Excel outputs and summaries**
  - `create_excel_document()` writes detailed sheets (including SDP and TA Summary). It rounds values (typically to 4 decimals) and applies the 0.5 threshold for H-180 in the summary. TA Projet/Existant totals are derived from main SDP polylines.

Notes:
- The code assumes polygon coordinates come from DXF polylines; ensure polylines are well-formed (at least 3 vertices) for valid area computation.
- Intersection computations rely on Shapely; small geometry artifacts are mitigated via validity checks and small buffers.


## Development Notes
- Ensure `DATABASE_URL`, `SECRET_KEY`, and `JWT_SECRET_KEY` are set before starting the backend.
- CORS origin is fixed to `http://localhost:3000` by default; adjust in `Backend/app/__init__.py` if needed.
- Passwords are AES‑encrypted at rest (PBKDF2‑derived key from `SECRET_KEY`). Rotate keys with care.
- DXF parsing and geometry rely on `ezdxf` and `shapely`; install system libs if your OS requires them.


## License
Add your preferred license (e.g., MIT) here.


## Screenshots
Consider adding screenshots of Admin and User dashboards in this section.
