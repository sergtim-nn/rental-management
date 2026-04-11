import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { ensureUploadsDir } from './utils';
import { authMiddleware } from './middleware/auth';
import authRouter       from './routes/auth';
import categoriesRouter from './routes/categories';
import objectsRouter    from './routes/objects';
import settingsRouter   from './routes/settings';
import stateRouter      from './routes/state';

ensureUploadsDir();

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth',       authRouter);
app.use('/api/state',      authMiddleware, stateRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/objects',    authMiddleware, objectsRouter);
app.use('/api/settings',   authMiddleware, settingsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = parseInt(process.env.PORT ?? '3002', 10);
app.listen(PORT, () => console.log(`Rental API running on port ${PORT}`));

export default app;
