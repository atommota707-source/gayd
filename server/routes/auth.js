import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'qY8p0TmcY3CQbA94DOZargu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fraefewafrw4erf4FF484ruewnfduw';

async function seedAdmin() {
  const db = await getDb();
  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(ADMIN_USERNAME);
  
  if (!existing) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, salt);
    db.prepare('INSERT INTO admins (username, password_hash, salt) VALUES (?, ?, ?)').run(ADMIN_USERNAME, hash, salt);
    console.log('Admin user seeded');
  }
}

seedAdmin().catch(console.error);

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const db = await getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateToken(admin);
  res.json({ token, username: admin.username });
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ username: req.admin.username });
});

export default router;
