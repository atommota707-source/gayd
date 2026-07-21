import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateCipher, verifyCipher } from '../services/cipher.js';
import { translateGuideFields } from '../services/translation.js';

const router = Router();

router.get('/public', async (req, res) => {
  const db = await getDb();
  const guides = db.prepare('SELECT * FROM guides WHERE is_published = 1 ORDER BY order_index').all();
  res.json(guides);
});

router.get('/public/:guideId', async (req, res) => {
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE guide_id = ? AND is_published = 1').get(req.params.guideId);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  db.prepare('UPDATE guides SET view_count = view_count + 1 WHERE id = ?').run(guide.id);
  
  const images = db.prepare('SELECT * FROM images WHERE guide_id = ?').all(guide.id);
  
  res.json({ ...guide, images });
});

router.get('/', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guides = db.prepare('SELECT * FROM guides ORDER BY order_index').all();
  res.json(guides);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  const images = db.prepare('SELECT * FROM images WHERE guide_id = ?').all(guide.id);
  const translations = db.prepare('SELECT * FROM translations WHERE guide_id = ?').all(guide.id);
  
  res.json({ ...guide, images, translations });
});

router.post('/', authMiddleware, async (req, res) => {
  const { guide_id, category, title_ru, description_ru, sections_json, order_index } = req.body;
  
  if (!guide_id || !category || !title_ru) {
    return res.status(400).json({ error: 'guide_id, category, and title_ru are required' });
  }
  
  const db = await getDb();
  const cipher = generateCipher();
  
  try {
    const result = db.prepare(
      'INSERT INTO guides (guide_id, category, title_ru, cipher_code, description_ru, sections_json, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(guide_id, category, title_ru, cipher, description_ru || '', sections_json || '[]', order_index || 0);
    
    const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(guide);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Guide with this ID already exists' });
    }
    throw err;
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  const { category, title_ru, title_en, description_ru, description_en, sections_json, order_index } = req.body;
  
  db.prepare(
    'UPDATE guides SET category = ?, title_ru = ?, title_en = ?, description_ru = ?, description_en = ?, sections_json = ?, order_index = ?, updated_at = datetime("now") WHERE id = ?'
  ).run(
    category ?? guide.category,
    title_ru ?? guide.title_ru,
    title_en ?? guide.title_en,
    description_ru ?? guide.description_ru,
    description_en ?? guide.description_en,
    sections_json ?? guide.sections_json,
    order_index ?? guide.order_index,
    req.params.id
  );
  
  const updated = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  db.prepare('DELETE FROM guides WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.post('/:id/publish', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  const newStatus = guide.is_published ? 0 : 1;
  db.prepare('UPDATE guides SET is_published = ? WHERE id = ?').run(newStatus, req.params.id);
  
  res.json({ is_published: newStatus });
});

router.post('/:id/cipher/regenerate', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  const newCipher = generateCipher();
  db.prepare('UPDATE guides SET cipher_code = ? WHERE id = ?').run(newCipher, req.params.id);
  
  res.json({ cipher_code: newCipher });
});

router.post('/verify', async (req, res) => {
  const { guide_id, cipher } = req.body;
  
  if (!guide_id || !cipher) {
    return res.status(400).json({ error: 'guide_id and cipher are required' });
  }
  
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE guide_id = ? AND is_published = 1').get(guide_id);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  const ip = req.ip;
  db.prepare('INSERT INTO analytics (event_type, guide_id, visitor_ip) VALUES (?, ?, ?)').run('cipher_attempt', guide.id, ip);
  
  if (verifyCipher(cipher, guide.cipher_code)) {
    db.prepare('INSERT INTO analytics (event_type, guide_id, visitor_ip) VALUES (?, ?, ?)').run('cipher_success', guide.id, ip);
    
    const today = new Date().toISOString().split('T')[0];
    db.prepare(
      'INSERT INTO daily_stats (date, cipher_attempts, cipher_successes) VALUES (?, 1, 1) ON CONFLICT(date) DO UPDATE SET cipher_attempts = cipher_attempts + 1, cipher_successes = cipher_successes + 1'
    ).run(today);
    
    const images = db.prepare('SELECT * FROM images WHERE guide_id = ?').all(guide.id);
    res.json({ guide: { ...guide, images } });
  } else {
    const today = new Date().toISOString().split('T')[0];
    db.prepare(
      'INSERT INTO daily_stats (date, cipher_attempts) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET cipher_attempts = cipher_attempts + 1'
    ).run(today);
    
    res.status(403).json({ error: 'Invalid cipher' });
  }
});

router.post('/:id/translate-all', authMiddleware, async (req, res) => {
  const db = await getDb();
  const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
  
  if (!guide) {
    return res.status(404).json({ error: 'Guide not found' });
  }
  
  try {
    const sections = JSON.parse(guide.sections_json || '[]');
    const fields = [
      { name: 'title', value: guide.title_ru },
      { name: 'description', value: guide.description_ru },
      ...sections.map((s, i) => [
        { name: `section_${i}_heading`, value: s.heading },
        { name: `section_${i}_body`, value: s.body }
      ]).flat()
    ].filter(f => f.value);
    
    const translations = await translateGuideFields(db, guide.id, fields);
    
    const titleEn = translations.find(t => t.field === 'title')?.translated || guide.title_en;
    const descEn = translations.find(t => t.field === 'description')?.translated || guide.description_en;
    
    db.prepare('UPDATE guides SET title_en = ?, description_en = ?, updated_at = datetime("now") WHERE id = ?').run(titleEn, descEn, guide.id);
    
    res.json({ translations, title_en: titleEn, description_en: descEn });
  } catch (err) {
    res.status(500).json({ error: 'Translation failed: ' + err.message });
  }
});

export default router;
