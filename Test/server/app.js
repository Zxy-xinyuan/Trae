const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const studioRoutes = require('./routes/studios');
const inspectionRoutes = require('./routes/inspections');
const notificationRoutes = require('./routes/notifications');
const statisticsRoutes = require('./routes/statistics');
const settingsRoutes = require('./routes/settings');

const { checkUnsubmittedInspections } = require('./utils/notification');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, req, res, next) => {
  if (err.message && err.message.includes('仅支持上传')) {
    return res.status(400).json({ code: 400, message: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 400, message: '文件大小不能超过5MB' });
  }
  console.error('Server error:', err.stack);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'inspector') NOT NULL,
        real_name VARCHAR(50) DEFAULT NULL,
        studio_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS studios (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(100) DEFAULT NULL,
        manager_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inspections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        studio_id INT NOT NULL,
        submitter_id INT NOT NULL,
        fire_safety TINYINT(1) DEFAULT 0,
        electrical_safety TINYINT(1) DEFAULT 0,
        equipment_safety TINYINT(1) DEFAULT 0,
        environment_safety TINYINT(1) DEFAULT 0,
        photo_path VARCHAR(500) DEFAULT NULL,
        watermarked_photo_path VARCHAR(500) DEFAULT NULL,
        status ENUM('pending', 'approved', 'needs_rectify', 'rectifying', 'completed') DEFAULT 'pending',
        severity VARCHAR(20) DEFAULT NULL,
        audit_comment TEXT DEFAULT NULL,
        rectify_description TEXT DEFAULT NULL,
        rectify_photos JSON DEFAULT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        audited_at TIMESTAMP NULL DEFAULT NULL,
        rectified_at TIMESTAMP NULL DEFAULT NULL,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
        FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT DEFAULT NULL,
        type VARCHAR(50) DEFAULT 'system',
        is_read TINYINT(1) DEFAULT 0,
        related_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        \`value\` TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        username VARCHAR(50) DEFAULT NULL,
        action VARCHAR(50) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_ids JSON DEFAULT NULL,
        detail TEXT DEFAULT NULL,
        result VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('数据库表初始化完成');
  } finally {
    connection.release();
  }
}

async function seedDatabase() {
  const connection = await pool.getConnection();
  try {
    const [adminRows] = await connection.execute("SELECT id FROM users WHERE username = 'admin'");
    if (adminRows.length === 0) {
      const adminHash = await bcrypt.hash('admin123', 10);
      await connection.execute(
        "INSERT INTO users (username, password, role, real_name) VALUES ('admin', ?, 'admin', '系统管理员')",
        [adminHash]
      );
      console.log('预置管理员账号: admin / admin123');
    }

    const [inspectorRows] = await connection.execute("SELECT id FROM users WHERE username = 'inspector1'");
    if (inspectorRows.length === 0) {
      const inspectorHash = await bcrypt.hash('123456', 10);
      await connection.execute(
        "INSERT INTO users (username, password, role, real_name) VALUES ('inspector1', ?, 'inspector', '李四')",
        [inspectorHash]
      );
      console.log('预置检查负责人账号: inspector1 / 123456');
    }

    const [managerRows] = await connection.execute("SELECT id FROM users WHERE username = 'manager1'");
    if (managerRows.length === 0) {
      const managerHash = await bcrypt.hash('123456', 10);
      const [result] = await connection.execute(
        "INSERT INTO users (username, password, role, real_name) VALUES ('manager1', ?, 'manager', '张三')",
        [managerHash]
      );
      const managerId = result.insertId;

      await connection.execute(
        "INSERT INTO studios (name, location, manager_id) VALUES ('张三工作室', '知诚楼16AB', ?)",
        [managerId]
      );

      const [studioRows] = await connection.execute("SELECT id FROM studios WHERE manager_id = ?", [managerId]);
      if (studioRows.length > 0) {
        await connection.execute("UPDATE users SET studio_id = ? WHERE id = ?", [studioRows[0].id, managerId]);
      }

      console.log('预置工作室负责人账号: manager1 / 123456 (张三工作室)');
    }

    const [settingsRows] = await connection.execute(
      "SELECT id FROM settings WHERE `key` = 'inspection_period_days'"
    );
    if (settingsRows.length === 0) {
      await connection.execute(
        "INSERT INTO settings (`key`, `value`) VALUES ('inspection_period_days', '7')"
      );
      console.log('预置系统设置: 检查周期 = 7天');
    }
  } finally {
    connection.release();
  }
}

cron.schedule('0 9 * * *', async () => {
  console.log('定时任务: 检查未提交检查的工作室...');
  try {
    await checkUnsubmittedInspections();
    console.log('定时任务完成');
  } catch (err) {
    console.error('定时任务出错:', err);
  }
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.listen(PORT, async () => {
  try {
    await initDatabase();
    await seedDatabase();
    console.log(`服务器已启动: http://localhost:${PORT}`);
    console.log(`图片上传目录: ${uploadDir}`);
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
});
