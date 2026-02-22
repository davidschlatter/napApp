# Supabase Setup Guide (Backend-backed)

This app now uses a Node backend (`server.js`) that talks to Supabase using the **service role key**.
End users only see **username login** in the UI.

## 1) In Supabase dashboard
1. Create/open your project.
2. Go to **SQL Editor** and run `supabase/schema.sql`.
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `service_role` key (backend only)

## 2) (Recommended) Enable RLS and lock tables down
If you are using backend-only data access with service role key, RLS can still be enabled safely.
The service role key bypasses RLS, but public anon access should be blocked.

Run in SQL Editor:

```sql
alter table caregiver_users enable row level security;
alter table children enable row level security;
alter table child_access enable row level security;
alter table schedules enable row level security;
alter table edit_logs enable row level security;
```

Then avoid creating broad anon policies unless needed.

## 3) Configure backend environment
Create a `.env` file in project root:

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
PORT=8123
```

> Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

## 4) Install and run app

```bash
npm install
npm start
```

Open `http://localhost:8123`.

## 5) Quick validation checklist
1. Login as `Mom`.
2. Create child and share with `Dad`.
3. On a second device/browser, login as `Dad`.
4. Confirm `Dad` sees the child.
5. Edit a timeline time as `Dad`.
6. Confirm edit appears on Mom's device after refresh/date select.

## 6) Production deployment
1. Deploy this app as a Node service (Render/Railway/Fly/Vercel server).
2. Set env vars in hosting platform:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PORT` (if required)
3. Ensure HTTPS is enabled.

## 7) Troubleshooting
- **"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"**: `.env` is missing or invalid.
- **Users can login but see no children**: verify `child_access` rows include that username.
- **Edits not showing up**: check `schedules` and `edit_logs` tables for inserts.
- **Cross-device not syncing**: verify both devices hit same deployed backend URL.
