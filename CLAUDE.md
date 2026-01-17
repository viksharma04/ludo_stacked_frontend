# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frontend for Ludo Stacked, a strategic variation of the classic Ludo/Pachisi board game. Built with Next.js 16, React 19, and Supabase for authentication.

## Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Architecture

### Authentication Flow

The app uses Supabase Auth with two client types:

- **Browser client** (`lib/supabase/client.ts`): Singleton pattern, used in client components via `createClient()`
- **Server client** (`lib/supabase/server.ts`): Cookie-based, async `createClient()` for server components and API routes

Authentication state is managed through `AuthContext` (`contexts/AuthContext.tsx`) which provides:
- `useAuth()` hook for accessing user/session state
- Methods: `signIn`, `signUp`, `signInWithGoogle`, `signOut`

OAuth callback handling: `app/auth/callback/route.ts` exchanges auth codes for sessions.

### Route Groups

- `(auth)/` - Public auth pages (signin, signup) with shared layout
- `(protected)/` - Authenticated routes; layout redirects unauthenticated users to `/signin`

### Environment Variables

Required in `.env.local` (see `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Backend Integration

A separate FastAPI backend exists (documented in `backend-readme.md`). Backend runs on http://localhost:8000 with API docs at `/docs`. The frontend and backend both use Supabase Auth - frontend handles OAuth flows, backend validates JWTs via JWKS.

### Theming

The app uses class-based dark mode with light as the default theme:

- **ThemeContext** (`contexts/ThemeContext.tsx`): Manages theme state and localStorage persistence
- **ThemeToggle** (`components/ThemeToggle.tsx`): Sun/moon toggle button
- Dark mode is activated by adding `.dark` class to `<html>` element
- Use `dark:` Tailwind prefix for dark mode styles
- **Light theme is the default** - new pages should look good in light mode first

## Code Conventions

- Path alias: `@/*` maps to project root
- Tailwind CSS v4 for styling
- TypeScript strict mode enabled
- Default theme: Light mode (dark mode available via toggle)
- **Font**: Roboto Mono (monospace) - configured in `app/layout.tsx`
- **Accent color**: Use `bg-accent`, `hover:bg-accent-hover`, `text-accent`, `focus:ring-accent` instead of hardcoded blue values. The accent color is configurable in `app/globals.css` via `--accent` and `--accent-hover` CSS variables.
