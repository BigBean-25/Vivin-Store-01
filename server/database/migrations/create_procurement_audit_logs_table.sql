-- Create procurement_audit_logs table
CREATE TABLE IF NOT EXISTS procurement_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,

  module_name VARCHAR(80) NOT NULL,
  record_id INT NULL,
  reference_number VARCHAR(150) NULL,

  action_type VARCHAR(80) NOT NULL,
  action_label VARCHAR(180) NULL,

  old_values JSON NULL,
  new_values JSON NULL,

  remarks TEXT NULL,

  performed_by INT NULL,
  performed_by_name VARCHAR(180) NULL,

  ip_address VARCHAR(80) NULL,
  user_agent TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_procurement_audit_module (module_name),
  INDEX idx_procurement_audit_record (record_id),
  INDEX idx_procurement_audit_action (action_type),
  INDEX idx_procurement_audit_user (performed_by),
  INDEX idx_procurement_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
