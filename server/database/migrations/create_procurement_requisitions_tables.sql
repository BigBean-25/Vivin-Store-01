CREATE TABLE IF NOT EXISTS procurement_requisitions (
  id INT AUTO_INCREMENT PRIMARY KEY,

  requisition_number VARCHAR(120) NOT NULL UNIQUE,
  request_title VARCHAR(180) NOT NULL,

  request_date DATE NOT NULL,
  required_date DATE NULL,

  requested_by INT NULL,
  requester_name VARCHAR(180) NULL,

  outlet_id INT NULL,
  outlet_name VARCHAR(180) NULL,

  warehouse_id INT NULL,
  warehouse_name VARCHAR(180) NULL,

  priority VARCHAR(30) DEFAULT 'normal',
  purpose TEXT NULL,

  total_items INT DEFAULT 0,
  estimated_total DECIMAL(18,2) DEFAULT 0,

  approval_status VARCHAR(30) DEFAULT 'pending',
  status VARCHAR(30) DEFAULT 'draft',

  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,

  remarks TEXT NULL,

  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_proc_req_number (requisition_number),
  INDEX idx_proc_req_date (request_date),
  INDEX idx_proc_req_status (status),
  INDEX idx_proc_req_approval (approval_status),
  INDEX idx_proc_req_priority (priority)
);

CREATE TABLE IF NOT EXISTS procurement_requisition_items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  requisition_id INT NOT NULL,

  product_id INT NULL,
  product_name VARCHAR(180) NOT NULL,

  required_qty DECIMAL(18,3) NOT NULL DEFAULT 0,

  unit_id INT NULL,
  unit_name VARCHAR(80) NULL,

  estimated_unit_price DECIMAL(18,2) DEFAULT 0,
  estimated_value DECIMAL(18,2) DEFAULT 0,

  preferred_vendor_id INT NULL,
  preferred_vendor_name VARCHAR(180) NULL,

  remarks TEXT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_proc_req_items_req (requisition_id),
  INDEX idx_proc_req_items_product (product_id),
  INDEX idx_proc_req_items_vendor (preferred_vendor_id)
);
