import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cybershop-secret-key-2024';
const JWT_EXPIRY = '24h';

export function generateToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
