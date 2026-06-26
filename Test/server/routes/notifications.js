const express = require('express');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { checkUnsubmittedInspections } = require('../utils/notification');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, type, is_read } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (is_read !== undefined && is_read !== '') {
      whereClause += ' AND is_read = ?';
      params.push(is_read === '1' ? 1 : 0);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM notifications ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const sql = `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ${parseInt(pageSize)} OFFSET ${offset}`;

    const [rows] = await pool.query(sql, params);

    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      code: 200,
      data: {
        list: rows,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        unreadCount: unreadCount[0].count
      }
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '通知不存在' });
    }

    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

    res.json({ code: 200, message: '已标记为已读' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.post('/remind', verifyToken, async (req, res) => {
  try {
    await checkUnsubmittedInspections();
    res.json({ code: 200, message: '提醒已发送' });
  } catch (err) {
    console.error('Remind error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;
