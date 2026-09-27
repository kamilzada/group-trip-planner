// POST { id, admin, action: 'expected', expected_count }  -> change group size
// POST { id, admin, action: 'decide', index }              -> record the group's decision
// POST { id, admin, action: 'reopen' }                     -> undo a recorded decision
import { getTrip, updateTrip } from '../lib/db.js';
import { route, HttpError, text } from '../lib/http.js';

export default route('POST', async ({ body }) => {
  const trip = await getTrip(text(body.id, 40));
  if (!trip) throw new HttpError(404, 'Trip not found');
  if (text(body.admin, 60) !== trip.admin_token) throw new HttpError(403, 'Only the organiser link can do this');

  if (body.action === 'expected') {
    const n = Math.round(Number(body.expected_count));
    if (!(n >= 2 && n <= 20)) throw new HttpError(400, 'Group size must be 2-20');
    await updateTrip(trip.id, { expected_count: n });
  } else if (body.action === 'decide') {
    const i = Number(body.index);
    if (!trip.options?.[i]) throw new HttpError(400, 'No such option');
    await updateTrip(trip.id, { status: 'decided', decided_index: i });
  } else if (body.action === 'reopen') {
    await updateTrip(trip.id, { status: trip.options ? 'options' : 'collecting', decided_index: null });
  } else {
    throw new HttpError(400, 'Unknown action');
  }
  return { ok: true };
});
