import { Router } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { cloudUpload } from '../middleware/upload.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

router.post('/upload', authMiddleware, cloudUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }
  
  const db = await getDb();
  const { description, is_public } = req.body;
  
  const result = db.prepare(
    'INSERT INTO cloud_files (filename, original_name, mime_type, size_bytes, storage_path, description, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    `cloud/${req.file.filename}`,
    description || '',
    is_public === 'true' ? 1 : 0
  );
  
  const file = db.prepare('SELECT * FROM cloud_files WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(file);
});

router.get('/files', authMiddleware, async (req, res) => {
  const db = await getDb();
  const files = db.prepare('SELECT * FROM cloud_files ORDER BY created_at DESC').all();
  res.json(files);
});

router.get('/files/public', async (req, res) => {
  const db = await getDb();
  const files = db.prepare('SELECT * FROM cloud_files WHERE is_public = 1 ORDER BY created_at DESC').all();
  res.json(files);
});

router.get('/download/:id', async (req, res) => {
  const db = await getDb();
  const file = db.prepare('SELECT * FROM cloud_files WHERE id = ?').get(req.params.id);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  db.prepare('UPDATE cloud_files SET download_count = download_count + 1 WHERE id = ?').run(file.id);
  
  const filePath = join(__dirname, '../../data/uploads', file.storage_path);
  res.download(filePath, file.original_name);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const file = db.prepare('SELECT * FROM cloud_files WHERE id = ?').get(req.params.id);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  db.prepare('DELETE FROM cloud_files WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.put('/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const file = db.prepare('SELECT * FROM cloud_files WHERE id = ?').get(req.params.id);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const { description, is_public } = req.body;
  
  db.prepare('UPDATE cloud_files SET description = ?, is_public = ? WHERE id = ?').run(
    description ?? file.description,
    is_public !== undefined ? (is_public ? 1 : 0) : file.is_public,
    req.params.id
  );
  
  const updated = db.prepare('SELECT * FROM cloud_files WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;
