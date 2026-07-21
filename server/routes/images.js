import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';

const router = Router();

router.post('/upload', authMiddleware, imageUpload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }
  
  const db = await getDb();
  const { guide_id } = req.body;
  
  const result = db.prepare(
    'INSERT INTO images (guide_id, filename, original_name, mime_type, size_bytes, storage_path) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(guide_id || null, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, `images/${req.file.filename}`);
  
  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(image);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id);
  
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  res.json(image);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const image = db.prepare('SELECT * FROM images WHERE id = ?').get(req.params.id);
  
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.get('/guide/:guideId', authMiddleware, async (req, res) => {
  const db = await getDb();
  const images = db.prepare('SELECT * FROM images WHERE guide_id = ?').all(req.params.guideId);
  res.json(images);
});

export default router;
