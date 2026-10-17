# Cypulse Contact Form (React + Supabase Edge Functions)

A pixel-matched "Meet with Cameron" contact page. The form posts to a Supabase Edge Function that validates the data and saves it to Postgres. A second Edge Function lists all saved messages.

**Stack:** React 18 + Vite, Supabase (Postgres + Edge Functions), Vercel for hosting.

## Project structure

```
src/                         React app (App.jsx, styles.css)
public/cameron.svg           Placeholder avatar (replace with the real photo)
supabase/migrations/         SQL for the messages table
supabase/functions/
  submit-message/            POST: validate + save
  list-messages/             GET: list all saved messages
  _shared/cors.ts            CORS + JSON helper
```

## Run it

### 1. Create the table
Open your Supabase project > **SQL Editor**, paste the contents of `supabase/migrations/001_create_messages.sql`, and run it.

### 2. Deploy the Edge Functions
Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from the project root:

```bash
supabase login
supabase init                       # only adds supabase/config.toml, safe to run
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy submit-message --no-verify-jwt
supabase functions deploy list-messages --no-verify-jwt
```

`--no-verify-jwt` is used so the functions work with both legacy anon keys and the newer `sb_publishable_...` keys. The functions validate input themselves and use the service role key only on the server (Supabase injects it automatically, so you don't need to set any secrets).

### 3. Configure the frontend
```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Dashboard > Project Settings > API). Never put the service role key in `.env`.

### 4. Start the app
```bash
npm install
npm run dev
```
Open http://localhost:5173.

### 5. Deploy to Vercel (free)
1. Push this repo to GitHub.
2. In Vercel, **Add New > Project**, import the repo (Vite is detected automatically).
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. If you change env vars later, redeploy so they take effect.

## API

Base URL: `https://YOUR-PROJECT-REF.supabase.co/functions/v1`

### `POST /submit-message`
```bash
curl -X POST "$BASE/submit-message" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Ada Lovelace","companyName":"Analytical Co","email":"ada@example.com","phone":"+44 20 7946 0958","consent":true}'
```

| Result | Status | Body |
|---|---|---|
| Saved | 201 | `{"success":true,"message":"Message sent...","data":{"id":"...","created_at":"..."}}` |
| Invalid input | 400 | `{"success":false,"message":"Please fix the errors and try again.","errors":{"email":"Enter a valid email address."}}` |
| Wrong method | 405 | `{"success":false,"message":"Method not allowed. Use POST."}` |
| Server error | 500 | `{"success":false,"message":"Could not save your message..."}` |

Validation: all fields required, full name 2 to 100 characters, valid email, phone with 7 to 15 digits, and `consent` must be `true`.

### `GET /list-messages`
```bash
curl "$BASE/list-messages"
```
Returns `{"success":true,"count":N,"data":[...]}`, newest first.

## Notes
- Validation runs in the browser for instant feedback **and** in the Edge Function, so direct API calls can't skip it. The database also has matching `CHECK` constraints.
- Row Level Security is on with no policies, so the anon key can't read or write the table directly. Only the functions can.
- `list-messages` is open because the task asks for a simple list endpoint. In a real product, protect it with authentication.
- Supabase free projects pause after inactivity. If requests fail after a break, restore the project from the dashboard.
