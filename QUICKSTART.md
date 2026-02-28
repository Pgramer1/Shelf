# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install PostgreSQL

If you don't have PostgreSQL installed:

- Download from https://www.postgresql.org/download/
- Install and remember your password
- Default port: 5432

### Step 2: Create Database

Open PostgreSQL terminal (psql) or pgAdmin:

```sql
CREATE DATABASE shelf_db;
```

### Step 3: Update Backend Config

Edit `backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/shelf_db
    username: postgres # Change if needed
    password: postgres # Change to your password
```

### Step 4: Start Backend

```bash
cd backend
mvn spring-boot:run
```

Wait for: "Started ShelfApplication in X seconds"

### Step 5: Start Frontend

Open new terminal:

```bash
cd frontend
npm install
npm run dev
```

### Step 6: Open Browser

Go to: http://localhost:3000

Create an account and start adding media!

---

## 🐛 Troubleshooting

**Backend won't start:**

- Check if PostgreSQL is running
- Verify database exists: `\l` in psql
- Check credentials in application.yml
- Ensure Java 21+ is installed: `java -version`

**Frontend won't start:**

- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`
- Check Node version: `node -v` (should be 18+)

**Can't login/signup:**

- Check backend is running (http://localhost:8080/api)
- Check browser console for errors
- Clear browser cache and localStorage

**Database connection error:**

- Verify PostgreSQL is running
- Check connection string in application.yml
- Test connection: `psql -U postgres -d shelf_db`

---

## 📝 First Time Usage

1. **Sign Up**: Create account with username, email, password
2. **Add Media**: Click "Add Media" button
3. **Fill Details**:
   - Title (e.g., "Breaking Bad")
   - Type (Movie/Series/Anime/Game/Book)
   - Total episodes/chapters
   - Optional: Image URL, description, year
4. **Set Status**:
   - Watching/Reading/Playing
   - Completed
   - Plan to Watch/Read/Play
5. **Track Progress**: Set current episode/chapter
6. **Rate**: Give it 1-10 stars
7. **Update Anytime**: Click edit icon on card

---

## 🎯 Tips

- Use the **+1 button** in edit modal for quick progress updates
- Mark favorites with the ⭐ checkbox
- Switch tabs to filter by status
- Image URLs: Try using images from TMDB, IMDb, or MyAnimeList
- Progress auto-calculates completion percentage

---

## 🔒 Default Credentials

**Database:**

- Username: postgres
- Password: postgres
- Database: shelf_db
- Port: 5432

**JWT:**

- Token expires after 24 hours
- Change secret key before production!

---

## 📦 What's Included

### Phase 1 MVP (Current)

✅ Full authentication system
✅ CRUD operations for media
✅ Status filtering
✅ Progress tracking
✅ Rating system
✅ Responsive UI

### Coming in Phase 2

⏳ External API integration
⏳ Advanced search
⏳ Image uploads
⏳ Better sorting

### Coming in Phase 3

⏳ Stats dashboard
⏳ Public profiles
⏳ Share links
