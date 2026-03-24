# CoSpace - Espace de Coworking Premium

A production-grade SaaS web application built with Next.js 15, React, Tailwind CSS, and Supabase.

## Features

### Client Dashboard (Mobile-First)
- **Home Tab**: Greeting, streak card, membership status, check-in CTA, announcements
- **Check-in Tab**: Camera-only photo capture, upload to Supabase Storage
- **Subscription Tab**: Current plan, expiration, history, add/renew plans
- **Leaderboard Tab**: Top 10 streakers, champion card, rewards
- **Profile Tab**: Stats, referral code, check-in history, settings

### Admin Dashboard (Desktop Sidebar)
- **Overview**: KPIs, revenue charts, recent members, quick actions
- **Members**: Search, filter, table with drawer details
- **Revenue**: Charts, transactions, CSV export
- **Leaderboard**: Edit reward text (real-time sync)
- **Pricing**: Live editable prices, audit log
- **Announcements**: Create, pin, delete
- **Settings**: Admin security, feature toggles

### Authentication
- Email/password login & registration
- Role-based access (client/admin)
- Admin requires secret code
- Persistent sessions with Supabase Auth

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 18, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Charts**: Recharts
- **Date Logic**: date-fns
- **Icons**: Lucide React

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `ADMIN_SECRET_CODE` - Secret code for admin registration (default: admin123)

### 3. Set Up Database

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy contents of supabase/schema.sql to Supabase SQL Editor
```

### 4. Create Storage Buckets

In Supabase Dashboard > Storage:
1. Create bucket `checkins` (public)
2. Create bucket `avatars` (public)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (client)/
│   │   └── dashboard/page.tsx
│   ├── (admin)/
│   │   └── admin/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Toast.tsx
│   │   ├── BottomSheet.tsx
│   │   └── index.ts
│   └── decorations/
│       └── Decorations.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── utils.ts
│   └── streak.ts
└── types/
    └── database.ts
```

## Database Schema

- **profiles**: User data, roles, referral codes
- **memberships**: Subscription plans, dates, status
- **checkins**: Daily check-in photos, streak counts
- **pricing**: Plan types, prices, features
- **announcements**: Admin announcements
- **income_logs**: Revenue tracking
- **price_audit**: Price change history
- **leaderboard_settings**: Champion reward text
- **settings**: Feature toggles

## Demo Access

- **Client**: Register with any email
- **Admin**: Register with secret code `admin123`

## License

MIT
