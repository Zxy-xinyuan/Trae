const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
    }

    const [rows] = await pool.execute(
      'SELECT u.id, u.username, u.password, u.role, u.real_name, u.studio_id, s.name AS studio_name FROM users u LEFT JOIN studios s ON u.studio_id = s.id WHERE u.username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          real_name: user.real_name,
          studio_id: user.studio_id,
          studio_name: user.studio_name || null
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT u.id, u.username, u.role, u.real_name, u.studio_id, s.name AS studio_name FROM users u LEFT JOIN studios s ON u.studio_id = s.id WHERE u.id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const user = rows[0];
    res.json({
      code: 200,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        real_name: user.real_name,
        studio_id: user.studio_id,
        studio_name: user.studio_name || null
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;
