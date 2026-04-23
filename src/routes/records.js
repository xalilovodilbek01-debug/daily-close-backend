import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, requireDepartmentAccess } from '../middleware/auth.js';
import { sendDepartmentComplete } from '../services/telegram.js';

const router = Router();
router.use(authenticate);

router.get('/daily/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const { rows } = await query(`
      SELECT
        d.id             AS department_id,
        d.name           AS department_name,
        d.code,
        d.sort_order,
        dr.id            AS record_id,
        dr.is_locked,
        dr.completed_at,
        dt.id            AS task_id,
        dt.task_key,
        dt.label         AS task_label,
        dt.sort_order    AS task_order,
        COALESCE(tc.is_done, false) AS is_done,
        tc.done_by,
        tc.done_at,
        tc.note,
        u.name           AS done_by_name
      FROM departments d
      JOIN department_tasks dt ON dt.department_id = d.id
      LEFT JOIN daily_records dr
        ON dr.department_id = d.id AND dr.record_date = $1
      LEFT JOIN task_completions tc
        ON tc.daily_record_id = dr.id AND tc.task_id = dt.id
      LEFT JOIN users u ON u.id = tc.done_by
      ORDER BY d.sort_order, dt.sort_order
    `, [date]);

    const deptMap = {};
    for (const row of rows) {
      if (!deptMap[row.department_id]) {
        deptMap[row.department_id] = {
          id: row.department_id,
          name: row.department_name,
          code: row.code,
          record_id: row.record_id,
          is_locked: row.is_locked ?? false,
          completed_at: row.completed_at,
          tasks: []
        };
      }
      deptMap[row.department_id].tasks.push({
        id: row.task_id,
        key: row.task_key,
        label: row.task_label,
        is_done: row.is_done,
        done_by: row.done_by,
        done_by_name: row.done_by_name,
        done_at: row.done_at,
        note: row.note
      });
    }

    const departments = Object.values(deptMap);
    let total = 0, done = 0;
    const by_department = departments.map(dept => {
      const t = dept.tasks.length;
      const d = dept.tasks.filter(x => x.is_done).length;
      total += t; done += d;
      return {
        department_id: dept.id,
        department_name: dept.name,
        percent: t ? Math.round(d / t * 100) : 0
      };
    });

    res.json({
      date,
      departments,
      kpi: {
        global_percent: total ? Math.round(done / total * 100) : 0,
        total_tasks: total,
        done_tasks: done,
        by_department
      }
    });
  } catch (err) { next(err); }
});

router.patch(
  '/daily/:date/departments/:departmentId/tasks/:taskId',
  requireDepartmentAccess,
  async (req, res, next) => {
    try {
      const { date, departmentId, taskId } = req.params;
      const { is_done, note } = req.body;

      const lockCheck = await query(
        'SELECT id, is_locked FROM daily_records WHERE record_date = $1 AND department_id = $2',
        [date, departmentId]
      );
      if (lockCheck.rows[0]?.is_locked && req.user.role !== 'admin')
        return res.status(423).json({ error: 'Bu kun yopilgan. Admin ruxsati kerak.' });

      const recordRes = await query(`
        INSERT INTO daily_records (record_date, department_id)
        VALUES ($1, $2)
        ON CONFLICT (record_date, department_id) DO UPDATE SET record_date = EXCLUDED.record_date
        RETURNING id
      `, [date, departmentId]);
      const recordId = recordRes.rows[0].id;

      await query(`
        INSERT INTO task_completions (daily_record_id, task_id, is_done, done_by, done_at, note)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (daily_record_id, task_id) DO UPDATE
          SET is_done = $3, done_by = $4, done_at = $5, note = $6
      `, [recordId, taskId, is_done, req.user.id, is_done ? new Date() : null, note ?? null]);

      if (is_done) {
        const { rows } = await query(`
          SELECT
            COUNT(dt.id)                                     AS total,
            COUNT(tc.id) FILTER (WHERE tc.is_done = true)   AS done,
            dr.notified
          FROM department_tasks dt
          JOIN daily_records dr ON dr.id = $1
          LEFT JOIN task_completions tc
            ON tc.task_id = dt.id AND tc.daily_record_id = $1
          WHERE dt.department_id = $2
          GROUP BY dr.notified
        `, [recordId, departmentId]);

        const prog = rows[0];
        if (prog && Number(prog.done) === Number(prog.total) && !prog.notified) {
          await query(
            'UPDATE daily_records SET completed_at = NOW(), notified = true WHERE id = $1',
            [recordId]
          );
          sendDepartmentComplete(departmentId, date).catch(console.error);
        }
      }

      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

export default router;
