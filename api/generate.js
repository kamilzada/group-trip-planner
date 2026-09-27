// POST { id, admin } -> organiser generates (or regenerates) the 2-3 options.
// Needs everyone in: a partial set is how the Google Form failed.
import { getTrip, updateTrip, listSubmissions } from '../lib/db.js';
import { proposeOptions, scoreOptions } from '../lib/options.js';
import { route, HttpError, text } from '../lib/http.js';

export default route('POST', async ({ body }) => {
  const trip = await getTrip(text(body.id, 40));
  if (!trip) throw new HttpError(404, 'Trip not found');
  if (text(body.admin, 60) !== trip.admin_token) throw new HttpError(403, 'Only the organiser link can do this');
  if (trip.status === 'decided') throw new HttpError(409, 'The group has already decided');

  const people = await listSubmissions(trip.id);
  if (people.length < trip.expected_count)
    throw new HttpError(409, `Waiting on ${trip.expected_count - people.length} more ${trip.expected_count - people.length === 1 ? 'person' : 'people'}`);

  const { options, privateFits } = scoreOptions(people, await proposeOptions(people));
  await updateTrip(trip.id, {
    options,
    private_fits: privateFits,
    options_stale: false,
    status: 'options',
    generated_at: new Date().toISOString(),
  });
  return { ok: true };
});
