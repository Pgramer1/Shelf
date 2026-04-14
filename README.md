# Shelf - Media Collection Tracker

A full-stack web application for tracking your movies, TV series, anime, games, and books collection.

## Tech Stack

**Frontend:**

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide Icons

**Backend:**

- Spring Boot 3.2
- PostgreSQL
- Spring Security + JWT
- Spring Data JPA
- Maven

## Features (Phase 1 MVP - ✅ Complete)

- 🔐 User authentication (signup/login with JWT)
- 📚 Add media manually (movies, series, anime, games, books)
- 📊 Status tabs (All, Watching/Reading/Playing, Completed, On Hold, Dropped, Plan to Watch/Read/Play)
- 📈 Progress tracking (episodes/chapters/hours completed)
- ⭐ Rating system (1-10)
- 💖 Favorite marking
- ✏️ Edit and delete media
- 🎨 Beautiful MAL-inspired UI with dark mode support

## Browser Extension (Early Implementation)

- Location: `browser-extension/`
- Tracks playback activity from supported legal/public platforms (Netflix, Amazon Prime Video, YouTube)
- Uses hybrid sync:
  - First detection asks user to confirm "Add to Shelf"
  - Existing shelf entries auto-update progress
- Uses backend Google OAuth with extension callback allowlist
- Explicitly excludes piracy-site support

See `browser-extension/README.md` for setup.

## Prerequisites

- Java 21 or higher
- Maven 3.6+
- PostgreSQL 12+
- Node.js 18+ and npm

## Setup Instructions

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE shelf_db;
```

### 2. Backend Setup

```bash
cd backend

# Configure local env (OAuth, DB overrides, etc.)
copy .env.local.example .env.local

# Update application.yml with your PostgreSQL credentials
# Default: username=postgres, password=postgres

# Build and run
mvn clean install
run.cmd
```

Backend will run on `http://localhost:8080`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login

### Media

- `GET /api/media` - Get all media
- `POST /api/media` - Create media (authenticated)
- `GET /api/media/{id}` - Get media by ID
- `GET /api/media/type/{type}` - Filter by type
- `GET /api/media/search?query={query}` - Search media

### User Shelf

- `GET /api/shelf` - Get user's shelf (authenticated)
- `POST /api/shelf` - Add to shelf (authenticated)
- `PUT /api/shelf/{id}` - Update media (authenticated)
- `DELETE /api/shelf/{id}` - Remove from shelf (authenticated)
- `GET /api/shelf/status/{status}` - Filter by status (authenticated)

## Database Schema

### Users

```
id | username | email | password_hash | created_at
```

### Media

```
id | title | type | total_units | image_url | description | release_year | created_at
```

### User_Media (Junction Table)

```
id | user_id | media_id | status | progress | rating | notes | is_favorite | started_at | completed_at | updated_at
```

## Default Configuration

**Backend (application.yml):**

- Server port: `8080`
- Context path: `/api`
- Database: `localhost:5432/shelf_db`
- JWT expiration: 24 hours

**Frontend (vite.config.ts):**

- Dev server port: `3000`
- API proxy: `/api` → `http://localhost:8080`

## Next Steps (Phase 2 & 3)

### Phase 2 - Polish & APIs

- [ ] Import from external APIs (TMDB, MAL, IGDB)
- [ ] Advanced sorting (by rating, progress, updated date)
- [ ] Search within shelf
- [ ] Image upload for covers

### Phase 3 - Advanced Features

- [ ] Stats dashboard (hours watched, completion %)
- [ ] Public profiles
- [ ] Shareable shelf links
- [ ] Dark/light theme toggle
- [ ] Export data

## Project Structure

```
Shelf/
├── backend/                 # Spring Boot backend
│   ├── src/main/java/com/shelf/
│   │   ├── config/         # Security, CORS config
│   │   ├── controller/     # REST endpoints
│   │   ├── dto/            # Request/Response objects
│   │   ├── model/          # JPA entities
│   │   ├── repository/     # Data access
│   │   ├── security/       # JWT, authentication
│   │   └── service/        # Business logic
│   └── pom.xml
│
└── frontend/               # React + TypeScript
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── context/        # React context (Auth)
    │   ├── pages/          # Main views
    │   ├── services/       # API calls
    │   ├── types/          # TypeScript interfaces
    │   └── App.tsx
    └── package.json
```

## Security Notes

⚠️ **Important for Production:**

- Change JWT secret key in `application.yml`
- Use environment variables for sensitive data
- Enable HTTPS
- Update CORS configuration for production domain
- Use strong passwords for database

## License

MIT

## Contributing

This is a learning project. Feel free to fork and modify for your needs!
