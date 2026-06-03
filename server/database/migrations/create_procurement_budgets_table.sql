-- Create procurement_budgets table
CREATE TABLE IF NOT EXISTS procurement_budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,

  budget_name VARCHAR(180) NOT NULL,
  budget_scope VARCHAR(50) NOT NULL DEFAULT 'overall',
  budget_year INT NOT NULL,
  budget_month INT NOT NULL,

  vendor_id INT NULL,
  warehouse_id INT NULL,

  budget_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  warning_limit_percent DECIMAL(5,2) DEFAULT 80.00,
  block_limit_percent DECIMAL(5,2) DEFAULT 100.00,

  remarks TEXT NULL,
  status VARCHAR(30) DEFAULT 'active',

  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_procurement_budgets_period (budget_year, budget_month),
  INDEX idx_procurement_budgets_vendor (vendor_id),
  INDEX idx_procurement_budgets_warehouse (warehouse_id),
  INDEX idx_procurement_budgets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
