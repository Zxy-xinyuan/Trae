const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyToken, auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notification');

const router = express.Router();

router.put('/password', verifyToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ code: 400, message: '旧密码和新密码不能为空' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ code: 400, message: '新密码长度不能少于6位' });
    }

    const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const isMatch = await bcrypt.compare(old_password, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ code: 400, message: '旧密码错误' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ code: 200, message: '密码修改成功' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.post('/notify', verifyToken, auth('admin'), async (req, res) => {
  try {
    const { title, content, target_role } = req.body;

    if (!title || !content) {
      return res.status(400).json({ code: 400, message: '通知标题和内容不能为空' });
    }

    let users;
    if (target_role) {
      [users] = await pool.execute('SELECT id FROM users WHERE role = ?', [target_role]);
    } else {
      [users] = await pool.execute('SELECT id FROM users');
    }

    for (const user of users) {
      await createNotification(user.id, title, content, 'system');
    }

    res.json({ code: 200, message: `已向${users.length}位用户发送通知` });
  } catch (err) {
    console.error('Notify error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;
