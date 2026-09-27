# First Claude Code prompt (draft, rewrite it in your own words before submitting)

Build a web app for Riya's group trip (L2 Part B). Deploy on Vercel, store data in Supabase,
use Gemini 2.5 Flash. No framework, no npm dependencies.

One share link. Each of the 5 friends submits: name, home city, max budget per person (₹),
free-from / free-until dates, nights, kind of trip (beach, mountains, city…), and what they won't do.
Each person gets a private link to edit their answers later. Changing your mind must not
wipe anything: mark the options "out of date" instead.

Riya gets an organiser link. "Generate options" only unlocks once all 5 have submitted.
Gemini sees people as P1–P5 (never names) and proposes 3 distinct options: destination,
dates, ₹ range per person. Score each person's fit in code (budget, dates, trip type,
dealbreakers) and show the group ONE overall fit per option.

The Cut, Check 07 Judgment Protected: never show anyone's budget, dealbreakers or
per-option fit to the group, including Riya. Each person sees only their own fit, privately.
Enforce this on the server, not just in the UI.

Every option says "AI estimates. Verify before booking." The tool never picks. The group decides,
and Riya records the decision, which locks the preferences.
