import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 8123;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

function sanitizeUsername(value) {
  return String(value || '').trim().slice(0, 50);
}

app.post('/api/login', async (req, res) => {
  const username = sanitizeUsername(req.body.username);
  if (!username) return res.status(400).json({ error: 'Username is required.' });

  const { error } = await supabase.from('caregiver_users').upsert({ username }, { onConflict: 'username' });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ username });
});

app.get('/api/children', async (req, res) => {
  const username = sanitizeUsername(req.query.username);
  if (!username) return res.status(400).json({ error: 'username query param is required.' });

  const { data, error } = await supabase
    .from('child_access')
    .select('child_id, children!inner(id,name,shared_by,created_at)')
    .eq('username', username)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const children = (data || []).map(row => row.children);
  res.json({ children });
});

app.post('/api/children', async (req, res) => {
  const creator = sanitizeUsername(req.body.creator);
  const name = String(req.body.name || '').trim().slice(0, 100);
  const sharedWith = Array.isArray(req.body.sharedWith)
    ? req.body.sharedWith.map(sanitizeUsername).filter(Boolean)
    : [];

  if (!creator || !name) return res.status(400).json({ error: 'creator and name are required.' });

  const uniqueUsers = Array.from(new Set([creator, ...sharedWith]));
  const userRows = uniqueUsers.map(username => ({ username }));

  const usersErr = await supabase.from('caregiver_users').upsert(userRows, { onConflict: 'username' });
  if (usersErr.error) return res.status(500).json({ error: usersErr.error.message });

  const { data: child, error: childErr } = await supabase
    .from('children')
    .insert({ name, shared_by: creator })
    .select('id,name,shared_by,created_at')
    .single();

  if (childErr) return res.status(500).json({ error: childErr.message });

  const accessRows = uniqueUsers.map(username => ({ child_id: child.id, username }));
  const { error: accessErr } = await supabase.from('child_access').insert(accessRows);
  if (accessErr) return res.status(500).json({ error: accessErr.message });

  res.json({ child });
});

app.get('/api/schedule', async (req, res) => {
  const childId = String(req.query.childId || '');
  const scheduleDate = String(req.query.date || '');
  if (!childId || !scheduleDate) return res.status(400).json({ error: 'childId and date are required.' });

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('child_id', childId)
    .eq('schedule_date', scheduleDate)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ schedule: data || null });
});

app.put('/api/schedule', async (req, res) => {
  const childId = String(req.body.childId || '');
  const scheduleDate = String(req.body.date || '');
  const data = req.body.data;

  if (!childId || !scheduleDate || !data) return res.status(400).json({ error: 'childId, date, and data are required.' });

  const { error } = await supabase
    .from('schedules')
    .upsert({ child_id: childId, schedule_date: scheduleDate, data }, { onConflict: 'child_id,schedule_date' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.get('/api/logs', async (req, res) => {
  const childId = String(req.query.childId || '');
  const scheduleDate = String(req.query.date || '');
  if (!childId || !scheduleDate) return res.status(400).json({ error: 'childId and date are required.' });

  const { data, error } = await supabase
    .from('edit_logs')
    .select('*')
    .eq('child_id', childId)
    .eq('schedule_date', scheduleDate)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data || [] });
});

app.post('/api/logs', async (req, res) => {
  const childId = String(req.body.childId || '');
  const scheduleDate = String(req.body.date || '');
  const username = sanitizeUsername(req.body.username);
  const message = String(req.body.message || '').trim().slice(0, 500);

  if (!childId || !scheduleDate || !username || !message) {
    return res.status(400).json({ error: 'childId, date, username, and message are required.' });
  }

  const { error } = await supabase
    .from('edit_logs')
    .insert({ child_id: childId, schedule_date: scheduleDate, username, message });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.get('/api/child', async (req, res) => {
  const childId = String(req.query.childId || '');
  if (!childId) return res.status(400).json({ error: 'childId is required.' });

  const { data, error } = await supabase.from('children').select('id,name').eq('id', childId).single();
  if (error) return res.status(500).json({ error: error.message });

  res.json({ child: data });
});

app.listen(port, () => {
  console.log(`Nap app listening on http://localhost:${port}`);
});
