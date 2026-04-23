import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import recordRoutes from './routes/records.js';
import adminRoutes from './routes/admin.js';
import departmentRoutes from './routes/departments.js';
import { startAutoLock } from './jobs/autoLock.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

app.use('/api/auth',        authRoutes);
app.use('/api/records',     recordRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin',       adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server xatosi' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portda ishlamoqda`);
  startAutoLock();
});

export default app;
