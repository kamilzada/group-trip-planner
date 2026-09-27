// POST { id, me?, name, home_city, budget_max, date_from, date_to, nights, types, dealbreakers }
// Creates a submission (returns a private token) or updates the caller's own one.
import { getTrip, updateTrip, getSubmissionByToken, createSubmission, updateSubmission, newToken } from '../lib/db.js';
import { TRIP_TYPES } from '../lib/options.js';
import { route, HttpError, text } from '../lib/http.js';

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export default route('POST', async ({ body }) => {
  const trip = await getTrip(text(body.id, 40));
  if (!trip) throw new HttpError(404, 'Trip not found');
  if (trip.status === 'decided') throw new HttpError(409, 'The group has already decided. Preferences are locked.');

  const row = {
    name: text(body.name, 40),
    home_city: text(body.home_city, 60),
    budget_max: Math.round(Number(body.budget_max)),
    date_from: text(body.date_from, 10),
    date_to: text(body.date_to, 10),
    nights: Math.round(Number(body.nights)),
    types: (Array.isArray(body.types) ? body.types : []).filter((t) => TRIP_TYPES.includes(t)),
    dealbreakers: text(body.dealbreakers, 400),
  };
  if (!row.name) throw new HttpError(400, 'Your name is required');
  if (!(row.budget_max >= 1000)) throw new HttpError(400, 'Budget must be at least ₹1,000');
  if (!isDate(row.date_from) || !isDate(row.date_to) || row.date_from > row.date_to)
    throw new HttpError(400, 'Pick a valid free-from and free-to date');
  if (!(row.nights >= 1 && row.nights <= 14)) throw new HttpError(400, 'Nights must be 1-14');
  if (!row.types.length) throw new HttpError(400, 'Pick at least one kind of trip');

  const existing = await getSubmissionByToken(trip.id, text(body.me, 60));
  let token;
  if (existing) {
    await updateSubmission(existing.id, { ...row, updated_at: new Date().toISOString() });
    token = existing.token;
  } else {
    token = newToken();
    await createSubmission({ ...row, trip_id: trip.id, token });
  }
  // A change of mind after options exist doesn't collapse anything: the options
  // stay up, flagged as out of date until the organiser regenerates them.
  if (trip.options) await updateTrip(trip.id, { options_stale: true });
  return { me: token };
});
