# CareLink Deployment Guide

## Current Structure
```
C:\Coding\CareLink\
├── frontend/          # Expo React Native app (mobile + web)
└── backend/           # PHP API + MySQL database
```

---

## Step 1: Local Development Setup (Laragon)

### Symlink Setup (Windows)
To keep your backend in `C:\Coding\CareLink\backend` but serve it from Laragon:

1. Open **PowerShell as Administrator**
2. Run these commands:
   ```powershell
   # Backup existing carelink_api (just in case)
   Rename-Item -Path "C:\laragon\www\carelink_api" -NewName "carelink_api_backup"
   
   # Create symbolic link
   New-Item -ItemType SymbolicLink -Path "C:\laragon\www\carelink_api" -Target "C:\Coding\CareLink\backend"
   ```

3. Verify:
   - Check that `C:\laragon\www\carelink_api` now points to your backend folder
   - Visit `http://localhost/carelink_api` in your browser - it should work!

### Uploads Folder
Make sure the `uploads/` folder exists in both places or is also symlinked:
- `C:\Coding\CareLink\backend\uploads\`
- `C:\laragon\www\uploads\` (symlink this too if needed)

---

## Step 2: Version Control (Git)

### Initialize Git Repository
```bash
cd C:\Coding\CareLink
git init
```

### Create `.gitignore` file
```gitignore
# Frontend
frontend/node_modules/
frontend/.expo/
frontend/dist/
frontend/.env.local
frontend/.env.*.local

# Backend
backend/uploads/
backend/error.log
backend/vendor/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
```

### First Commit
```bash
git add .
git commit -m "Initial commit - CareLink project structure"
```

### Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (public or private)
3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deployment

### Option A: Railway (Backend) + Vercel (Frontend) - Recommended

#### Part 1: Deploy Backend to Railway

1. **Sign up for Railway**: https://railway.app
2. **Create a new project** → "Deploy from GitHub repo"
3. **Select your repo** → Configure:
   - Root directory: `backend`
   - Add MySQL database (Railway provides this)
4. **Set environment variables** in Railway dashboard:
   - Database credentials (Railway will provide these)
5. **Import database**:
   - Use `backend/database/current.sql` to initialize your Railway MySQL database
6. **Update frontend API URL**:
   - In `frontend/constants/api.ts`, change `localhost` to your Railway domain

#### Part 2: Deploy Frontend to Vercel

1. **Sign up for Vercel**: https://vercel.com
2. **Import your GitHub repo**
3. **Configure**:
   - Root directory: `frontend`
   - Framework preset: Expo
4. **Set environment variables** (if needed)
5. **Deploy!**

### Option B: Alternative Hosting

#### Backend Alternatives
- **Heroku** (similar to Railway)
- **DigitalOcean** (Droplet with LAMP stack)
- **AWS EC2** / **GCP Compute Engine**

#### Frontend Alternatives
- **Netlify** (similar to Vercel)
- **GitHub Pages** (static only)
- **Cloudflare Pages**

---

## Step 4: Mobile App Deployment

### Android
1. Build APK/AAB using Expo:
   ```bash
   cd frontend
   npx expo build:android
   ```
2. Publish to Google Play Store

### iOS
1. Build IPA using Expo:
   ```bash
   cd frontend
   npx expo build:ios
   ```
2. Publish to App Store

---

## Security Considerations

1. **Never commit secrets**:
   - Use environment variables
   - Keep `.env` files out of git
2. **HTTPS**: Always use HTTPS in production
3. **File uploads**: Validate and sanitize all uploaded files
4. **SQL injection**: Your PHP code already uses prepared statements - keep it that way!
5. **CORS**: Configure proper CORS headers for your production domain

---

## Mobile + Web Compatibility

Your Expo app already supports both mobile and web! To test:

```bash
cd frontend
npx expo start --web  # Run web version
npx expo start        # Run mobile version (Expo Go app)
```

The `role-selection.tsx` (and other screens) should work on both platforms because:
- Expo handles platform differences automatically
- You're using React Native components that work cross-platform

---

## Quick Recap

✅ **Structure**: Keep frontend/backend separate in `C:\Coding\CareLink\`
✅ **Laragon**: Use symlink to serve backend from `C:\laragon\www\carelink_api`
✅ **Git**: Initialize repo and push to GitHub
✅ **Deploy**: Railway (backend) + Vercel (frontend) is a great combo
✅ **Mobile/Web**: Expo already handles both!
