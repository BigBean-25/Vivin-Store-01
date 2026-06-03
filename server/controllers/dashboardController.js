const db = require("../config/db");

const countRows = async (table, where = "") => {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${table} ${where}`);
  return Number(rows[0]?.total || 0);
};

const sumRows = async (table, column, where = "") => {
  const [rows] = await db.query(`SELECT COALESCE(SUM(${column}), 0) AS total FROM ${table} ${where}`);
  return Number(rows[0]?.total || 0);
};

exports.summary = async (req, res) => {
  try {
    const [
      vendors,
      activeVendors,
      customers,
      activeCustomers,
      products,
      activeProducts,
      warehouses,
      activeWarehouses,
      orders,
      pendingOrders,
      deliveries,
      activeDeliveries,
      revenue,
      unpaidAmount,
      lowStockAlerts,
      unreadNotifications,
      recentActivities,
    ] = await Promise.all([
      countRows("vendors"),
      countRows("vendors", "WHERE status = 'active'"),
      countRows("customers"),
      countRows("customers", "WHERE status = 'active'"),
      countRows("products"),
      countRows("products", "WHERE status = 'active'"),
      countRows("warehouses"),
      countRows("warehouses", "WHERE status = 'active'"),
      countRows("orders"),
      countRows("orders", "WHERE order_status IN ('pending','confirmed','processing','packed','dispatched')"),
      countRows("deliveries"),
      countRows("deliveries", "WHERE delivery_status IN ('pending','assigned','picked','in_transit')"),
      sumRows("orders", "total_amount", "WHERE payment_status IN ('paid','partial')"),
      sumRows("invoices", "balance_amount", "WHERE status IN ('sent','partial','overdue')"),
      countRows("inventory_alerts", "WHERE status = 'open'"),
      countRows("notifications"),
      db.query("SELECT action, module, description, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 5"),
    ]);

    res.json({
      success: true,
      data: {
        modules: {
          vendors: { total: vendors, active: activeVendors },
          customers: { total: customers, active: activeCustomers },
          products: { total: products, active: activeProducts },
          warehouses: { total: warehouses, active: activeWarehouses },
          orders: { total: orders, pending: pendingOrders },
          deliveries: { total: deliveries, active: activeDeliveries },
        },
        metrics: {
          revenue,
          unpaidAmount,
          lowStockAlerts,
          unreadNotifications,
        },
        recentActivities: recentActivities[0] || [],
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
      error: error.message,
    });
  }
};
