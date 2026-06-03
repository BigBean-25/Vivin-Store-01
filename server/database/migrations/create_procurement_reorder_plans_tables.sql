CREATE TABLE IF NOT EXISTS procurement_reorder_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,

  plan_name VARCHAR(180) NOT NULL,
  forecast_id INT NULL,

  plan_year INT NOT NULL,
  plan_month INT NOT NULL,

  total_items INT DEFAULT 0,
  total_required_qty DECIMAL(18,3) DEFAULT 0,
  total_estimated_value DECIMAL(18,2) DEFAULT 0,

  remarks TEXT NULL,
  status VARCHAR(30) DEFAULT 'draft',

  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_reorder_plan_forecast (forecast_id),
  INDEX idx_reorder_plan_period (plan_year, plan_month),
  INDEX idx_reorder_plan_status (status)
);

CREATE TABLE IF NOT EXISTS procurement_reorder_plan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  plan_id INT NOT NULL,
  forecast_item_id INT NULL,

  product_id INT NULL,
  product_name VARCHAR(180) NULL,

  vendor_id INT NULL,
  vendor_name VARCHAR(180) NULL,

  forecast_qty DECIMAL(18,3) DEFAULT 0,
  current_stock_qty DECIMAL(18,3) DEFAULT 0,
  required_qty DECIMAL(18,3) DEFAULT 0,

  average_unit_price DECIMAL(18,2) DEFAULT 0,
  estimated_value DECIMAL(18,2) DEFAULT 0,

  priority VARCHAR(30) DEFAULT 'normal',
  remarks TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_reorder_items_plan (plan_id),
  INDEX idx_reorder_items_product (product_id),
  INDEX idx_reorder_items_vendor (vendor_id)
);
