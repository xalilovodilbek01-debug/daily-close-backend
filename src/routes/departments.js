import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, code, name, sort_order FROM departments ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
