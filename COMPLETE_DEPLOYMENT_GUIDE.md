# CareLink - Complete Deployment Guide

## Table of Contents
1. [Project Structure](#project-structure)
2. [Local Development Setup](#local-development-setup)
3. [Hosting Recommendations](#hosting-recommendations)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [File Uploads (Cloud Storage)](#file-uploads-cloud-storage)
6. [GitHub Repository Replacement](#github-repository-replacement)

---

## 1. Project Structure

```
CareLink/
├── frontend/          # Expo React Native app (mobile + web)
├── backend/           # PHP API + MySQL database
├── COMPLETE_DEPLOYMENT_GUIDE.md  # This file
└── README.md
```

✅ **dbcon.php is SAFE to push** - uses environment variables for production!

---

## 2. Local Development Setup (Laragon)

### Symlink Setup (Windows)

To keep your backend in `C:\Coding\CareLink\backend` but serve it from Laragon:

1. Open **PowerShell as Administrator**
2. Run:
   ```powershell
   # Backup existing (just in case)
   if (Test-Path "C:\laragon\www\carelink_api") {
       Rename-Item -Path "C:\laragon\www\carelink_api" -NewName "carelink_api_backup"
   }
   
   # Create symlink
   New-Item -ItemType SymbolicLink -Path "C:\laragon\www\carelink_api" -Target "C:\Coding\CareLink\backend"
   ```

### Uploads Folder Symlink (Optional)
If you want uploads to sync too:
```powershell
New-Item -ItemType SymbolicLink -Path "C:\laragon\www\uploads" -Target "C:\Coding\CareLink\backend\uploads"
```

---

## 3. Hosting Recommendations

### Option 1: Vercel + Railway (Recommended) ⭐
| Service | What it hosts | Cost |
|---------|--------------|------|
| **Vercel** | Frontend (web) | Free tier available |
| **Railway** | Backend + MySQL | Free tier available |
| **Cloudinary** | File uploads/images | Free tier available |
| **Expo** | Mobile app builds | Free tier available |

**Why this combo?**
- All have generous free tiers
- Easy to set up
- Good documentation
- Scales well

### Option 2: Alternatives
If you don't like Railway/Vercel:
- **Backend**: Heroku, DigitalOcean App Platform, AWS Elastic Beanstalk
- **Frontend**: Netlify, Cloudflare Pages
- **Storage**: AWS S3, Firebase Storage

---

## 4. Step-by-Step Deployment

### Part 1: Prepare Backend for Railway

1. **Sign up for Railway**: https://railway.app
2. **Create New Project** → "Empty Project"
3. **Add MySQL Database**:
   - Click "+ New" → Database → MySQL
   - Wait for it to deploy
   - Click "Connect" to see your credentials (save them!)
4. **Import your database**:
   - In Railway MySQL, go to "Data" → "Import"
   - Upload `backend/database/current.sql`
5. **Set Environment Variables in Railway**:
   - Go to your project → Variables
   - Add these (use Railway's MySQL credentials):
     ```
     DB_HOST=your-railway-mysql-host
     DB_PORT=your-railway-mysql-port
     DB_USERNAME=your-railway-mysql-username
     DB_PASSWORD=your-railway-mysql-password
     DB_DATABASE=railway
     ```
6. **Deploy Backend**:
   - Click "+ New" → GitHub Repo
   - Connect your GitHub account
   - Select your repo
   - Set **Root Directory** to `backend`
   - Deploy!

### Part 2: Prepare Frontend for Vercel

1. **Update API URL in Frontend**:
   - Open `frontend/constants/api.ts`
   - Change `localhost` to your Railway URL (e.g., `https://your-project.railway.app/carelink_api`)
2. **Sign up for Vercel**: https://vercel.com
3. **Import your GitHub repo**:
   - Click "Add New" → Project
   - Import your CareLink repo
   - Set **Root Directory** to `frontend`
   - Deploy!

### Part 3: Mobile App (Expo)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Build for Android**:
   ```bash
   cd frontend
   eas build --platform android
   ```
3. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```
4. **Publish to app stores**

---

## 5. File Uploads (Cloud Storage) ⚠️

**IMPORTANT**: You **CANNOT** use local `uploads/` folder in production (Railway/Vercel). You need cloud storage!

### Recommended: Cloudinary (Free Tier Available)

#### Step 1: Set up Cloudinary
1. Sign up: https://cloudinary.com
2. Get your API keys from Cloudinary Dashboard

#### Step 2: Update Backend
Modify your file upload endpoints to use Cloudinary instead of local storage.

#### Step 3: Update Frontend
Update `frontend/lib/cloudinaryUpload.ts` (you already have this!)

**Why Cloudinary?**
- Free tier (10GB storage, 20GB bandwidth/month)
- Automatic image optimization
- Easy to use SDKs

---

## 6. GitHub Repository Replacement

### Replace Your Old Repo

1. **Add the new remote**:
   ```bash
   git remote set-url origin https://github.com/lomi-10/CareLink.git
   ```

2. **Force push to overwrite old repo**:
   ```bash
   git push -u origin main --force
   ```

⚠️ **WARNING**: This will DELETE everything in your old GitHub repo! Make sure you don't need anything from it first.

---

## Quick Check Before Pushing to GitHub

✅ `.gitignore` is set up correctly
✅ `dbcon.php` uses environment variables
✅ No `.env` files with secrets are committed
✅ `uploads/` folder is in `.gitignore`

---

## Final Notes

- Always use HTTPS in production
- Never commit secrets to GitHub
- Use environment variables for all sensitive data
- Test everything locally before deploying!
