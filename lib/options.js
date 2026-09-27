// Turns everyone's preferences into 2-3 trip options.
// Gemini proposes destinations and judges the fuzzy parts (destination type,
// dealbreakers). Budget and dates are scored here in code, so the numbers are checkable.

const env = (name, fallback = '') => (process.env[name] ?? '').trim() || fallback;

export const TRIP_TYPES = ['beach', 'mountains', 'city', 'heritage', 'nature & wildlife', 'adventure', 'relaxing / resort'];

const DAY = 86400000;
const toDate = (s) => new Date(`${s}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);

// The window every person is free, or null if there's none.
export function commonWindow(people) {
  const from = Math.max(...people.map((p) => toDate(p.date_from).getTime()));
  const to = Math.min(...people.map((p) => toDate(p.date_to).getTime()));
  return from <= to ? { from: iso(new Date(from)), to: iso(new Date(to)), days: (to - from) / DAY + 1 } : null;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    options: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          destination: { type: 'STRING' },
          trip_type: { type: 'STRING' },
          start_date: { type: 'STRING', description: 'YYYY-MM-DD' },
          end_date: { type: 'STRING', description: 'YYYY-MM-DD' },
          cost_min: { type: 'INTEGER', description: 'INR per person, all-in estimate' },
          cost_max: { type: 'INTEGER', description: 'INR per person, all-in estimate' },
          summary: { type: 'STRING' },
          why_it_works: { type: 'STRING' },
          watch_outs: { type: 'STRING' },
          people: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                person: { type: 'STRING' },
                type_match: { type: 'STRING', enum: ['strong', 'some', 'none'] },
                dealbreaker_hit: { type: 'BOOLEAN' },
                dealbreaker_note: { type: 'STRING' },
              },
              required: ['person', 'type_match', 'dealbreaker_hit'],
            },
          },
        },
        required: ['destination', 'trip_type', 'start_date', 'end_date', 'cost_min', 'cost_max', 'summary', 'why_it_works', 'watch_outs', 'people'],
      },
    },
  },
  required: ['options'],
};

const SYSTEM = `You help a group of five friends in India pick ONE group trip.
You will get each person's preferences under an anonymous label (P1, P2, ...).
Propose exactly 3 distinct options that work best for the group AS A WHOLE:
- Dates must fall inside the common free window when one exists, and last close to the preferred number of nights.
- Stay within everyone's budget where possible. Costs are rough all-in INR per person (travel from their home cities, stay, food, activities).
- Never break anyone's dealbreaker if any option can avoid it.
- Make the three options genuinely different (e.g. different destination types or price levels).
For every option, assess every person: how well the trip type matches what they asked for, and whether it hits one of their dealbreakers.
Writing rules for summary, why_it_works and watch_outs: these are shown to the WHOLE group. Talk about the group's overlap.
NEVER mention a person's label, budget, or dealbreaker there, and never imply who is blocking an option.
dealbreaker_note is shown only to that person: one short sentence in second person ("This includes a trek, which you said you'd skip").`;

export async function proposeOptions(people) {
  const labelled = people.map((p, i) => ({
    person: `P${i + 1}`,
    home_city: p.home_city || 'not given',
    budget_max_inr: p.budget_max,
    free_from: p.date_from,
    free_to: p.date_to,
    preferred_nights: p.nights,
    wants: p.types,
    wont_do: p.dealbreakers || 'nothing listed',
  }));
  const window = commonWindow(people);
  const prompt = `Today is ${iso(new Date())}.
Common free window for everyone: ${window ? `${window.from} to ${window.to} (${window.days} days)` : 'NONE, pick dates that fit the most people'}.
Median preferred nights: ${median(people.map((p) => p.nights))}.

Preferences:
${JSON.stringify(labelled, null, 2)}`;

  const model = env('GEMINI_MODEL', 'gemini-2.5-flash');
  if (!env('GEMINI_API_KEY')) throw new Error('Server is missing GEMINI_API_KEY');
  if (!model.startsWith('gemini')) throw new Error(`GEMINI_MODEL should be a model name like gemini-2.5-flash`);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${data.error?.message ?? 'unknown'}`);
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const options = JSON.parse(text).options ?? [];
  if (options.length < 2) throw new Error('Gemini returned fewer than 2 options');
  return options.slice(0, 3);
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Score one person against one option, 0-100, with notes only that person will see.
export function scorePerson(person, option, assessment = {}) {
  const notes = [];
  let score = 0;

  const budgetRatio = option.cost_max / person.budget_max;
  if (budgetRatio <= 1) {
    score += 40;
    notes.push(`Est. ${inr(option.cost_min)}–${inr(option.cost_max)} fits inside your ${inr(person.budget_max)} budget.`);
  } else if (option.cost_min <= person.budget_max * 1.15) {
    score += 20;
    notes.push(`Est. ${inr(option.cost_min)}–${inr(option.cost_max)} could stretch your ${inr(person.budget_max)} budget.`);
  } else {
    notes.push(`Est. ${inr(option.cost_min)}–${inr(option.cost_max)} is over your ${inr(person.budget_max)} budget.`);
  }

  const start = toDate(option.start_date).getTime();
  const end = toDate(option.end_date).getTime();
  const free = [toDate(person.date_from).getTime(), toDate(person.date_to).getTime()];
  if (Number.isNaN(start) || Number.isNaN(end)) {
    score += 15;
    notes.push('Dates still to be confirmed.');
  } else {
    const overlap = Math.max(0, Math.min(end, free[1]) - Math.max(start, free[0]) + DAY);
    const share = overlap / (end - start + DAY);
    if (share >= 1) { score += 30; notes.push('Dates fall inside your free window.'); }
    else if (share >= 0.5) { score += 15; notes.push('Dates only partly overlap your free window.'); }
    else notes.push('Dates fall outside your free window.');
  }

  const typePoints = { strong: 20, some: 10, none: 0 }[assessment.type_match] ?? 10;
  score += typePoints;
  notes.push(typePoints === 20 ? 'Matches the kind of trip you asked for.'
    : typePoints === 10 ? 'Partly the kind of trip you asked for.'
    : 'Not the kind of trip you asked for.');

  if (assessment.dealbreaker_hit) {
    score = Math.min(score, 25);
    notes.push(assessment.dealbreaker_note || 'This touches one of your dealbreakers.');
  } else {
    score += 10;
  }
  return { score, notes };
}

