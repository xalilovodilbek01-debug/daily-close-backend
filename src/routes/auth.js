import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email va parol kerak' });

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });

    const token = jwt.sign(
      { id: user.id, role: user.role, department_id: user.department_id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, department_id: user.department_id }
    });
  } catch (err) { next(err); }
});

// Vaqtinchalik: admin parolini tiklash (bir marta ishlatib o'chiring)
router.get('/setup-admin', async (req, res, next) => {
  try {
    const hash = await bcrypt.hash('Admin1234', 10);
    await query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET password = $3`,
      ['Bosh Admin', 'admin@korxona.uz', hash]
    );
    res.json({ ok: true, message: 'Admin tayyor. Email: admin@korxona.uz, Parol: Admin1234' });
  } catch (err) { next(err); }
});

export default router;
