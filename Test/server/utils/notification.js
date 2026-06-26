const pool = require('../config/db');

async function createNotification(userId, title, content, type = 'system', relatedId = null) {
  const [result] = await pool.execute(
    'INSERT INTO notifications (user_id, title, content, type, related_id) VALUES (?, ?, ?, ?, ?)',
    [userId, title, content, type, relatedId]
  );
  return result.insertId;
}

async function checkUnsubmittedInspections() {
  const connection = await pool.getConnection();
  try {
    const [settingsRows] = await connection.execute(
      "SELECT `value` FROM settings WHERE `key` = 'inspection_period_days'"
    );
    const periodDays = settingsRows.length > 0 ? parseInt(settingsRows[0].value) : 7;

    const [studios] = await connection.execute('SELECT id, name, manager_id FROM studios');
    const [inspectors] = await connection.execute("SELECT id FROM users WHERE role = 'inspector'");
    const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin'");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    for (const studio of studios) {
      const [recentInspections] = await connection.execute(
        'SELECT id FROM inspections WHERE studio_id = ? AND submitted_at >= ? LIMIT 1',
        [studio.id, cutoffStr]
      );

      if (recentInspections.length === 0) {
        const title = '检查未提交提醒';
        const content = `工作室"${studio.name}"已超过${periodDays}天未提交安全检查，请及时提交。`;

        if (studio.manager_id) {
          await createNotification(studio.manager_id, title, content, 'remind', studio.id);
        }

        for (const admin of admins) {
          await createNotification(admin.id, title, content, 'remind', studio.id);
        }

        for (const inspector of inspectors) {
          await createNotification(inspector.id, title, content, 'remind', studio.id);
        }
      }
    }
  } finally {
    connection.release();
  }
}

module.exports = { createNotification, checkUnsubmittedInspections };
