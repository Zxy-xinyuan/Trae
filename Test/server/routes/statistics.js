const express = require('express');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/unchecked', verifyToken, async (req, res) => {
  try {
    const [settingsRows] = await pool.execute(
      "SELECT `value` FROM settings WHERE `key` = 'inspection_period_days'"
    );
    const periodDays = settingsRows.length > 0 ? parseInt(settingsRows[0].value) : 7;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    const [studios] = await pool.execute(
      `SELECT s.id, s.name, u.real_name AS manager_name
       FROM studios s
       LEFT JOIN users u ON s.manager_id = u.id
       WHERE s.id NOT IN (
         SELECT DISTINCT studio_id FROM inspections WHERE submitted_at >= ?
       )
       ORDER BY s.id`,
      [cutoffStr]
    );

    res.json({ code: 200, data: { periodDays, list: studios } });
  } catch (err) {
    console.error('Get unchecked error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/issues', verifyToken, async (req, res) => {
  try {
    const [itemStats] = await pool.execute(
      `SELECT
        SUM(CASE WHEN fire_safety = 0 THEN 1 ELSE 0 END) AS fire_fail,
        SUM(CASE WHEN electrical_safety = 0 THEN 1 ELSE 0 END) AS electrical_fail,
        SUM(CASE WHEN equipment_safety = 0 THEN 1 ELSE 0 END) AS equipment_fail,
        SUM(CASE WHEN environment_safety = 0 THEN 1 ELSE 0 END) AS environment_fail,
        COUNT(*) AS total
       FROM inspections`
    );

    const [severityStats] = await pool.execute(
      `SELECT severity, COUNT(*) AS count
       FROM inspections
       WHERE severity IS NOT NULL AND severity != ''
       GROUP BY severity`
    );

    const [statusStats] = await pool.execute(
      `SELECT status, COUNT(*) AS count
       FROM inspections
       GROUP BY status`
    );

    res.json({
      code: 200,
      data: {
        itemStats: itemStats[0],
        severityStats,
        statusStats
      }
    });
  } catch (err) {
    console.error('Get issues error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/ranking', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
        s.id AS studio_id,
        s.name AS studio_name,
        COUNT(i.id) AS total_inspections,
        SUM(CASE WHEN i.status IN ('approved', 'completed') THEN 1 ELSE 0 END) AS passed_inspections,
        ROUND(
          IFNULL(
            SUM(CASE WHEN i.status IN ('approved', 'completed') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(i.id), 0),
            0
          ), 1
        ) AS pass_rate
       FROM studios s
       LEFT JOIN inspections i ON s.id = i.studio_id
       GROUP BY s.id, s.name
       ORDER BY pass_rate DESC, total_inspections DESC`
    );

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('Get ranking error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/report', verifyToken, async (req, res) => {
  try {
    const [overview] = await pool.execute(
      `SELECT
        COUNT(*) AS total_inspections,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
        SUM(CASE WHEN status = 'needs_rectify' THEN 1 ELSE 0 END) AS needs_rectify_count,
        SUM(CASE WHEN status = 'rectifying' THEN 1 ELSE 0 END) AS rectifying_count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count
       FROM inspections`
    );

    const [monthlyStats] = await pool.execute(
      `SELECT
        DATE_FORMAT(submitted_at, '%Y-%m') AS month,
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('approved', 'completed') THEN 1 ELSE 0 END) AS passed
       FROM inspections
       WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(submitted_at, '%Y-%m')
       ORDER BY month`
    );

    const [studioStats] = await pool.execute(
      `SELECT
        s.name AS studio_name,
        COUNT(i.id) AS total,
        SUM(CASE WHEN i.status IN ('approved', 'completed') THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN i.status = 'needs_rectify' THEN 1 ELSE 0 END) AS needs_rectify,
        SUM(CASE WHEN i.status = 'rectifying' THEN 1 ELSE 0 END) AS rectifying
       FROM studios s
       LEFT JOIN inspections i ON s.id = i.studio_id
       GROUP BY s.id, s.name
       ORDER BY s.id`
    );

    res.json({
      code: 200,
      data: {
        overview: overview[0],
        monthlyStats,
        studioStats
      }
    });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/export-excel', verifyToken, async (req, res) => {
  try {
    console.log('[Excel] Starting export...');

    const workbook = new ExcelJS.Workbook();

    const sheet1 = workbook.addWorksheet('检查概览');
    sheet1.columns = [
      { header: '指标', key: 'label', width: 20 },
      { header: '数值', key: 'value', width: 15 }
    ];

    const [overview] = await pool.query(`SELECT COUNT(*) AS total_inspections, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count, SUM(CASE WHEN status = 'needs_rectify' THEN 1 ELSE 0 END) AS needs_rectify_count, SUM(CASE WHEN status = 'rectifying' THEN 1 ELSE 0 END) AS rectifying_count, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count FROM inspections`);
    const ov = overview[0];
    sheet1.addRows([
      { label: '总检查数', value: ov.total_inspections },
      { label: '待审核', value: ov.pending_count },
      { label: '已通过', value: ov.approved_count },
      { label: '需整改', value: ov.needs_rectify_count },
      { label: '整改中', value: ov.rectifying_count },
      { label: '已完成', value: ov.completed_count }
    ]);
    console.log('[Excel] Sheet1 done');

    const sheet2 = workbook.addWorksheet('工作室排名');
    sheet2.columns = [
      { header: '工作室', key: 'studio_name', width: 20 },
      { header: '检查总数', key: 'total', width: 12 },
      { header: '通过数', key: 'passed', width: 12 },
      { header: '通过率(%)', key: 'pass_rate', width: 12 }
    ];
    const [ranking] = await pool.query(`SELECT s.name AS studio_name, COUNT(i.id) AS total, SUM(CASE WHEN i.status IN ('approved', 'completed') THEN 1 ELSE 0 END) AS passed, ROUND(IFNULL(SUM(CASE WHEN i.status IN ('approved', 'completed') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(i.id), 0), 0), 1) AS pass_rate FROM studios s LEFT JOIN inspections i ON s.id = i.studio_id GROUP BY s.id, s.name ORDER BY pass_rate DESC`);
    ranking.forEach(r => sheet2.addRow(r));
    console.log('[Excel] Sheet2 done');

    const sheet3 = workbook.addWorksheet('检查明细');
    sheet3.columns = [
      { header: '工作室', key: 'studio_name', width: 18 },
      { header: '提交人', key: 'submitter_name', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '消防安全', key: 'fire_safety', width: 10 },
      { header: '用电安全', key: 'electrical_safety', width: 10 },
      { header: '设备安全', key: 'equipment_safety', width: 10 },
      { header: '环境安全', key: 'environment_safety', width: 10 },
      { header: '严重程度', key: 'severity', width: 12 },
      { header: '提交时间', key: 'submitted_at', width: 20 }
    ];
    const [details] = await pool.query(`SELECT s.name AS studio_name, u.real_name AS submitter_name, i.status, i.fire_safety, i.electrical_safety, i.equipment_safety, i.environment_safety, i.severity, i.submitted_at FROM inspections i LEFT JOIN studios s ON i.studio_id = s.id LEFT JOIN users u ON i.submitter_id = u.id ORDER BY i.submitted_at DESC`);
    const statusMap = { pending: '待审核', approved: '已通过', needs_rectify: '需整改', rectifying: '整改中', completed: '已完成' };
    details.forEach(d => {
      sheet3.addRow({
        studio_name: d.studio_name,
        submitter_name: d.submitter_name,
        status: statusMap[d.status] || d.status,
        fire_safety: d.fire_safety ? '通过' : '不通过',
        electrical_safety: d.electrical_safety ? '通过' : '不通过',
        equipment_safety: d.equipment_safety ? '通过' : '不通过',
        environment_safety: d.environment_safety ? '通过' : '不通过',
        severity: d.severity || '',
        submitted_at: d.submitted_at ? new Date(d.submitted_at).toLocaleString('zh-CN') : ''
      });
    });
    console.log('[Excel] Sheet3 done');

    const buffer = await workbook.xlsx.writeBuffer();
    console.log('[Excel] Buffer size:', buffer.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=export.xlsx');
    res.send(buffer);
    console.log('[Excel] Response sent successfully');
  } catch (err) {
    console.error('[Excel] Fatal error:', err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ code: 500, message: '导出失败: ' + err.message });
    }
  }
});

router.get('/export-inspection-records', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        s.name AS studio_name,
        s.location,
        u.real_name AS manager_name,
        i.fire_safety,
        i.electrical_safety,
        i.equipment_safety,
        i.environment_safety,
        i.status,
        i.severity,
        i.audit_comment,
        i.watermarked_photo_path,
        i.photo_path,
        i.submitted_at,
         ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY i.submitted_at DESC) AS rn
       FROM studios s
       LEFT JOIN inspections i ON s.id = i.studio_id
       LEFT JOIN users u ON s.manager_id = u.id`
    );

    const latestPerStudio = (rows || []).filter(r => r.rn === 1 || r.rn === null);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('排查记录');

    const now = new Date();
    const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';

    sheet.mergeCells('A1:I1');
    const titleRow = sheet.getRow(1);
    titleRow.height = 30;
    titleRow.getCell(1).value = '工作室安全检查排查表（排查日期：' + dateStr + '）     检查人：' + (req.user.real_name || req.user.username);
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const headerRow = sheet.getRow(2);
    const headers = ['工作室名称', '场地位置', '工作室负责人', '消防安全', '用电安全', '设备安全', '环境安全', '审核状态', '问题拍照'];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E6F2' } };
    });
    headerRow.commit();

    latestPerStudio.forEach((r, idx) => {
      const row = sheet.getRow(idx + 3);
      const checkMark = (val) => val === 1 ? '✓' : val === 0 ? '✗' : '—';
      const statusLabel = { pending: '待审核', approved: '通过', needs_rectify: '需整改', rectifying: '整改中', completed: '已完成' };
      row.getCell(1).value = r.studio_name || '';
      row.getCell(2).value = r.location || '';
      row.getCell(3).value = r.manager_name || '';
      row.getCell(4).value = r.fire_safety != null ? checkMark(r.fire_safety) : '';
      row.getCell(5).value = r.electrical_safety != null ? checkMark(r.electrical_safety) : '';
      row.getCell(6).value = r.equipment_safety != null ? checkMark(r.equipment_safety) : '';
      row.getCell(7).value = r.environment_safety != null ? checkMark(r.environment_safety) : '';
      row.getCell(8).value = r.status ? (statusLabel[r.status] || r.status) : '未检查';
      row.getCell(9).value = r.watermarked_photo_path || r.photo_path || '';
      row.commit();
    });

    sheet.columns = [
      { width: 22 }, { width: 16 }, { width: 18 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 },
      { width: 12 }, { width: 36 }
    ];

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = cell.alignment || { horizontal: 'center', vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inspection_records.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error('[Excel] Inspection records error:', err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ code: 500, message: '导出失败: ' + err.message });
    }
  }
});

