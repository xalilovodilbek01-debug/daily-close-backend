import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.post('/records/:recordId/lock', async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const { lock, reason } = req.body;

    await query(
      'UPDATE daily_records SET is_locked=$1, locked_at=$2, locked_by=$3 WHERE id=$4',
      [lock, lock ? new Date() : null, lock ? req.user.id : null, recordId]
    );
    if (!lock && reason) {
      await query(
        'INSERT INTO override_logs (daily_record_id, admin_id, reason) VALUES ($1,$2,$3)',
        [recordId, req.user.id, reason]
      );
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/kpi/summary', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFrom = from || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const dateTo   = to   || new Date().toISOString().split('T')[0];

    const { rows } = await query(`
      SELECT
        dr.record_date,
        d.name                                                 AS department,
        COUNT(dt.id)                                           AS total_tasks,
        COUNT(tc.id) FILTER (WHERE tc.is_done)                AS done_tasks,
        ROUND(COUNT(tc.id) FILTER (WHERE tc.is_done) * 100.0
          / NULLIF(COUNT(dt.id), 0), 1)                       AS completion_pct
      FROM daily_records dr
      JOIN departments d       ON d.id  = dr.department_id
      JOIN department_tasks dt ON dt.department_id = dr.department_id
      LEFT JOIN task_completions tc
        ON tc.daily_record_id = dr.id AND tc.task_id = dt.id
      WHERE dr.record_date BETWEEN $1 AND $2
      GROUP BY dr.record_date, d.name, d.sort_order
      ORDER BY dr.record_date DESC, d.sort_order
    `, [dateFrom, dateTo]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, role, department_id } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO users (name,email,password,role,department_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role',
      [name, email.toLowerCase(), hash, role, department_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, d.name AS department
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       ORDER BY u.created_at`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
