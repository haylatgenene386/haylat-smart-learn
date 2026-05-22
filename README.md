# Haylat_EdTech – Smart Learning Platform

An AI-powered educational platform for Ethiopian students (Grades 9–12), built by **HG7_Tech**.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (auth, database, edge functions)
- **AI tutoring** via configurable AI gateway

## Getting Started

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Navigate to the project directory
cd haylat-smart-learn

# 3. Install dependencies
npm install

# 4. Copy the example env and fill in your values
cp .env.example .env

# 5. Start the development server
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |

Supabase edge functions use the following secrets (set via `supabase secrets set`):

| Secret | Description |
|---|---|
| `AI_API_KEY` | API key for the AI gateway |
| `GMAIL_USER` | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | Gmail app password |
| `ADMIN_EMAIL` | Admin email for notifications |
| `RESEND_API_KEY` | Resend API key for instructor invites |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |

## Deployment

Deploy the frontend to any static hosting provider (Vercel, Netlify, etc.) and point it at your Supabase project.