const exportTasks = new Map();
const TASK_CLEANUP_MS = 30 * 60 * 1000;
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

function generateTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function cleanupOldTasks() {
  const cutoff = Date.now() - TASK_CLEANUP_MS;
  for (const [taskId, task] of exportTasks) {
    if (task.createdAt < cutoff) {
      if (task.zipPath && fs.existsSync(task.zipPath)) {
        fs.unlink(task.zipPath, () => { });
      }
      exportTasks.delete(taskId);
    }
  }
}

setInterval(cleanupOldTasks, 5 * 60 * 1000);

if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

router.post('/export-records', verifyToken, async (req, res) => {
  try {
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ code: 400, message: '请选择导出时间区间' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ code: 400, message: '时间格式不正确' });
    }

    if (start >= end) {
      return res.status(400).json({ code: 400, message: '开始时间必须早于结束时间' });
    }

    const taskId = generateTaskId();
    const task = {
      id: taskId,
      status: 'processing',
      progress: 0,
      message: '正在准备导出...',
      createdAt: Date.now(),
      zipPath: null,
      totalRecords: 0,
      processedRecords: 0
    };
    exportTasks.set(taskId, task);

    res.json({
      code: 200,
      message: '导出任务已创建',
      data: { taskId }
    });

    processExportTask(taskId, start, end, req.user).catch(err => {
      console.error('[Export] Task failed:', taskId, err.message);
      const t = exportTasks.get(taskId);
      if (t) {
        t.status = 'failed';
        t.message = '导出失败: ' + err.message;
      }
    });
  } catch (err) {
    console.error('[Export] Create task error:', err);
    res.status(500).json({ code: 500, message: '创建导出任务失败' });
  }
});

