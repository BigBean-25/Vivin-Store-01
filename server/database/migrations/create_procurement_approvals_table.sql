-- Create procurement_approvals table
CREATE TABLE IF NOT EXISTS procurement_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,

  module_name VARCHAR(80) NOT NULL,
  record_id INT NOT NULL,

  reference_number VARCHAR(120) NULL,
  vendor_id INT NULL,
  vendor_name VARCHAR(180) NULL,
  amount DECIMAL(18,2) DEFAULT 0,

  approval_level INT NOT NULL DEFAULT 1,
  approval_role VARCHAR(80) NULL,

  requested_by INT NULL,
  approved_by INT NULL,

  approval_status VARCHAR(30) DEFAULT 'pending',

  request_remarks TEXT NULL,
  approval_remarks TEXT NULL,

  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_procurement_approvals_module_record (module_name, record_id),
  INDEX idx_procurement_approvals_status (approval_status),
  INDEX idx_procurement_approvals_level (approval_level),
  INDEX idx_procurement_approvals_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
