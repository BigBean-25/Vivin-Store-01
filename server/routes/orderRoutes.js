const express = require("express");

const {
  getSummary,
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderPayments,
  createOrderPayment,
  getOrderInvoice,
  generateOrderInvoice,
  getOrderDelivery,
  dispatchOrder,
  updateDeliveryStatus,
  getOrderReturns,
  createOrderReturn,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, getSummary);

router.get("/:id/payments",         protect, getOrderPayments);
router.post("/:id/payments",        protect, createOrderPayment);
router.get("/:id/invoice",          protect, getOrderInvoice);
router.post("/:id/invoice",         protect, generateOrderInvoice);
router.get("/:id/delivery",         protect, getOrderDelivery);
router.post("/:id/dispatch",        protect, dispatchOrder);
router.patch("/:id/delivery-status",protect, updateDeliveryStatus);
router.get("/:id/returns",          protect, getOrderReturns);
router.post("/:id/return",          protect, createOrderReturn);

router.get("/",         protect, getAllOrders);
router.get("/:id",      protect, getOrderById);
router.post("/",        protect, createOrder);
router.put("/:id",      protect, updateOrder);
router.patch("/:id/status", protect, updateOrderStatus);
router.delete("/:id",   protect, deleteOrder);

module.exports = router;
