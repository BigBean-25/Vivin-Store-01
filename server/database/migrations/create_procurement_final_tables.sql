CREATE TABLE IF NOT EXISTS procurement_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,

  module_name VARCHAR(80) NOT NULL,
  record_id INT NOT NULL,
  reference_number VARCHAR(150) NULL,

  document_title VARCHAR(180) NOT NULL,
  document_type VARCHAR(80) DEFAULT 'other',

  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NULL,
  file_path VARCHAR(500) NOT NULL,
  file_mime VARCHAR(120) NULL,
  file_size BIGINT DEFAULT 0,

  remarks TEXT NULL,

  uploaded_by INT NULL,
  uploaded_by_name VARCHAR(180) NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_proc_docs_module_record (module_name, record_id),
  INDEX idx_proc_docs_type (document_type),
  INDEX idx_proc_docs_uploaded (uploaded_at)
);

CREATE TABLE IF NOT EXISTS procurement_requisition_conversions (
  id INT AUTO_INCREMENT PRIMARY KEY,

  requisition_id INT NOT NULL,
  conversion_type VARCHAR(30) NOT NULL,

  rfq_id INT NULL,
  purchase_order_id INT NULL,

  vendor_id INT NULL,
  vendor_name VARCHAR(180) NULL,

  converted_by INT NULL,
  converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  remarks TEXT NULL,

  INDEX idx_req_conv_req (requisition_id),
  INDEX idx_req_conv_type (conversion_type),
  INDEX idx_req_conv_rfq (rfq_id),
  INDEX idx_req_conv_po (purchase_order_id)
);

CREATE TABLE IF NOT EXISTS procurement_rate_contract_checks (
  id INT AUTO_INCREMENT PRIMARY KEY,

  purchase_order_id INT NULL,
  purchase_order_item_id INT NULL,

  vendor_id INT NULL,
  product_id INT NULL,
  product_name VARCHAR(180) NULL,

  po_rate DECIMAL(18,2) DEFAULT 0,
  contract_rate DECIMAL(18,2) DEFAULT 0,

  difference_amount DECIMAL(18,2) DEFAULT 0,
  difference_percent DECIMAL(8,2) DEFAULT 0,

  contract_id INT NULL,
  contract_number VARCHAR(120) NULL,

  check_status VARCHAR(30) DEFAULT 'not_checked',
  remarks TEXT NULL,

  checked_by INT NULL,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rate_check_po (purchase_order_id),
  INDEX idx_rate_check_item (purchase_order_item_id),
  INDEX idx_rate_check_vendor_product (vendor_id, product_id),
  INDEX idx_rate_check_status (check_status)
);

CREATE TABLE IF NOT EXISTS procurement_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  alert_type VARCHAR(80) NOT NULL,
  alert_title VARCHAR(180) NOT NULL,
  alert_message TEXT NULL,

  module_name VARCHAR(80) NULL,
  record_id INT NULL,
  reference_number VARCHAR(150) NULL,

  priority VARCHAR(30) DEFAULT 'normal',
  alert_status VARCHAR(30) DEFAULT 'open',

  due_date DATE NULL,

  assigned_to INT NULL,
  assigned_to_name VARCHAR(180) NULL,

  resolved_by INT NULL,
  resolved_at TIMESTAMP NULL,
  resolution_remarks TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_proc_alert_type (alert_type),
  INDEX idx_proc_alert_status (alert_status),
  INDEX idx_proc_alert_priority (priority),
  INDEX idx_proc_alert_due (due_date),
  INDEX idx_proc_alert_module_record (module_name, record_id)
);
