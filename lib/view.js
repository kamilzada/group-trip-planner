// The ONLY place trip data is shaped for the browser. This is where the Cut
// (Check 07) is enforced: the group, including the organiser, gets group-level
// data only. A person's own fit and preferences come back only with their own token.
import { getTrip, listSubmissions, getSubmissionByToken } from './db.js';
import { TRIP_TYPES } from './options.js';

export async function tripView(tripId, { me, admin } = {}) {
  const trip = await getTrip(tripId);
  if (!trip) return null;
  const subs = await listSubmissions(tripId);
  const mine = await getSubmissionByToken(tripId, me);
  const isAdmin = Boolean(admin) && admin === trip.admin_token;

  return {
    id: trip.id,
    name: trip.name,
    organizer: trip.organizer,
    expected_count: trip.expected_count,
    status: trip.status,
    // Who has submitted, so Riya knows who to nudge. Never what they submitted.
    submitted: subs.map((s) => s.name),
    options: trip.options ?? null,
    options_stale: trip.options_stale,
    decided_index: trip.decided_index,
    generated_at: trip.generated_at,
    is_admin: isAdmin,
    trip_types: TRIP_TYPES,
    me: mine
      ? {
          name: mine.name,
          home_city: mine.home_city,
          budget_max: mine.budget_max,
          date_from: mine.date_from,
          date_to: mine.date_to,
          nights: mine.nights,
          types: mine.types,
          dealbreakers: mine.dealbreakers,
          // Fit for each option, in the same order as `options`. Only this person sees it.
          fits: trip.private_fits?.[mine.id] ?? null,
        }
      : null,
  };
}
