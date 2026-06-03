-- Create vendor_settlements table
CREATE TABLE IF NOT EXISTS vendor_settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  payment_id INT NULL,
  settlement_date DATE NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  payment_mode VARCHAR(50),
  reference_no VARCHAR(100),
  remarks TEXT,
  status VARCHAR(30) DEFAULT 'completed',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor_id (vendor_id),
  INDEX idx_payment_id (payment_id),
  INDEX idx_settlement_date (settlement_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
