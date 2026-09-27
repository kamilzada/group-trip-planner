// GET ?id=&me=&admin= -> the trip as the caller is allowed to see it (see lib/view.js)
import { tripView } from '../lib/view.js';
import { route, HttpError, text } from '../lib/http.js';

export default route('GET', async ({ query }) => {
  const view = await tripView(text(query.id, 40), { me: text(query.me, 60), admin: text(query.admin, 60) });
  if (!view) throw new HttpError(404, 'Trip not found');
  return view;
});
