import { hasDb } from './db.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wraps a Vercel handler: method check, JSON body, consistent errors.
export const route = (method, fn) => async (req, res) => {
  try {
    if (req.method !== method) throw new HttpError(405, `Use ${method}`);
    if (!hasDb()) throw new HttpError(500, 'Server is missing SUPABASE_URL / SUPABASE_SERVICE_KEY');
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
    res.status(200).json(await fn({ query: req.query ?? {}, body }));
  } catch (err) {
    const status = err.status ?? 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message });
  }
};

export const text = (v, max = 200) => String(v ?? '').trim().slice(0, max);
