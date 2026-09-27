// POST { name, organizer, expected_count } -> { id, admin_token }
import { createTrip, newToken, newTripId } from '../lib/db.js';
import { route, HttpError, text } from '../lib/http.js';

export default route('POST', async ({ body }) => {
  const name = text(body.name, 80);
  const organizer = text(body.organizer, 40);
  const expected = Math.round(Number(body.expected_count) || 5);
  if (!name || !organizer) throw new HttpError(400, 'Trip name and your name are required');
  if (expected < 2 || expected > 20) throw new HttpError(400, 'Group size must be 2-20');

  const trip = await createTrip({
    id: newTripId(),
    name,
    organizer,
    expected_count: expected,
    admin_token: newToken(),
  });
  return { id: trip.id, admin_token: trip.admin_token };
});
