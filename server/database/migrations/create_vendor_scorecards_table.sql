-- Create vendor_scorecards table
CREATE TABLE IF NOT EXISTS vendor_scorecards (
  id INT AUTO_INCREMENT PRIMARY KEY,

  vendor_id INT NOT NULL,
  score_year INT NOT NULL,
  score_month INT NOT NULL,

  purchase_orders_count INT DEFAULT 0,
  total_purchase_value DECIMAL(18,2) DEFAULT 0,

  on_time_orders INT DEFAULT 0,
  delayed_orders INT DEFAULT 0,
  delivery_score DECIMAL(8,2) DEFAULT 0,

  return_value DECIMAL(18,2) DEFAULT 0,
  quality_score DECIMAL(8,2) DEFAULT 0,

  paid_value DECIMAL(18,2) DEFAULT 0,
  payment_score DECIMAL(8,2) DEFAULT 0,

  quotation_count INT DEFAULT 0,
  accepted_quotation_count INT DEFAULT 0,
  quotation_score DECIMAL(8,2) DEFAULT 0,

  overall_score DECIMAL(8,2) DEFAULT 0,
  performance_grade VARCHAR(20) DEFAULT 'C',

  remarks TEXT NULL,

  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_vendor_scorecard_month (vendor_id, score_year, score_month),
  INDEX idx_vendor_scorecards_vendor (vendor_id),
  INDEX idx_vendor_scorecards_period (score_year, score_month),
  INDEX idx_vendor_scorecards_grade (performance_grade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
