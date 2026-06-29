# HCA NS Seeding Dashboard

**XL AXIS SmartFren New Site Seeding Operation Dashboard**

Production-ready web app built with Next.js 15 + TypeScript + TailwindCSS + shadcn/ui,
backed by Google Sheets via Google Apps Script REST API.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + TailwindCSS |
| UI | shadcn/ui + Radix UI + Recharts + Leaflet |
| State | React Query + React Context |
| Forms | React Hook Form + Zod |
| Backend | Google Apps Script REST API |
| Database | Google Sheets |
| Deployment | Vercel |

---

## Google Sheets Setup

### 1. Create a Google Spreadsheet with these sheets:

#### MASTER_BTS
| Column | Description |
|--------|-------------|
| ID BTS | Primary key |
| Tower Name | Tower name |
| Latitude | GPS latitude |
| Longitude | GPS longitude |
| Kabupaten | District |
| Kecamatan | Sub-district |
| Kelurahan | Village |
| Cluster XL | XL Cluster code |
| XL | XL identifier |
| SPM | Site PM name |
| SPV | Supervisor name |
| Region | Region |
| Branch | Branch |
| New Tower OA Date | OA date |
| Qty SP Seeding by Brand(s) | Seeding qty |
| Status Tower | Active/Pending/Problem |
| Priority | Priority level |

#### MASTER_PROMOTOR
| Column | Description |
|--------|-------------|
| Nama Promotor | Promotor name |
| SPV | Supervisor |
| Area | Area |
| Status | Active/Inactive |

#### MASTER_SPV
| Column | Description |
|--------|-------------|
| Nama SPV | SPV name |
| Area | Area |

#### TRANSACTION (auto-created on first submission)
ID, Timestamp, Tanggal, Jam, Supervisor, Promotor, Brand,
ID BTS, MDN, Photo URL, Latitude User, Longitude User,
Distance From BTS, Google Maps URL, Device, Browser, Status

---

## Google Apps Script Setup

### 1. Open Google Apps Script
- Go to your Google Spreadsheet
- Extensions → Apps Script

### 2. Deploy the backend
- Copy content from `gas-backend/Code.gs` to the Apps Script editor
- Update `SPREADSHEET_ID` with your Spreadsheet ID (from the URL)
- Update `DRIVE_FOLDER_ID` with your Google Drive folder ID for photos
- Click **Deploy** → **New Deployment**
  - Type: **Web App**
  - Execute as: **Me**
  - Who has access: **Anyone**
- Copy the deployment URL

### 3. Configure the frontend
Create `.env.local`:
```
NEXT_PUBLIC_BASE_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Vercel Deployment

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_REPO.git
git push -u origin main
```

### 2. Deploy to Vercel
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variable:
  - `NEXT_PUBLIC_BASE_URL` = your GAS deployment URL
- Deploy

---

## Features

### Home Dashboard
- 15 KPI cards (Today/Weekly/Monthly activations, BTS stats, team metrics)
- Brand distribution pie chart
- Activation trend area chart
- Global filter (date range, supervisor, promotor, brand, kabupaten, cluster, PM, status)

### Input Form
- Supervisor autocomplete
- Promotor autocomplete
- Brand dropdown
- BTS search (by ID, Tower Name, Kabupaten, Cluster, SPM, SPV)
- Auto-display BTS details (readonly)
- MDN input
- GPS auto-capture with distance calculation
- Inside/Outside radius indicator
- Camera/gallery photo upload with compression
- Offline queue support

### Map
- Fullscreen Leaflet map
- All BTS as colored markers:
  - Gray = Never activated
  - Green = Activated today
  - Blue = Activated this week
  - Orange = Activated this month
  - Red = Problem
- Street/Satellite/Terrain view toggle
- Current user location
- BTS search on map
- Click marker → side panel with full history

### Analytics
- Daily/Weekly/Monthly trends
- Brand distribution
- Supervisor/Promotor/Kabupaten/Cluster/PM performance
- Activation by hour and weekday
- Top 10 rankings
- Growth % calculation
- Moving average

### Report
- Sortable, filterable, paginated table
- Hide/show columns
- Export CSV / JSON
- Print support
- Copy to clipboard

### Gallery
- Grid view
- Timeline view (grouped by date)
- Lightbox with photo details
- Full photo metadata

### Master Data
- MASTER_BTS with search
- MASTER_PROMOTOR with search
- MASTER_SPV with search
- All read-only, loaded from Google Sheets

### Settings
- GPS radius configuration
- Theme (light/dark/system)
- Default map view
- Dashboard refresh interval
- Image compression quality
- Offline queue management

---

## PWA Support

The app is PWA-ready with:
- Web manifest
- Mobile-first responsive design
- Offline queue for failed submissions
- Optimized for Android Chrome

---

## Architecture

```
src/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Dashboard
│   ├── input/        # Input form
│   ├── map/          # BTS map
│   ├── analytics/    # Analytics charts
│   ├── report/       # Transactions table
│   ├── gallery/      # Photo gallery
│   ├── master/       # Master data
│   └── settings/     # Settings
├── components/
│   ├── ui/           # shadcn/ui primitives
│   ├── layout/       # Navbar, PageContainer
│   ├── dashboard/    # KPI cards, Global filter, Brand chart
│   ├── input/        # BTS search, autocomplete, GPS, photo
│   └── map/          # Leaflet map component
├── hooks/            # React Query hooks
├── lib/              # API client, utils, config
├── providers/        # Theme, Query, Settings providers
├── stores/           # Filter context store
└── types/            # TypeScript types
gas-backend/
└── Code.gs           # Google Apps Script backend
```