// Builds the group-level options (safe to show everyone) and the private
// per-person fits (keyed by submission id, only ever returned to that person).
export function scoreOptions(people, rawOptions) {
  const privateFits = Object.fromEntries(people.map((p) => [p.id, []]));
  const scored = rawOptions.map((opt) => {
    const scores = people.map((p, i) => {
      const a = opt.people?.find((x) => x.person === `P${i + 1}`);
      const fit = scorePerson(p, opt, a);
      return { id: p.id, ...fit };
    });
    const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
    const floor = Math.min(...scores.map((x) => x.score));
    return { opt, scores, avg, floor };
  });
  // Best overall first; ties go to the option whose least-happy person is happiest.
  // (The floor is used for ordering only and is never shown.)
  scored.sort((a, b) => b.avg - a.avg || b.floor - a.floor);

  const options = scored.map(({ opt, scores, avg }) => {
    for (const s of scores) privateFits[s.id].push({ score: s.score, notes: s.notes });
    return {
      destination: opt.destination,
      trip_type: opt.trip_type,
      start_date: opt.start_date,
      end_date: opt.end_date,
      cost_min: opt.cost_min,
      cost_max: opt.cost_max,
      summary: opt.summary,
      why_it_works: opt.why_it_works,
      watch_outs: opt.watch_outs,
      group_fit: avg,
    };
  });
  return { options, privateFits };
}
