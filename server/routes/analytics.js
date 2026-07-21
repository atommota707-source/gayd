import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/track', async (req, res) => {
  const db = await getDb();
  const { event_type, guide_id } = req.body;
  const ip = req.ip;
  
  db.prepare('INSERT INTO analytics (event_type, guide_id, visitor_ip) VALUES (?, ?, ?)').run(
    event_type || 'page_view',
    guide_id || null,
    ip
  );
  
  const today = new Date().toISOString().split('T')[0];
  db.prepare(
    'INSERT INTO daily_stats (date, page_views) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET page_views = page_views + 1'
  ).run(today);
  
  res.status(201).json({ tracked: true });
});

router.get('/dashboard', authMiddleware, async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  
  const todayStats = db.prepare('SELECT * FROM daily_stats WHERE date = ?').get(today);
  const totalStats = db.prepare('SELECT SUM(page_views) as total_views, SUM(unique_visitors) as total_unique, SUM(guide_opens) as total_opens, SUM(cipher_attempts) as total_attempts, SUM(cipher_successes) as total_successes FROM daily_stats').get();
  const topGuides = db.prepare('SELECT guide_id, title_ru, view_count FROM guides ORDER BY view_count DESC LIMIT 5').all();
  
  res.json({
    today: todayStats || { page_views: 0, unique_visitors: 0, guide_opens: 0, cipher_attempts: 0, cipher_successes: 0 },
    total: totalStats || { total_views: 0, total_unique: 0, total_opens: 0, total_attempts: 0, total_successes: 0 },
    topGuides
  });
});

router.get('/daily', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { from, to } = req.query;
  
  let query = 'SELECT * FROM daily_stats';
  const params = [];
  
  if (from && to) {
    query += ' WHERE date BETWEEN ? AND ?';
    params.push(from, to);
  }
  
  query += ' ORDER BY date DESC LIMIT 30';
  
  const stats = db.prepare(query).all(...params);
  res.json(stats);
});

router.get('/guides', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guides = db.prepare('SELECT id, guide_id, title_ru, view_count, is_published FROM guides ORDER BY view_count DESC').all();
  res.json(guides);
});

export default router;
