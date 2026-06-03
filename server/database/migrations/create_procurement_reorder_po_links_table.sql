CREATE TABLE IF NOT EXISTS procurement_reorder_po_links (
  id INT AUTO_INCREMENT PRIMARY KEY,

  reorder_plan_id INT NOT NULL,
  reorder_plan_item_id INT NULL,

  purchase_order_id INT NOT NULL,
  vendor_id INT NULL,
  product_id INT NULL,

  required_qty DECIMAL(18,3) DEFAULT 0,
  po_qty DECIMAL(18,3) DEFAULT 0,
  estimated_value DECIMAL(18,2) DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_reorder_po_plan (reorder_plan_id),
  INDEX idx_reorder_po_item (reorder_plan_item_id),
  INDEX idx_reorder_po_po (purchase_order_id),
  INDEX idx_reorder_po_vendor (vendor_id),
  INDEX idx_reorder_po_product (product_id)
);
