-- Vivin Store Full Database Schema
-- Use this for full module database setup.
-- Database: vivin_store

CREATE DATABASE IF NOT EXISTS vivin_store
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE vivin_store;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. AUTH, USERS, ROLES
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  user_type ENUM('super_admin','admin','staff','vendor','customer','warehouse_staff','delivery_driver') DEFAULT 'staff',
  status ENUM('active','inactive','blocked') DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255),
  ip_address VARCHAR(100),
  user_agent TEXT,
  login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  revoked_at DATETIME NULL,
  status ENUM('active','expired','revoked') DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  email VARCHAR(150),
  ip_address VARCHAR(100),
  user_agent TEXT,
  status ENUM('success','failed') DEFAULT 'success',
  message VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(150),
  module VARCHAR(150),
  record_id INT NULL,
  description TEXT,
  ip_address VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  table_name VARCHAR(150),
  record_id INT,
  action VARCHAR(100),
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type ENUM('info','success','warning','danger') DEFAULT 'info',
  module VARCHAR(100),
  reference_id INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NOT NULL,
  user_id INT NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_notification_user (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20),
  email VARCHAR(150),
  otp_code VARCHAR(10) NOT NULL,
  purpose VARCHAR(100),
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. VENDORS
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  vendor_code VARCHAR(50) UNIQUE,
  business_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150),
  email VARCHAR(150),
  phone VARCHAR(20),
  gst_number VARCHAR(50),
  pan_number VARCHAR(50),
  category_id INT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  credit_days INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  status ENUM('pending','active','inactive','blocked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  document_number VARCHAR(100),
  file_path VARCHAR(255),
  verification_status ENUM('pending','verified','rejected') DEFAULT 'pending',
  remarks TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  address_type ENUM('billing','shipping','warehouse','office') DEFAULT 'office',
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  bank_name VARCHAR(150),
  account_holder_name VARCHAR(150),
  account_number VARCHAR(100),
  ifsc_code VARCHAR(20),
  branch VARCHAR(150),
  is_default BOOLEAN DEFAULT FALSE,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  name VARCHAR(150),
  designation VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(20),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  rating DECIMAL(3,2) NOT NULL,
  review TEXT,
  rated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL UNIQUE,
  balance DECIMAL(14,2) DEFAULT 0.00,
  hold_amount DECIMAL(14,2) DEFAULT 0.00,
  status ENUM('active','inactive','blocked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  transaction_type ENUM('credit','debit') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. CUSTOMERS
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  customer_code VARCHAR(50) UNIQUE,
  business_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150),
  email VARCHAR(150),
  phone VARCHAR(20),
  gst_number VARCHAR(50),
  pan_number VARCHAR(50),
  group_id INT NULL,
  credit_limit DECIMAL(14,2) DEFAULT 0,
  credit_days INT DEFAULT 0,
  status ENUM('pending','active','inactive','blocked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  address_type ENUM('billing','shipping','office') DEFAULT 'shipping',
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(20),
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL UNIQUE,
  balance DECIMAL(14,2) DEFAULT 0.00,
  credit_balance DECIMAL(14,2) DEFAULT 0.00,
  status ENUM('active','inactive','blocked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  transaction_type ENUM('credit','debit') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_credit_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  limit_amount DECIMAL(14,2) NOT NULL,
  used_amount DECIMAL(14,2) DEFAULT 0,
  effective_from DATE,
  effective_to DATE NULL,
  approved_by INT NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  product_id INT NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  min_order_qty DECIMAL(14,3) DEFAULT 1,
  effective_from DATE,
  effective_to DATE NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_customer_product_price (customer_id, product_id, effective_from)
);

-- =====================================================
-- 4. PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) UNIQUE,
  image LONGTEXT,
  description TEXT,
  sort_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) UNIQUE,
  image LONGTEXT,
  description TEXT,
  sort_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(180) UNIQUE,
  logo LONGTEXT,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(20) NOT NULL,
  type ENUM('weight','volume','count','length','other') DEFAULT 'other',
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(80) UNIQUE,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) UNIQUE,
  category_id INT NULL,
  sub_category_id INT NULL,
  brand_id INT NULL,
  unit_id INT NULL,
  hsn_code VARCHAR(50),
  barcode VARCHAR(100),
  description TEXT,
  base_price DECIMAL(14,2) DEFAULT 0,
  purchase_price DECIMAL(14,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  min_stock_level DECIMAL(14,3) DEFAULT 0,
  reorder_level DECIMAL(14,3) DEFAULT 0,
  shelf_life_days INT DEFAULT 0,
  is_batch_tracking BOOLEAN DEFAULT TRUE,
  is_expiry_tracking BOOLEAN DEFAULT TRUE,
  status ENUM('active','inactive','draft') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  alt_text VARCHAR(150),
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  variant_name VARCHAR(150),
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  price DECIMAL(14,2) DEFAULT 0,
  purchase_price DECIMAL(14,2) DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_pricing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  price_type ENUM('retail','wholesale','customer','group','vendor') DEFAULT 'retail',
  reference_id INT NULL,
  price DECIMAL(14,2) NOT NULL,
  min_qty DECIMAL(14,3) DEFAULT 1,
  effective_from DATE,
  effective_to DATE NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  customer_id INT NULL,
  rating DECIMAL(3,2),
  review TEXT,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. PROCUREMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS rfqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfq_number VARCHAR(80) UNIQUE,
  title VARCHAR(200),
  requested_by INT NULL,
  required_date DATE,
  status ENUM('draft','sent','quoted','closed','cancelled') DEFAULT 'draft',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rfq_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfq_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  unit_id INT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_number VARCHAR(80) UNIQUE,
  rfq_id INT NULL,
  vendor_id INT NOT NULL,
  quotation_date DATE,
  valid_until DATE,
  subtotal DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('pending','accepted','rejected','expired') DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(80) UNIQUE,
  vendor_id INT NOT NULL,
  quotation_id INT NULL,
  warehouse_id INT NULL,
  po_date DATE,
  expected_delivery_date DATE,
  subtotal DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('draft','pending_approval','approved','sent','partially_received','received','cancelled') DEFAULT 'draft',
  remarks TEXT,
  created_by INT NULL,
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  received_quantity DECIMAL(14,3) DEFAULT 0,
  unit_price DECIMAL(14,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS po_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id INT NOT NULL,
  approved_by INT NOT NULL,
  approval_status ENUM('approved','rejected') NOT NULL,
  remarks TEXT,
  approved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_number VARCHAR(80) UNIQUE,
  purchase_order_id INT NULL,
  vendor_id INT NULL,
  warehouse_id INT NULL,
  receipt_date DATE,
  invoice_number VARCHAR(100),
  status ENUM('draft','verified','posted','cancelled') DEFAULT 'draft',
  remarks TEXT,
  received_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goods_receipt_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_no VARCHAR(100),
  expiry_date DATE NULL,
  received_qty DECIMAL(14,3) NOT NULL,
  accepted_qty DECIMAL(14,3) DEFAULT 0,
  rejected_qty DECIMAL(14,3) DEFAULT 0,
  unit_price DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  purchase_order_id INT NULL,
  payment_date DATE,
  amount DECIMAL(14,2) NOT NULL,
  payment_mode VARCHAR(100),
  reference_number VARCHAR(150),
  status ENUM('pending','paid','failed','cancelled') DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(80) UNIQUE,
  vendor_id INT NOT NULL,
  purchase_order_id INT NULL,
  goods_receipt_id INT NULL,
  return_date DATE,
  reason TEXT,
  status ENUM('draft','approved','sent','closed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  procurement_return_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. WAREHOUSE & INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_code VARCHAR(80) UNIQUE,
  name VARCHAR(150) NOT NULL,
  manager_id INT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  zone_code VARCHAR(80),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_racks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  zone_id INT NULL,
  rack_code VARCHAR(80),
  name VARCHAR(150),
  capacity DECIMAL(14,3) DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_bins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  zone_id INT NULL,
  rack_id INT NULL,
  bin_code VARCHAR(80),
  capacity DECIMAL(14,3) DEFAULT 0,
  status ENUM('empty','occupied','reserved','inactive') DEFAULT 'empty',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouse_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  user_id INT NOT NULL,
  role_title VARCHAR(100),
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_warehouse_user (warehouse_id, user_id)
);

CREATE TABLE IF NOT EXISTS inventories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL,
  available_qty DECIMAL(14,3) DEFAULT 0,
  reserved_qty DECIMAL(14,3) DEFAULT 0,
  damaged_qty DECIMAL(14,3) DEFAULT 0,
  average_cost DECIMAL(14,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_inventory_product_warehouse (warehouse_id, product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_no VARCHAR(100) NOT NULL,
  manufacture_date DATE NULL,
  expiry_date DATE NULL,
  quantity DECIMAL(14,3) DEFAULT 0,
  cost_price DECIMAL(14,2) DEFAULT 0,
  status ENUM('active','expired','blocked','consumed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_expiry (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  expiry_date DATE NOT NULL,
  alert_date DATE,
  status ENUM('normal','near_expiry','expired','disposed') DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  movement_type ENUM('in','out','transfer','adjustment','damage','reservation','release') NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  balance_after DECIMAL(14,3) DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_inward (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inward_number VARCHAR(80) UNIQUE,
  warehouse_id INT NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  inward_date DATE,
  status ENUM('draft','posted','cancelled') DEFAULT 'draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_inward_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_inward_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_no VARCHAR(100),
  expiry_date DATE NULL,
  quantity DECIMAL(14,3) NOT NULL,
  unit_cost DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_outward (
  id INT AUTO_INCREMENT PRIMARY KEY,
  outward_number VARCHAR(80) UNIQUE,
  warehouse_id INT NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  outward_date DATE,
  status ENUM('draft','posted','cancelled') DEFAULT 'draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_outward_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_outward_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  unit_cost DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adjustment_number VARCHAR(80) UNIQUE,
  warehouse_id INT NOT NULL,
  adjustment_date DATE,
  reason TEXT,
  status ENUM('draft','approved','posted','cancelled') DEFAULT 'draft',
  created_by INT NULL,
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_adjustment_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  system_qty DECIMAL(14,3) DEFAULT 0,
  physical_qty DECIMAL(14,3) DEFAULT 0,
  difference_qty DECIMAL(14,3) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_damages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  damage_number VARCHAR(80) UNIQUE,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  batch_id INT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  reason TEXT,
  status ENUM('reported','approved','disposed') DEFAULT 'reported',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(80) UNIQUE,
  request_type ENUM('outlet','customer','warehouse','internal') DEFAULT 'internal',
  requested_by INT NULL,
  from_warehouse_id INT NULL,
  to_warehouse_id INT NULL,
  request_date DATE,
  required_date DATE,
  status ENUM('draft','submitted','approved','fulfilled','rejected','cancelled') DEFAULT 'draft',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_request_id INT NOT NULL,
  product_id INT NOT NULL,
  requested_qty DECIMAL(14,3) NOT NULL,
  approved_qty DECIMAL(14,3) DEFAULT 0,
  issued_qty DECIMAL(14,3) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NULL,
  product_id INT NOT NULL,
  alert_type ENUM('low_stock','expiry','dead_stock','overstock') NOT NULL,
  message TEXT,
  status ENUM('open','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. OWN OUTLETS
-- =====================================================

CREATE TABLE IF NOT EXISTS outlets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  outlet_code VARCHAR(80) UNIQUE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  manager_id INT NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outlet_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT NOT NULL,
  product_id INT NOT NULL,
  available_qty DECIMAL(14,3) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_outlet_product (outlet_id, product_id)
);

CREATE TABLE IF NOT EXISTS outlet_stock_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(80) UNIQUE,
  outlet_id INT NOT NULL,
  warehouse_id INT NULL,
  request_date DATE,
  required_date DATE,
  status ENUM('draft','submitted','approved','dispatched','received','cancelled') DEFAULT 'draft',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outlet_stock_request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  outlet_stock_request_id INT NOT NULL,
  product_id INT NOT NULL,
  requested_qty DECIMAL(14,3) NOT NULL,
  approved_qty DECIMAL(14,3) DEFAULT 0,
  issued_qty DECIMAL(14,3) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outlet_consumptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  outlet_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  consumption_date DATE,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  status ENUM('active','converted','abandoned') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  unit_price DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(80) UNIQUE,
  customer_id INT NOT NULL,
  source_type ENUM('warehouse','marketplace','mixed') DEFAULT 'warehouse',
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivery_date DATE NULL,
  subtotal DECIMAL(14,2) DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  shipping_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  payment_status ENUM('pending','partial','paid','failed','refunded') DEFAULT 'pending',
  order_status ENUM('pending','confirmed','processing','packed','dispatched','delivered','cancelled','returned') DEFAULT 'pending',
  billing_address TEXT,
  shipping_address TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL,
  source_type ENUM('warehouse','vendor','marketplace') DEFAULT 'warehouse',
  source_id INT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  fulfillment_status ENUM('pending','allocated','picked','packed','dispatched','delivered','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS split_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_order_id INT NOT NULL,
  split_order_number VARCHAR(80) UNIQUE,
  source_type ENUM('warehouse','vendor','marketplace') DEFAULT 'warehouse',
  source_id INT NULL,
  subtotal DECIMAL(14,2) DEFAULT 0,
  status ENUM('pending','confirmed','packed','dispatched','delivered','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  old_status VARCHAR(100),
  new_status VARCHAR(100),
  remarks TEXT,
  changed_by INT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(80) UNIQUE,
  order_id INT NOT NULL,
  customer_id INT NOT NULL,
  return_date DATE,
  reason TEXT,
  status ENUM('requested','approved','picked','received','refunded','rejected') DEFAULT 'requested',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  order_item_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  refund_number VARCHAR(80) UNIQUE,
  order_id INT NOT NULL,
  return_id INT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  refund_mode VARCHAR(100),
  status ENUM('pending','processed','failed','cancelled') DEFAULT 'pending',
  processed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(150),
  discount_type ENUM('percentage','fixed') DEFAULT 'fixed',
  discount_value DECIMAL(14,2) NOT NULL,
  min_order_amount DECIMAL(14,2) DEFAULT 0,
  max_discount_amount DECIMAL(14,2) DEFAULT 0,
  usage_limit INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status ENUM('active','inactive','expired') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_id INT NOT NULL,
  order_id INT NOT NULL,
  customer_id INT NOT NULL,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. DELIVERY
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  driver_code VARCHAR(80) UNIQUE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(150),
  vehicle_type VARCHAR(100),
  vehicle_number VARCHAR(80),
  license_number VARCHAR(100),
  status ENUM('available','busy','offline','inactive') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_number VARCHAR(80) UNIQUE,
  order_id INT NULL,
  split_order_id INT NULL,
  customer_id INT NULL,
  driver_id INT NULL,
  pickup_address TEXT,
  delivery_address TEXT,
  delivery_date DATE,
  delivery_status ENUM('pending','assigned','picked','in_transit','delivered','failed','cancelled') DEFAULT 'pending',
  proof_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  driver_id INT NOT NULL,
  assigned_by INT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('assigned','accepted','rejected','completed') DEFAULT 'assigned'
);

CREATE TABLE IF NOT EXISTS delivery_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_code VARCHAR(80) UNIQUE,
  driver_id INT NULL,
  route_date DATE,
  start_location VARCHAR(255),
  end_location VARCHAR(255),
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  status ENUM('planned','started','completed','cancelled') DEFAULT 'planned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  status VARCHAR(100),
  remarks TEXT,
  tracked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  old_status VARCHAR(100),
  new_status VARCHAR(100),
  remarks TEXT,
  changed_by INT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_proofs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  proof_type ENUM('signature','photo','otp','document') DEFAULT 'signature',
  proof_value TEXT,
  file_path VARCHAR(255),
  received_by VARCHAR(150),
  received_phone VARCHAR(20),
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipment_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  package_code VARCHAR(100),
  weight DECIMAL(10,3) DEFAULT 0,
  length DECIMAL(10,2) DEFAULT 0,
  width DECIMAL(10,2) DEFAULT 0,
  height DECIMAL(10,2) DEFAULT 0,
  status ENUM('packed','loaded','delivered','damaged') DEFAULT 'packed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. FINANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type ENUM('cash','bank','upi','card','wallet','credit') DEFAULT 'cash',
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(80) UNIQUE,
  invoice_type ENUM('sales','purchase','credit_note','debit_note') DEFAULT 'sales',
  order_id INT NULL,
  customer_id INT NULL,
  vendor_id INT NULL,
  invoice_date DATE,
  due_date DATE,
  subtotal DECIMAL(14,2) DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  balance_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('draft','sent','partial','paid','overdue','cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NULL,
  description TEXT,
  hsn_code VARCHAR(50),
  quantity DECIMAL(14,3) DEFAULT 1,
  unit_price DECIMAL(14,2) DEFAULT 0,
  taxable_amount DECIMAL(14,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(80) UNIQUE,
  invoice_id INT NULL,
  order_id INT NULL,
  customer_id INT NULL,
  vendor_id INT NULL,
  payment_method_id INT NULL,
  payment_date DATE,
  amount DECIMAL(14,2) NOT NULL,
  transaction_reference VARCHAR(150),
  status ENUM('pending','success','failed','cancelled','refunded') DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(80) UNIQUE,
  transaction_type ENUM('income','expense','transfer','adjustment') NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  amount DECIMAL(14,2) NOT NULL,
  transaction_date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_ledgers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  entry_date DATE,
  entry_type ENUM('debit','credit') NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  amount DECIMAL(14,2) NOT NULL,
  balance_after DECIMAL(14,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_ledgers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  entry_date DATE,
  entry_type ENUM('debit','credit') NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  amount DECIMAL(14,2) NOT NULL,
  balance_after DECIMAL(14,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallet_ledgers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wallet_type ENUM('customer','vendor','system') NOT NULL,
  wallet_owner_id INT NULL,
  entry_type ENUM('credit','debit') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  balance_after DECIMAL(14,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debit_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  debit_note_number VARCHAR(80) UNIQUE,
  vendor_id INT NULL,
  customer_id INT NULL,
  invoice_id INT NULL,
  note_date DATE,
  amount DECIMAL(14,2) NOT NULL,
  reason TEXT,
  status ENUM('draft','issued','cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  credit_note_number VARCHAR(80) UNIQUE,
  vendor_id INT NULL,
  customer_id INT NULL,
  invoice_id INT NULL,
  note_date DATE,
  amount DECIMAL(14,2) NOT NULL,
  reason TEXT,
  status ENUM('draft','issued','cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. GST
-- =====================================================

CREATE TABLE IF NOT EXISTS gst_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hsn_code VARCHAR(50),
  description TEXT,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  cess_rate DECIMAL(5,2) DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gst_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  gst_invoice_number VARCHAR(100),
  gstin VARCHAR(50),
  place_of_supply VARCHAR(100),
  reverse_charge BOOLEAN DEFAULT FALSE,
  invoice_type VARCHAR(100),
  taxable_value DECIMAL(14,2) DEFAULT 0,
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  cess_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gst_invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gst_invoice_id INT NOT NULL,
  product_id INT NULL,
  hsn_code VARCHAR(50),
  taxable_value DECIMAL(14,2) DEFAULT 0,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gstr1_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  report_data JSON,
  status ENUM('draft','generated','filed') DEFAULT 'draft',
  generated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gstr3b_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  report_data JSON,
  tax_payable DECIMAL(14,2) DEFAULT 0,
  status ENUM('draft','generated','filed') DEFAULT 'draft',
  generated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gstr2b_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  vendor_id INT NULL,
  report_data JSON,
  reconciliation_status ENUM('pending','matched','mismatch') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS e_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  irn VARCHAR(255),
  ack_number VARCHAR(100),
  ack_date DATETIME NULL,
  qr_code TEXT,
  status ENUM('pending','generated','cancelled','failed') DEFAULT 'pending',
  response_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS e_way_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NULL,
  delivery_id INT NULL,
  eway_bill_number VARCHAR(100),
  valid_from DATETIME NULL,
  valid_to DATETIME NULL,
  distance_km DECIMAL(10,2) DEFAULT 0,
  vehicle_number VARCHAR(80),
  status ENUM('pending','generated','cancelled','expired') DEFAULT 'pending',
  response_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_date DATE,
  reference_type VARCHAR(100),
  reference_id INT NULL,
  taxable_value DECIMAL(14,2) DEFAULT 0,
  cgst_amount DECIMAL(14,2) DEFAULT 0,
  sgst_amount DECIMAL(14,2) DEFAULT 0,
  igst_amount DECIMAL(14,2) DEFAULT 0,
  cess_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itc_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NULL,
  invoice_id INT NULL,
  claim_period VARCHAR(20),
  eligible_amount DECIMAL(14,2) DEFAULT 0,
  claimed_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('pending','claimed','reversed','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. MARKETPLACE
-- =====================================================

CREATE TABLE IF NOT EXISTS marketplaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace_vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  marketplace_id INT NOT NULL,
  vendor_id INT NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  status ENUM('pending','active','inactive','blocked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_marketplace_vendor (marketplace_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS marketplace_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  marketplace_id INT NOT NULL,
  vendor_id INT NOT NULL,
  product_id INT NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  available_qty DECIMAL(14,3) DEFAULT 0,
  status ENUM('active','inactive','out_of_stock') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_marketplace_product_vendor (marketplace_id, vendor_id, product_id)
);

CREATE TABLE IF NOT EXISTS supplier_comparisons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  vendor_id INT NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  delivery_days INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  comparison_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS external_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_order_number VARCHAR(80) UNIQUE,
  order_id INT NULL,
  vendor_id INT NOT NULL,
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('pending','confirmed','dispatched','delivered','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS external_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  unit_price DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 13. CMS
-- =====================================================

CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150),
  image_path VARCHAR(255),
  link_url VARCHAR(255),
  placement VARCHAR(100),
  sort_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sliders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150),
  subtitle VARCHAR(255),
  image_path VARCHAR(255),
  button_text VARCHAR(100),
  button_link VARCHAR(255),
  sort_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) UNIQUE,
  content LONGTEXT,
  meta_title VARCHAR(200),
  meta_description TEXT,
  status ENUM('draft','published','archived') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(180) UNIQUE,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blog_category_id INT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) UNIQUE,
  excerpt TEXT,
  content LONGTEXT,
  featured_image VARCHAR(255),
  meta_title VARCHAR(200),
  meta_description TEXT,
  status ENUM('draft','published','archived') DEFAULT 'draft',
  published_at DATETIME NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer TEXT,
  category VARCHAR(150),
  sort_order INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_type VARCHAR(100),
  page_id INT NULL,
  meta_title VARCHAR(200),
  meta_description TEXT,
  keywords TEXT,
  canonical_url VARCHAR(255),
  schema_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 14. ANALYTICS & REPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_name VARCHAR(150) NOT NULL,
  report_type VARCHAR(100),
  filters JSON NULL,
  data JSON NULL,
  generated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_exports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NULL,
  export_type ENUM('pdf','excel','csv') DEFAULT 'pdf',
  file_path VARCHAR(255),
  status ENUM('pending','completed','failed') DEFAULT 'pending',
  exported_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  snapshot_type VARCHAR(100),
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE,
  total_orders INT DEFAULT 0,
  total_sales DECIMAL(14,2) DEFAULT 0,
  total_tax DECIMAL(14,2) DEFAULT 0,
  total_discount DECIMAL(14,2) DEFAULT 0,
  data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE,
  total_purchase_orders INT DEFAULT 0,
  total_purchase_value DECIMAL(14,2) DEFAULT 0,
  data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE,
  warehouse_id INT NULL,
  total_stock_value DECIMAL(14,2) DEFAULT 0,
  low_stock_count INT DEFAULT 0,
  expiry_count INT DEFAULT 0,
  data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE,
  vendor_id INT NULL,
  total_orders INT DEFAULT 0,
  total_value DECIMAL(14,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE,
  total_deliveries INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  average_delivery_time_minutes INT DEFAULT 0,
  data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_month INT,
  period_year INT,
  tax_payable DECIMAL(14,2) DEFAULT 0,
  itc_available DECIMAL(14,2) DEFAULT 0,
  data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dead_stock_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_date DATE,
  product_id INT NULL,
  warehouse_id INT NULL,
  stock_age_days INT DEFAULT 0,
  quantity DECIMAL(14,3) DEFAULT 0,
  stock_value DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 15. SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(150) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_group VARCHAR(100),
  value_type ENUM('string','number','boolean','json') DEFAULT 'string',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  smtp_host VARCHAR(150),
  smtp_port INT,
  smtp_user VARCHAR(150),
  smtp_password VARCHAR(255),
  from_email VARCHAR(150),
  from_name VARCHAR(150),
  encryption VARCHAR(50),
  status ENUM('active','inactive') DEFAULT 'inactive',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(100),
  api_key VARCHAR(255),
  sender_id VARCHAR(100),
  template_config JSON NULL,
  status ENUM('active','inactive') DEFAULT 'inactive',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_gateway_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(100),
  merchant_id VARCHAR(150),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  webhook_secret VARCHAR(255),
  mode ENUM('test','live') DEFAULT 'test',
  status ENUM('active','inactive') DEFAULT 'inactive',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prefix VARCHAR(50),
  next_number BIGINT DEFAULT 1,
  footer_text TEXT,
  terms_conditions TEXT,
  logo VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gst_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  legal_name VARCHAR(200),
  gst_number VARCHAR(50),
  address TEXT,
  state VARCHAR(100),
  default_tax_type ENUM('cgst_sgst','igst') DEFAULT 'cgst_sgst',
  e_invoice_enabled BOOLEAN DEFAULT FALSE,
  e_way_bill_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  password_min_length INT DEFAULT 8,
  login_attempt_limit INT DEFAULT 5,
  lockout_minutes INT DEFAULT 15,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  session_timeout_minutes INT DEFAULT 1440,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  backup_name VARCHAR(150),
  file_path VARCHAR(255),
  backup_type ENUM('manual','automatic') DEFAULT 'manual',
  file_size BIGINT DEFAULT 0,
  status ENUM('pending','completed','failed') DEFAULT 'pending',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_level ENUM('info','warning','error','critical') DEFAULT 'info',
  module VARCHAR(100),
  message TEXT,
  context JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 16. SUPPORT
-- =====================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(80) UNIQUE,
  user_id INT NULL,
  customer_id INT NULL,
  vendor_id INT NULL,
  subject VARCHAR(200) NOT NULL,
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  status ENUM('open','in_progress','resolved','closed') DEFAULT 'open',
  assigned_to INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  support_ticket_id INT NOT NULL,
  sender_id INT NULL,
  sender_type ENUM('user','admin','vendor','customer') DEFAULT 'user',
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  support_ticket_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(150),
  file_type VARCHAR(100),
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_number VARCHAR(80) UNIQUE,
  customer_id INT NULL,
  vendor_id INT NULL,
  order_id INT NULL,
  complaint_type VARCHAR(100),
  description TEXT,
  status ENUM('open','reviewing','resolved','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS help_center_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) UNIQUE,
  category VARCHAR(150),
  content LONGTEXT,
  status ENUM('draft','published','archived') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- DEFAULT STARTER DATA
-- =====================================================

INSERT INTO roles (name, display_name, description)
VALUES
  ('super_admin', 'Super Admin', 'Complete system access'),
  ('admin', 'Admin', 'Admin panel access'),
  ('vendor', 'Vendor', 'Vendor portal access'),
  ('customer', 'Customer', 'Customer portal access'),
  ('warehouse_staff', 'Warehouse Staff', 'Warehouse operation access'),
  ('delivery_driver', 'Delivery Driver', 'Delivery app access')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

INSERT INTO payment_methods (name, type, status)
VALUES
  ('Cash', 'cash', 'active'),
  ('Bank Transfer', 'bank', 'active'),
  ('UPI', 'upi', 'active'),
  ('Card', 'card', 'active'),
  ('Wallet', 'wallet', 'active'),
  ('Credit', 'credit', 'active')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO units (name, short_name, type, status)
VALUES
  ('Kilogram', 'kg', 'weight', 'active'),
  ('Gram', 'g', 'weight', 'active'),
  ('Litre', 'ltr', 'volume', 'active'),
  ('Millilitre', 'ml', 'volume', 'active'),
  ('Piece', 'pcs', 'count', 'active'),
  ('Box', 'box', 'count', 'active'),
  ('Packet', 'pkt', 'count', 'active')
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO settings (setting_key, setting_value, setting_group, value_type)
VALUES
  ('app_name', 'Vivin Store', 'general', 'string'),
  ('currency', 'INR', 'general', 'string'),
  ('timezone', 'Asia/Kolkata', 'general', 'string'),
  ('date_format', 'DD-MM-YYYY', 'general', 'string')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- End of Vivin Store Full Schema
