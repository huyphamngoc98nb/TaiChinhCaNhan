import express from 'express';
import cors from 'cors';
import updatesRouter from './routes/updates';
import apkUpdateRouter from './routes/apkUpdate';

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  // Trong production: giới hạn theo domain cụ thể
  // origin: process.env.ALLOWED_ORIGIN,
  origin: '*',
  methods: ['GET'],
}));
app.use(express.json());

// ── Request logging (minimal) ───────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', updatesRouter);
app.use('/api/updates/apk', apkUpdateRouter);

// ── 404 fallback ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[BundleAPI] Running on http://localhost:${PORT}`);
  console.log(`[BundleAPI] Health: http://localhost:${PORT}/api/health`);
});

export default app;
