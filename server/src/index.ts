import express, { Request, Response, NextFunction } from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT ?? 3000;
const PUBLIC_DIR = path.resolve(__dirname, '..', '..');

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
