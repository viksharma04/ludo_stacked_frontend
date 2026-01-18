# Ludo Stacked Frontend

Frontend for the Ludo Stacked game. Ludo Stacked is a variation of the popular game known as Ludo or Pachisi. The game introduces new fun rules that take strategy to the next level and increase the importance of each player decision.

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase project with authentication enabled

### Environment Setup

Copy the example environment file and configure your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project values (from https://app.supabase.com/project/_/settings/api):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
app/
├── (auth)/              # Public auth pages (signin, signup)
├── (protected)/         # Authenticated routes (lobby)
├── api/auth/            # API routes for auth
├── auth/callback/       # OAuth callback handler
├── layout.tsx           # Root layout with providers
└── page.tsx             # Landing page
components/
├── auth/                # Auth-related components
└── lobby/               # Lobby components (ProfileDropdown, LobbyActions, EditProfileModal)
contexts/
├── AuthContext.tsx      # Authentication state management
├── ProfileContext.tsx   # User profile state management
└── ThemeContext.tsx     # Theme state management
lib/
├── api/
│   └── client.ts        # Backend API client
└── supabase/
    ├── client.ts        # Browser Supabase client
    └── server.ts        # Server Supabase client
types/
├── auth.ts              # Auth type definitions
└── profile.ts           # Profile type definitions
```

## Authentication

This frontend uses Supabase Auth with support for:

- Email/password authentication
- Google OAuth

### Google OAuth Setup

Configure these URLs in Google Cloud Console:
- JavaScript Origin: `http://localhost:3000`
- Redirect URI: `https://<project>.supabase.co/auth/v1/callback`
- Redirect URI: `http://localhost:3000/auth/callback`

## Backend

This frontend works with a separate FastAPI backend running on http://localhost:8000.

The frontend communicates with the backend via `lib/api/client.ts`, which handles:
- Authentication via Bearer token (from Supabase session)
- Profile endpoints (`GET /api/v1/profile`, `PATCH /api/v1/profile`)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
