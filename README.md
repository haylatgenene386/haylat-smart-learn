# Haylat_EdTech – Smart Learning Platform

An AI-powered educational platform for Ethiopian students (Grades 9–12), built by **HG7_Tech**.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Firebase** (authentication, Firestore, and file storage)
- **Supabase Edge Functions** for AI tutoring and question generation
- **AI gateway** configured on the server

## Getting Started

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Navigate to the project directory
cd haylat-smart-learn

# 3. Install dependencies
npm install

# 4. Create .env and configure Firebase, Supabase, and function settings

# 5. Start the development server
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID |
| `VITE_SUPABASE_URL` | Supabase project URL used for Edge Functions |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key sent with Edge Function requests |
| `VITE_FUNCTIONS_BASE_URL` | Optional base URL for the legacy Firebase Cloud Functions compatibility calls |

The AI frontend calls the `chat`, `quiz-assistant`, `generate-questions`, and
`generate-from-material` Supabase Edge Functions. Configure their server-side
secrets with `supabase secrets set`:

| Secret | Description |
|---|---|
| `AI_API_KEY` | API key for the AI gateway |
| `AI_GATEWAY_URL` | Optional AI gateway base URL; defaults to OpenAI-compatible API |
| `GMAIL_USER` | Optional Gmail account used by the registration email function |
| `GMAIL_APP_PASSWORD` | Gmail app password for registration email delivery |
| `ADMIN_EMAIL` | Admin recipient for registration notifications |
| `RESEND_API_KEY` | Optional Resend API key for instructor invitation email |

This project is in a partial backend transition: Firebase remains responsible
for authentication and application data, while the AI endpoints use Supabase.
The Supabase email/invitation functions and legacy Cloud Functions compatibility
calls are separate from that AI path; changing those would require aligning their
authentication and data stores as a separate migration.

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
