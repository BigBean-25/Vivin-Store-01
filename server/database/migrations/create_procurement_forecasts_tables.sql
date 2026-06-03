CREATE TABLE IF NOT EXISTS procurement_forecasts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  forecast_name VARCHAR(180) NOT NULL,
  forecast_year INT NOT NULL,
  forecast_month INT NOT NULL,

  lookback_months INT DEFAULT 3,
  growth_percent DECIMAL(8,2) DEFAULT 0,
  safety_stock_percent DECIMAL(8,2) DEFAULT 10,

  total_forecast_qty DECIMAL(18,3) DEFAULT 0,
  total_forecast_value DECIMAL(18,2) DEFAULT 0,

  remarks TEXT NULL,
  status VARCHAR(30) DEFAULT 'draft',

  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_procurement_forecasts_period (forecast_year, forecast_month),
  INDEX idx_procurement_forecasts_status (status)
);

CREATE TABLE IF NOT EXISTS procurement_forecast_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  forecast_id INT NOT NULL,
  product_id INT NULL,
  product_name VARCHAR(180) NULL,

  historical_qty DECIMAL(18,3) DEFAULT 0,
  average_monthly_qty DECIMAL(18,3) DEFAULT 0,
  forecast_qty DECIMAL(18,3) DEFAULT 0,

  average_unit_price DECIMAL(18,2) DEFAULT 0,
  forecast_value DECIMAL(18,2) DEFAULT 0,

  vendor_id INT NULL,
  vendor_name VARCHAR(180) NULL,

  remarks TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_procurement_forecast_items_forecast (forecast_id),
  INDEX idx_procurement_forecast_items_product (product_id),
  INDEX idx_procurement_forecast_items_vendor (vendor_id)
);
