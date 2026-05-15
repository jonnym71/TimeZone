import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT ?? 3000;
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'client', 'dist', 'client', 'browser');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const GIFTS_FILE = path.join(DATA_DIR, 'gifts.json');

interface PendingGift {
  amount: number;
  fromEmail?: string;
  fromName?: string;
  createdAt: string;
}

type GiftStore = Record<string, PendingGift[]>;

function loadGifts(): GiftStore {
  try {
    if (!fs.existsSync(GIFTS_FILE)) return {};
    const raw = fs.readFileSync(GIFTS_FILE, 'utf8');
    return JSON.parse(raw) as GiftStore;
  } catch {
    return {};
  }
}

function saveGifts(store: GiftStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(GIFTS_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist gifts:', err);
  }
}

app.use(express.json());

// Permissive CORS for dev (Angular dev server runs on a different port)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Send a gift to an email address (stores it for claiming on next login)
app.post('/api/gifts', (req: Request, res: Response) => {
  const { toEmail, amount, fromEmail, fromName } = req.body ?? {};
  const email = typeof toEmail === 'string' ? toEmail.trim().toLowerCase() : '';
  const value = typeof amount === 'number' ? amount : 0;
  if (!email || value <= 0) {
    res.status(400).json({ error: 'Invalid email or amount' });
    return;
  }
  const store = loadGifts();
  const list = store[email] ?? [];
  list.push({
    amount: value,
    fromEmail: typeof fromEmail === 'string' ? fromEmail : undefined,
    fromName: typeof fromName === 'string' ? fromName : undefined,
    createdAt: new Date().toISOString(),
  });
  store[email] = list;
  saveGifts(store);
  res.json({ ok: true });
});

// Claim all pending gifts for an email (returns total amount, clears the list)
app.post('/api/gifts/claim', (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  const key = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!key) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }
  const store = loadGifts();
  const list = store[key] ?? [];
  const total = list.reduce((sum, g) => sum + g.amount, 0);
  delete store[key];
  saveGifts(store);
  res.json({ ok: true, total, count: list.length, gifts: list });
});

// Peek at pending gifts without claiming
app.get('/api/gifts/:email', (req: Request, res: Response) => {
  const raw = req.params.email;
  const key = (typeof raw === 'string' ? raw : '').trim().toLowerCase();
  if (!key) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }
  const store = loadGifts();
  const list = store[key] ?? [];
  const total = list.reduce((sum, g) => sum + g.amount, 0);
  res.json({ ok: true, total, count: list.length, gifts: list });
});

app.use(express.static(PUBLIC_DIR));

app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
