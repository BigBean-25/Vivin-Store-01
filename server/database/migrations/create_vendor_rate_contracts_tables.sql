CREATE TABLE IF NOT EXISTS vendor_rate_contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  contract_number VARCHAR(120) NOT NULL UNIQUE,
  contract_title VARCHAR(180) NOT NULL,

  vendor_id INT NOT NULL,
  vendor_name VARCHAR(180) NULL,

  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,

  payment_terms TEXT NULL,
  delivery_terms TEXT NULL,

  total_items INT DEFAULT 0,
  estimated_contract_value DECIMAL(18,2) DEFAULT 0,

  approval_status VARCHAR(30) DEFAULT 'pending',
  status VARCHAR(30) DEFAULT 'draft',

  approved_by INT NULL,
  approved_at TIMESTAMP NULL,

  remarks TEXT NULL,

  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor_rate_contract_vendor (vendor_id),
  INDEX idx_vendor_rate_contract_dates (contract_start_date, contract_end_date),
  INDEX idx_vendor_rate_contract_status (status),
  INDEX idx_vendor_rate_contract_approval (approval_status)
);

CREATE TABLE IF NOT EXISTS vendor_rate_contract_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  contract_id INT NOT NULL,

  product_id INT NULL,
  product_name VARCHAR(180) NOT NULL,

  unit_id INT NULL,
  unit_name VARCHAR(80) NULL,

  contract_rate DECIMAL(18,2) NOT NULL DEFAULT 0,
  old_rate DECIMAL(18,2) DEFAULT 0,

  min_order_qty DECIMAL(18,3) DEFAULT 0,
  max_order_qty DECIMAL(18,3) DEFAULT 0,

  tax_percent DECIMAL(8,2) DEFAULT 0,

  valid_from DATE NULL,
  valid_to DATE NULL,

  remarks TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rate_contract_items_contract (contract_id),
  INDEX idx_rate_contract_items_product (product_id),
  INDEX idx_rate_contract_items_rate (contract_rate)
);