router.get('/export-status/:taskId', verifyToken, (req, res) => {
  const task = exportTasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({ code: 404, message: '导出任务不存在或已过期' });
  }
  res.json({
    code: 200,
    data: {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      message: task.message,
      totalRecords: task.totalRecords,
      processedRecords: task.processedRecords
    }
  });
});

router.get('/export-download/:taskId', verifyToken, (req, res) => {
  const task = exportTasks.get(req.params.taskId);
  if (!task) {
    return res.status(404).json({ code: 404, message: '导出文件不存在或已过期' });
  }
  if (task.status !== 'completed') {
    return res.status(400).json({ code: 400, message: '导出尚未完成' });
  }
  if (!task.zipPath || !fs.existsSync(task.zipPath)) {
    return res.status(404).json({ code: 404, message: '导出文件已被清理' });
  }

  const filename = '安全检查记录导出_' + new Date().toISOString().slice(0, 10) + '.zip';
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.sendFile(task.zipPath);
});

async function processExportTask(taskId, start, end, user) {
  const task = exportTasks.get(taskId);
  if (!task) return;

  try {
    task.message = '正在查询记录...';
    task.progress = 10;

    const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

    const [rows] = await pool.query(
      `SELECT i.*, s.name AS studio_name, s.location AS studio_location,
              u.real_name AS submitter_name
       FROM inspections i
       LEFT JOIN studios s ON i.studio_id = s.id
       LEFT JOIN users u ON i.submitter_id = u.id
       WHERE i.submitted_at >= ? AND i.submitted_at <= ?
       ORDER BY i.submitted_at DESC`,
      [startStr, endStr]
    );

    task.totalRecords = rows.length;
    task.message = `找到 ${rows.length} 条记录，正在生成 Excel...`;
    task.progress = 30;

    const statusLabel = {
      pending: '待审核', approved: '已通过', needs_rectify: '需整改',
      rectifying: '整改中', completed: '已完成'
    };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('检查记录');

    sheet.mergeCells('A1:K1');
    const titleRow = sheet.getRow(1);
    titleRow.height = 32;
    titleRow.getCell(1).value = `安全检查记录导出（${start.toLocaleDateString('zh-CN')} ~ ${end.toLocaleDateString('zh-CN')}）     导出人: ${user.real_name || user.username}     共 ${rows.length} 条`;
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const headers = ['序号', '工作室', '场地位置', '提交人', '消防安全', '用电安全', '设备安全', '环境安全', '审核状态', '严重程度', '现场照片'];
    const headerRow = sheet.getRow(2);
    headerRow.height = 24;
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    });
    headerRow.commit();

    const photoDir = path.join(EXPORTS_DIR, taskId + '_photos');
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true });
    }

    const checkMark = (val) => val === 1 ? '✓ 通过' : val === 0 ? '✗ 不通过' : '—';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const row = sheet.getRow(i + 3);
      row.height = 24;

      row.getCell(1).value = i + 1;
      row.getCell(2).value = r.studio_name || '';
      row.getCell(3).value = r.studio_location || '';
      row.getCell(4).value = r.submitter_name || '';
      row.getCell(5).value = checkMark(r.fire_safety);
      row.getCell(6).value = checkMark(r.electrical_safety);
      row.getCell(7).value = checkMark(r.equipment_safety);
      row.getCell(8).value = checkMark(r.environment_safety);
      row.getCell(9).value = statusLabel[r.status] || r.status || '';
      row.getCell(10).value = r.severity || '';

      const cell = row.getCell(11);
      const photoRelPaths = [];
      const photoFilesToCopy = [];

      if (r.watermarked_photo_path) {
        const src = path.join(__dirname, '..', r.watermarked_photo_path);
        if (fs.existsSync(src)) {
          const fname = 'watermarked_' + path.basename(r.watermarked_photo_path);
          photoFilesToCopy.push({ src, dest: path.join(photoDir, fname) });
          const relPath = './photos/' + fname;
          photoRelPaths.push(relPath);
        }
      } else if (r.photo_path) {
        const src = path.join(__dirname, '..', r.photo_path);
        if (fs.existsSync(src)) {
          const fname = 'original_' + path.basename(r.photo_path);
          photoFilesToCopy.push({ src, dest: path.join(photoDir, fname) });
          const relPath = './photos/' + fname;
          photoRelPaths.push(relPath);
        }
      }

      if (r.rectify_photos) {
        try {
          const rectifyArr = typeof r.rectify_photos === 'string'
            ? JSON.parse(r.rectify_photos)
            : r.rectify_photos;
          if (Array.isArray(rectifyArr)) {
            rectifyArr.forEach((rp, rpIdx) => {
              const src = path.join(__dirname, '..', rp);
              if (fs.existsSync(src)) {
                const fname = 'rectify_' + (rpIdx + 1) + '_' + path.basename(rp);
                photoFilesToCopy.push({ src, dest: path.join(photoDir, fname) });
                photoRelPaths.push('./photos/' + fname);
              }
            });
          }
        } catch { /* ignore */ }
      }

      for (const { src, dest } of photoFilesToCopy) {
        try {
          fs.copyFileSync(src, dest);
        } catch { /* ignore copy errors */ }
      }

      if (photoRelPaths.length > 0) {
        const firstPhoto = photoRelPaths[0];
        cell.value = { text: `查看照片(${photoRelPaths.length}张)`, hyperlink: firstPhoto };
        cell.font = { color: { argb: 'FF0563C1' }, underline: true, size: 11 };
      } else {
        cell.value = '无照片';
        cell.font = { color: { argb: 'FF999999' }, size: 11 };
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      row.eachCell((c) => {
        c.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
        c.alignment = c.alignment || { horizontal: 'center', vertical: 'middle' };
      });
      row.commit();

      task.processedRecords = i + 1;
      task.progress = 30 + Math.floor((i + 1) / rows.length * 50);
    }

    sheet.columns = [
      { width: 6 }, { width: 18 }, { width: 16 }, { width: 12 },
      { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 10 }, { width: 22 }
    ];

    task.message = '正在打包文件...';
    task.progress = 85;

    const xlsxPath = path.join(EXPORTS_DIR, taskId + '.xlsx');
    await workbook.xlsx.writeFile(xlsxPath);

    task.progress = 90;
    task.message = '正在压缩打包...';

    const zipPath = path.join(EXPORTS_DIR, taskId + '.zip');

    const zip = new AdmZip();
    zip.addFile('records.xlsx', fs.readFileSync(xlsxPath));
    zip.addLocalFolder(photoDir, 'photos');
    zip.writeZip(zipPath);

    fs.unlink(xlsxPath, () => { });
    fs.rm(photoDir, { recursive: true, force: true }, () => { });

    task.zipPath = zipPath;
    task.status = 'completed';
    task.progress = 100;
    task.message = `导出完成，共 ${rows.length} 条记录`;
  } catch (err) {
    console.error('[Export] Processing error:', err);
    task.status = 'failed';
    task.message = '导出失败: ' + err.message;
  }
}

module.exports = router;
