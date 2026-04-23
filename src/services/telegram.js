import { query } from '../config/db.js';

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT = process.env.TELEGRAM_GROUP_CHAT_ID;

export async function sendDepartmentComplete(departmentId, date) {
  if (!BOT_TOKEN) return;
  const { rows } = await query(
    'SELECT name, telegram_chat_id FROM departments WHERE id = $1', [departmentId]
  );
  if (!rows[0]) return;

  const { name, telegram_chat_id } = rows[0];
  const chatId = telegram_chat_id || DEFAULT_CHAT;
  if (!chatId) return;

  const [y, m, d] = date.split('-');
  const text = `✅ *${name}* ${d}.${m}.${y} sanasi uchun kunni muvaffaqiyatli yopdi!`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}
