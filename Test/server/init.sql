-- ============================================
-- 工作室安全检查管理系统 - 数据库初始化脚本
-- 数据库名: studio_safety
-- ============================================

CREATE DATABASE IF NOT EXISTS studio_safety DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studio_safety;

-- ============================================
-- 用户表
-- ============================================
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS inspections;
DROP TABLE IF EXISTS studios;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'inspector') NOT NULL,
  real_name VARCHAR(50) DEFAULT NULL,
  studio_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 工作室表
-- ============================================
CREATE TABLE studios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  manager_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 检查记录表
-- 检查项: fire_safety(消防安全), electrical_safety(用电安全),
--         equipment_safety(设备安全), environment_safety(环境安全)
-- 状态: pending(待审核), approved(已通过), needs_rectify(需整改),
--        rectifying(整改中), completed(已完成)
-- ============================================
CREATE TABLE inspections (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 通知表
-- ============================================
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT DEFAULT NULL,
  type VARCHAR(50) DEFAULT 'system',
  is_read TINYINT(1) DEFAULT 0,
  related_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 系统设置表
-- ============================================
CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 预置账号数据（密码使用 bcrypt 加密）
-- ============================================

-- 管理员: admin / admin123
INSERT INTO users (username, password, role, real_name) VALUES
('admin', '$2a$10$ilx9xhFv6qDhtlk901NOmOsblvSmodloJVfZyObVubHVQ7Lzue9Q6', 'admin', '系统管理员');

-- 安全检查负责人: inspector1 / 123456，真实姓名: 李四
INSERT INTO users (username, password, role, real_name) VALUES
('inspector1', '$2a$10$PgN5t7oxCIQJaQGsV4D.HOkyWUbC/HrW/U26HIJFdBBH88jQQSaXW', 'inspector', '李四');

-- 工作室负责人: manager1 / 123456，真实姓名: 张三
INSERT INTO users (username, password, role, real_name) VALUES
('manager1', '$2a$10$PgN5t7oxCIQJaQGsV4D.HOkyWUbC/HrW/U26HIJFdBBH88jQQSaXW', 'manager', '张三');

-- 创建张三工作室并关联负责人
SET @manager_id = (SELECT id FROM users WHERE username = 'manager1');
INSERT INTO studios (name, manager_id) VALUES ('张三工作室', @manager_id);

-- 更新张三的 studio_id 关联
SET @studio_id = (SELECT id FROM studios WHERE name = '张三工作室');
UPDATE users SET studio_id = @studio_id WHERE username = 'manager1';

-- ============================================
-- 预置系统设置
-- ============================================
INSERT INTO settings (`key`, `value`) VALUES ('inspection_period_days', '7');
