import express from 'express';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import compression from 'compression';
import { getDb } from './db/database.js';
import authRoutes from './routes/auth.js';
import guideRoutes from './routes/guides.js';
import imageRoutes from './routes/images.js';
import cloudRoutes from './routes/cloud.js';
import labelRoutes from './routes/labels.js';
import analyticsRoutes from './routes/analytics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const app = express();

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use('/uploads', express.static(join(__dirname, '../data/uploads')));

app.use(express.static(join(__dirname, '../dist')));

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, '../src/admin/admin.html'));
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    res.sendFile(join(__dirname, '../src/admin/admin.html'));
  } else {
    res.sendFile(join(__dirname, '../dist/index.html'));
  }
});

async function start() {
  await getDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CYBERSHOP server running on port ${PORT}`);
  });
}

start().catch(console.error);

export default app;
