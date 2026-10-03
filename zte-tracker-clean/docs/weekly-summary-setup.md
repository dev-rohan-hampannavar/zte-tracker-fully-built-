# Weekly summary email — setup

Sends a Sunday recap (hours logged, topics finished, streak) to an email
address you choose, for as many opted-in users as have it turned on in
Settings. Three things need to be set up outside the code before this
works.

## 1. Resend (sends the actual email)

1. Sign up at https://resend.com (free tier: 100 emails/day, 3,000/month —
   plenty for a weekly send to one recipient).
2. Dashboard → API Keys → create one. Copy it.
3. Add to your environment (Vercel: Project → Settings → Environment
   Variables):
   ```
   RESEND_API_KEY=re_your_key_here
   ```
4. Optional but recommended: verify a domain you own under Resend →
   Domains, so the email isn't sent from Resend's shared test address. Once
   verified, set:
   ```
   WEEKLY_SUMMARY_FROM_EMAIL=ZTE Tracker <weekly@yourdomain.com>
   ```
   If you skip this, it falls back to `onboarding@resend.dev` — works fine
   for testing, but looks less legitimate in an inbox and Resend's test
   domain has stricter sending limits.

## 2. Service role key (lets the cron route read every opted-in user's data)

Supabase dashboard → your project → Settings → API → `service_role` key
(NOT the `anon` key — this one bypasses row-level security, so treat it
like a password). Add it:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```
Never put this in a `NEXT_PUBLIC_` variable or any client-side code.

## 3. A random secret + external cron pinger (triggers the send weekly)

Generate a random string — anything long and unguessable works, e.g. from
a terminal: `openssl rand -hex 32`. Add it:
```
CRON_SECRET=the_random_string_you_generated
```

Then set up something to call your endpoint once a week with that secret.
Recommended: **cron-job.org** (free, no account limits that matter here):

1. Sign up at https://cron-job.org
2. Create a new cron job:
   - URL: `https://your-app.vercel.app/api/cron/weekly-summary`
   - Schedule: weekly, Sunday, whatever time you want the email to go out
   - Request method: GET
   - Headers: add `Authorization: Bearer your_random_string_here` (the
     same value as `CRON_SECRET` above)
3. Save. cron-job.org has its own execution history/logs, so you can see
   whether each week's trigger actually fired and what it returned.

### Why not Vercel Cron?
Vercel Cron Jobs on the free Hobby plan only support once-per-day
schedules — a once-a-week trigger technically fits that, but Vercel Cron
is tied to your Vercel deployment/plan and has had reliability reports on
Hobby. An external pinger is decoupled from your hosting entirely, has its
own failure alerting, and costs nothing either way for a once-a-week call.

## Testing it manually

Once all three env vars are set and deployed, you can trigger a send by
hand (useful before waiting for the actual Sunday) with:

```bash
curl -H "Authorization: Bearer your_random_string_here" \
  https://your-app.vercel.app/api/cron/weekly-summary
```

It returns JSON showing what happened per opted-in user (`sent`,
`skipped` — already sent this week, or `failed` — with a reason).

## Turning it on for your account

Settings → "Weekly summary email" card → add the recipient's name and
email → toggle it on. The first send happens on the next Sunday the cron
job fires (or immediately if you trigger it manually via curl above).
