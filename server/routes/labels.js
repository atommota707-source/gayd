import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const labels = db.prepare('SELECT * FROM ui_labels ORDER BY key').all();
  res.json(labels);
});

router.get('/:key', async (req, res) => {
  const db = await getDb();
  const label = db.prepare('SELECT * FROM ui_labels WHERE key = ?').get(req.params.key);
  
  if (!label) {
    return res.status(404).json({ error: 'Label not found' });
  }
  
  res.json(label);
});

router.put('/:key', authMiddleware, async (req, res) => {
  const db = await getDb();
  const { value_ru, value_en } = req.body;
  
  const existing = db.prepare('SELECT * FROM ui_labels WHERE key = ?').get(req.params.key);
  
  if (existing) {
    db.prepare('UPDATE ui_labels SET value_ru = ?, value_en = ?, updated_at = datetime("now") WHERE key = ?').run(
      value_ru ?? existing.value_ru,
      value_en ?? existing.value_en,
      req.params.key
    );
  } else {
    db.prepare('INSERT INTO ui_labels (key, value_ru, value_en) VALUES (?, ?, ?)').run(
      req.params.key,
      value_ru || req.params.key,
      value_en || value_ru || req.params.key
    );
  }
  
  const updated = db.prepare('SELECT * FROM ui_labels WHERE key = ?').get(req.params.key);
  res.json(updated);
});

export default router;
