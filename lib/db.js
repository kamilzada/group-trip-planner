// Supabase via its REST API (no SDK needed).
import { randomBytes } from 'node:crypto';

const env = (name, fallback = '') => (process.env[name] ?? '').trim() || fallback;
const url = () => env('SUPABASE_URL').replace(/\/+$/, '');
const key = () => env('SUPABASE_SERVICE_KEY');

export const hasDb = () => Boolean(url() && key());

async function rest(method, table, { query = '', body } = {}) {
  const res = await fetch(`${url()}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Supabase ${method} ${table} failed: ${data?.message ?? res.status}`);
  return data;
}

const eq = (v) => `eq.${encodeURIComponent(v)}`;

export const newToken = () => randomBytes(18).toString('base64url');
export const newTripId = () => randomBytes(6).toString('base64url').replace(/[-_]/g, 'x');

export async function getTrip(id) {
  const rows = await rest('GET', 'trips', { query: `?id=${eq(id)}&select=*` });
  return rows[0] ?? null;
}

export const createTrip = async (trip) => (await rest('POST', 'trips', { body: trip }))[0];

export const updateTrip = async (id, patch) =>
  (await rest('PATCH', 'trips', { query: `?id=${eq(id)}`, body: patch }))[0];

export const listSubmissions = (tripId) =>
  rest('GET', 'trip_submissions', { query: `?trip_id=${eq(tripId)}&select=*&order=created_at.asc` });

export async function getSubmissionByToken(tripId, token) {
  if (!token) return null;
  const rows = await rest('GET', 'trip_submissions', {
    query: `?trip_id=${eq(tripId)}&token=${eq(token)}&select=*`,
  });
  return rows[0] ?? null;
}

export const createSubmission = async (row) => (await rest('POST', 'trip_submissions', { body: row }))[0];

export const updateSubmission = async (id, patch) =>
  (await rest('PATCH', 'trip_submissions', { query: `?id=${eq(id)}`, body: patch }))[0];
