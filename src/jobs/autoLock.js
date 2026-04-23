import cron from 'node-cron';
import { query } from '../config/db.js';

export function startAutoLock() {
  cron.schedule('5 0 * * *', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];
    try {
      const result = await query(`
        UPDATE daily_records
        SET is_locked = true, locked_at = NOW()
        WHERE record_date = $1 AND is_locked = false
        RETURNING id
      `, [date]);
      console.log(`[AutoLock] ${date}: ${result.rowCount} ta yozuv qulflandi`);
    } catch (err) {
      console.error('[AutoLock] Xato:', err.message);
    }
  }, { timezone: 'Asia/Tashkent' });

  console.log('[AutoLock] Cron job ishga tushdi (00:05 Toshkent vaqti)');
}
