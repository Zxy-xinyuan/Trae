const express = require('express');
const pool = require('../config/db');
const { verifyToken, auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let studios;
    if (req.user.role === 'admin' || req.user.role === 'inspector') {
      const [rows] = await pool.execute(
        'SELECT s.id, s.name, s.location, s.manager_id, u.real_name AS manager_name, s.created_at FROM studios s LEFT JOIN users u ON s.manager_id = u.id ORDER BY s.id'
      );
      studios = rows;
    } else if (req.user.role === 'manager') {
      const [rows] = await pool.execute(
        'SELECT s.id, s.name, s.location, s.manager_id, u.real_name AS manager_name, s.created_at FROM studios s LEFT JOIN users u ON s.manager_id = u.id WHERE s.manager_id = ? ORDER BY s.id',
        [req.user.id]
      );
      studios = rows;
    }

    res.json({ code: 200, data: studios });
  } catch (err) {
    console.error('Get studios error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.post('/', verifyToken, auth('admin'), async (req, res) => {
  try {
    const { name, location, manager_id } = req.body;
    if (!name) {
      return res.status(400).json({ code: 400, message: '工作室名称不能为空' });
    }

    const [result] = await pool.execute(
      'INSERT INTO studios (name, location, manager_id) VALUES (?, ?, ?)',
      [name, location || null, manager_id || null]
    );

    if (manager_id) {
      await pool.execute('UPDATE users SET studio_id = ? WHERE id = ?', [result.insertId, manager_id]);
    }

    res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('Create studio error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.put('/:id', verifyToken, auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, manager_id } = req.body;
    if (!name) {
      return res.status(400).json({ code: 400, message: '工作室名称不能为空' });
    }

    const [existing] = await pool.execute('SELECT manager_id, location FROM studios WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '工作室不存在' });
    }

    const oldManagerId = existing[0].manager_id;

    await pool.execute(
      'UPDATE studios SET name = ?, location = ?, manager_id = ? WHERE id = ?',
      [name, location || existing[0].location, manager_id || null, id]
    );

    if (oldManagerId && oldManagerId !== manager_id) {
      await pool.execute('UPDATE users SET studio_id = NULL WHERE id = ?', [oldManagerId]);
    }
    if (manager_id) {
      await pool.execute('UPDATE users SET studio_id = ? WHERE id = ?', [id, manager_id]);
    }

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error('Update studio error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.delete('/:id', verifyToken, auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT manager_id FROM studios WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '工作室不存在' });
    }

    if (existing[0].manager_id) {
      await pool.execute('UPDATE users SET studio_id = NULL WHERE id = ?', [existing[0].manager_id]);
    }

    await pool.execute('DELETE FROM studios WHERE id = ?', [id]);

    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error('Delete studio error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;
