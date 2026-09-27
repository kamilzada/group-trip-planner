# Group Trip Planner

One link. Everyone submits their budget, dates, kind of trip and dealbreakers privately.
The group gets 2–3 options with one overall fit score each, and each person privately
sees how well each option fits them. The five of them make the final call.

**The Cut (Check 07, Judgment Protected):** per-person standings are never shown to the group,
including the organiser. This is enforced server-side in [`lib/view.js`](lib/view.js).

See [`docs/components-map.png`](docs/components-map.png).

## How it works

| Link | Who | Sees |
| --- | --- | --- |
| `/?t=ID` | everyone | who has submitted, the options, one group-fit bar each |
| `/?t=ID&me=TOKEN` | one person | the above, plus their own answers (editable) and their own fit per option |
| `/?t=ID&admin=TOKEN` | Riya | the above, plus Generate, group size and Record decision. No one's answers or fit |

- Generate unlocks only once everyone has submitted.
- Gemini gets people as P1–P5 and proposes 3 options, judging trip-type match and dealbreakers.
- Budget and dates are scored in code ([`lib/options.js`](lib/options.js)): budget 40, dates 30, type 20, no dealbreaker 10. A dealbreaker caps the score at 25.
- Editing after options exist marks them "out of date" instead of wiping them.
- Every option shows "AI estimates. Verify before booking."

## Deploy

1. **Supabase:** SQL Editor → paste [`supabase/schema.sql`](supabase/schema.sql) → Run. The Tele-bot project works too, since the table names differ.
2. **GitHub:** create an empty repo (e.g. `group-trip-planner`), then push:
   ```bash
   git remote add origin https://github.com/<you>/group-trip-planner.git
   git push -u origin main
   ```
3. **Vercel:** Add New → Project → import the repo → Framework preset **Other** → add env vars from [`.env.example`](.env.example) → Deploy.
4. Open the URL, create a trip, and test with five browsers or private windows.

No build step and no npm dependencies.
