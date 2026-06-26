const express = require('express');
const pool = require('../config/db');
const upload = require('../middleware/upload');
const { verifyToken, auth } = require('../middleware/auth');
const { addWatermark } = require('../utils/watermark');
const { createNotification } = require('../utils/notification');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.post('/', verifyToken, auth('inspector'), upload.single('photo'), async (req, res) => {
  try {
    const { studio_id, fire_safety, electrical_safety, equipment_safety, environment_safety } = req.body;

    if (!studio_id) {
      if (req.file) fs.unlink(req.file.path, () => { });
      return res.status(400).json({ code: 400, message: '请选择工作室' });
    }

    let photoPath = null;
    let watermarkedPath = null;

    if (req.file) {
      photoPath = '/uploads/' + req.file.filename;

      const [studioRows] = await pool.execute('SELECT name FROM studios WHERE id = ?', [studio_id]);
      const studioName = studioRows.length > 0 ? studioRows[0].name : '未知工作室';

      try {
        const outputPath = await addWatermark(req.file.path, studioName);
        watermarkedPath = '/uploads/' + path.basename(outputPath);
      } catch (watermarkErr) {
        console.error('Watermark error:', watermarkErr);
        watermarkedPath = photoPath;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO inspections (studio_id, submitter_id, fire_safety, electrical_safety, equipment_safety, environment_safety, photo_path, watermarked_photo_path, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        studio_id,
        req.user.id,
        fire_safety === '1' || fire_safety === 1 ? 1 : 0,
        electrical_safety === '1' || electrical_safety === 1 ? 1 : 0,
        equipment_safety === '1' || equipment_safety === 1 ? 1 : 0,
        environment_safety === '1' || environment_safety === 1 ? 1 : 0,
        photoPath,
        watermarkedPath
      ]
    );

    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
    const [studioInfo] = await pool.execute('SELECT name FROM studios WHERE id = ?', [studio_id]);
    const studioName = studioInfo.length > 0 ? studioInfo[0].name : '未知工作室';

    for (const admin of admins) {
      await createNotification(
        admin.id,
        '新的检查记录待审核',
        `工作室"${studioName}"提交了新的安全检查，请尽快审核。`,
        'inspection',
        result.insertId
      );
    }

    res.json({ code: 200, message: '提交成功，等待管理员审核', data: { id: result.insertId } });
  } catch (err) {
    console.error('Submit inspection error:', err);
    if (req.file) fs.unlink(req.file.path, () => { });
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, studio_id, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    if (studio_id) {
      whereClause += ' AND i.studio_id = ?';
      params.push(studio_id);
    }

    if (req.user.role === 'manager') {
      whereClause += ' AND i.studio_id IN (SELECT id FROM studios WHERE manager_id = ?)';
      params.push(req.user.id);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM inspections i ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const sql = `
      SELECT i.*, s.name AS studio_name,
             u.real_name AS submitter_name
      FROM inspections i
      LEFT JOIN studios s ON i.studio_id = s.id
      LEFT JOIN users u ON i.submitter_id = u.id
      ${whereClause}
      ORDER BY i.submitted_at DESC LIMIT ${parseInt(pageSize)} OFFSET ${offset}
    `;

    const [rows] = await pool.query(sql, params);

    res.json({
      code: 200,
      data: {
        list: rows,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (err) {
    console.error('Get inspections error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.put('/:id/audit', verifyToken, auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, severity, audit_comment } = req.body;

    if (!['approved', 'needs_rectify'].includes(status)) {
      return res.status(400).json({ code: 400, message: '审核状态必须为approved或needs_rectify' });
    }

    const [existing] = await pool.execute('SELECT * FROM inspections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '检查记录不存在' });
    }

    if (existing[0].status !== 'pending') {
      return res.status(400).json({ code: 400, message: '该检查记录已审核，不能重复审核' });
    }

    await pool.execute(
      'UPDATE inspections SET status = ?, severity = ?, audit_comment = ?, audited_at = NOW() WHERE id = ?',
      [status, severity || null, audit_comment || null, id]
    );

    if (status === 'needs_rectify') {
      const studioId = existing[0].studio_id;
      const [studioRows] = await pool.execute('SELECT id, name, manager_id FROM studios WHERE id = ?', [studioId]);
      if (studioRows.length > 0 && studioRows[0].manager_id) {
        await createNotification(
          studioRows[0].manager_id,
          '检查需整改',
          `工作室"${studioRows[0].name}"的安全检查需要整改，请尽快提交整改材料。`,
          'rectify',
          parseInt(id)
        );
      }
    }

    res.json({ code: 200, message: '审核完成' });
  } catch (err) {
    console.error('Audit inspection error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.put('/:id/rectify', verifyToken, auth('manager'), upload.array('rectify_photos', 9), async (req, res) => {
  try {
    const { id } = req.params;
    const { rectify_description } = req.body;

    const [existing] = await pool.execute('SELECT * FROM inspections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '检查记录不存在' });
    }

    if (existing[0].status !== 'needs_rectify' && existing[0].status !== 'rectifying') {
      return res.status(400).json({ code: 400, message: '当前状态不支持提交整改' });
    }

    const studioId = existing[0].studio_id;
    const [studioRows] = await pool.execute('SELECT manager_id FROM studios WHERE id = ?', [studioId]);
    if (studioRows.length === 0 || studioRows[0].manager_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '只能提交自己工作室的整改' });
    }

    let rectifyPhotos = [];
    if (existing[0].rectify_photos) {
      try {
        rectifyPhotos = JSON.parse(existing[0].rectify_photos);
      } catch (e) {
        rectifyPhotos = [];
      }
    }

    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(f => '/uploads/' + f.filename);
      rectifyPhotos = rectifyPhotos.concat(newPhotos);
    }

    await pool.execute(
      'UPDATE inspections SET status = ?, rectify_description = ?, rectify_photos = ?, rectified_at = NOW() WHERE id = ?',
      ['rectifying', rectify_description || existing[0].rectify_description, JSON.stringify(rectifyPhotos), id]
    );

    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
    const [studioInfo] = await pool.execute('SELECT name FROM studios WHERE id = ?', [studioId]);
    const studioName = studioInfo.length > 0 ? studioInfo[0].name : '未知工作室';

    for (const admin of admins) {
      await createNotification(
        admin.id,
        '整改材料已提交',
        `工作室"${studioName}"已提交整改材料，请确认。`,
        'rectify',
        parseInt(id)
      );
    }

    res.json({ code: 200, message: '整改材料提交成功' });
  } catch (err) {
    console.error('Rectify inspection error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.post('/batch-audit', verifyToken, auth('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { ids, status, severity, audit_comment } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择至少一条检查记录' });
    }

    if (!['approved', 'needs_rectify'].includes(status)) {
      return res.status(400).json({ code: 400, message: '审核状态必须为approved或needs_rectify' });
    }

    const numericIds = ids.map(Number).filter(id => !isNaN(id));
    if (numericIds.length === 0) {
      return res.status(400).json({ code: 400, message: 'ID参数无效' });
    }

    const placeholders = numericIds.map(() => '?').join(',');
    const [existing] = await connection.query(
      `SELECT id, status, studio_id FROM inspections WHERE id IN (${placeholders})`,
      numericIds
    );

    const existingIds = existing.map(r => r.id);
    const notFound = numericIds.filter(id => !existingIds.includes(id));
    const notPending = existing.filter(r => r.status !== 'pending').map(r => r.id);

    if (notFound.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `以下记录不存在: ${notFound.join(', ')}`
      });
    }

    if (notPending.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `以下记录不是待审核状态: ${notPending.join(', ')}`
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE inspections SET status = ?, severity = ?, audit_comment = ?, audited_at = NOW() WHERE id IN (${placeholders})`,
      [status, severity || null, audit_comment || null, ...numericIds]
    );

    await connection.execute(
      `INSERT INTO audit_logs (user_id, username, action, target_type, target_ids, detail, result)
       VALUES (?, ?, 'batch_audit', 'inspections', ?, ?, 'success')`,
      [
        req.user.id,
        req.user.username,
        JSON.stringify(numericIds),
        `批量审核${numericIds.length}条检查记录，审核结果: ${status === 'approved' ? '通过' : '需整改'}${severity ? `，严重程度: ${severity}` : ''}${audit_comment ? `，审核意见: ${audit_comment}` : ''}`
      ]
    );

    await connection.commit();

    if (status === 'needs_rectify') {
      const studioIds = [...new Set(existing.map(r => r.studio_id))];
      for (const studioId of studioIds) {
        const [studioRows] = await pool.execute('SELECT id, name, manager_id FROM studios WHERE id = ?', [studioId]);
        if (studioRows.length > 0 && studioRows[0].manager_id) {
          await createNotification(
            studioRows[0].manager_id,
            '检查需整改',
            `工作室"${studioRows[0].name}"的安全检查需要整改，请尽快提交整改材料。`,
            'rectify',
            null
          );
        }
      }
    }

    res.json({
      code: 200,
      message: `成功审核 ${numericIds.length} 条记录`,
      data: { successCount: numericIds.length }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Batch audit error:', err);
    res.status(500).json({ code: 500, message: '批量审核失败，服务器内部错误' });
  } finally {
    connection.release();
  }
});

router.put('/:id/confirm', verifyToken, auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT * FROM inspections WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '检查记录不存在' });
    }

    if (existing[0].status !== 'rectifying') {
      return res.status(400).json({ code: 400, message: '当前状态不支持确认完成' });
    }

    await pool.execute(
      'UPDATE inspections SET status = ?, completed_at = NOW() WHERE id = ?',
      ['completed', id]
    );

    const studioId = existing[0].studio_id;
    const [studioRows] = await pool.execute('SELECT manager_id, name FROM studios WHERE id = ?', [studioId]);
    if (studioRows.length > 0 && studioRows[0].manager_id) {
      await createNotification(
        studioRows[0].manager_id,
        '整改已通过',
        `工作室"${studioRows[0].name}"的整改已确认完成。`,
        'inspection',
        parseInt(id)
      );
    }

    res.json({ code: 200, message: '确认完成' });
  } catch (err) {
    console.error('Confirm inspection error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

module.exports = router;
