# CareLink

**Hiring a household helper in the Philippines — done right, and done safe.**

CareLink is a mobile + web platform that connects Filipino families with domestic
helpers (*kasambahay*) through a trusted, government-verified process. Before anyone
can hire or be hired, both sides are vetted by the local **PESO** (Public Employment
Service Office) — so every match comes with verified IDs, signed digital contracts,
and a real paper trail instead of guesswork.

The whole employment journey lives in one app: browse and apply, interview, sign
contracts, track attendance and leave, and resolve disputes — all under PESO
oversight and compliant with the Kasambahay Law (RA 10361).

**Industry:** HR Tech / Recruitment & Staffing — a **GovTech-enabled employment
marketplace** for the domestic-work (care economy) sector.

Mission:

"To provide a secure and intuitive platform that directly connects household employers with local domestic helpers, making hiring and job placement safe, direct, and trusted."

Vision:

"To become the most trusted domestic hiring platform that protects the safety, privacy, and rights of both helpers and employers through transparent, mutually beneficial connections."

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
