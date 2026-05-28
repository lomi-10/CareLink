# CareLink

A platform connecting domestic helpers and employers.

## Structure

```
CareLink/
├── frontend/          # Expo React Native app (mobile + web)
├── backend/           # PHP API + MySQL database
├── DEPLOYMENT_GUIDE.md  # Detailed deployment instructions
└── README.md          # This file
```

## Local Development

### Prerequisites
- Laragon (for PHP/MySQL)
- Node.js (for frontend)

### Backend Setup
1. Create symlink from `backend/` to `C:\laragon\www\carelink_api` (see DEPLOYMENT_GUIDE.md)
2. Import `backend/database/current.sql` into MySQL

### Frontend Setup
```bash
cd frontend
npm install
npx expo start
```

## Deployment

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## Tech Stack

- **Frontend**: Expo React Native, TypeScript, Tailwind CSS
- **Backend**: PHP, MySQL
