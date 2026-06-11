const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketplaceManagementController");

const router = express.Router();

// ── Lookup routes (master dropdown data, static) ─────────────────────────
router.get("/lookups/marketplaces", protect, ctrl.getLookupMarketplaces);
router.get("/lookups/vendors",      protect, ctrl.getLookupVendors);
router.get("/lookups/products",     protect, ctrl.getLookupProducts);

// ── Summary routes (static, all before /:id) ─────────────────────────────
router.get("/marketplaces/summary", protect, ctrl.getMarketplacesSummary);
router.get("/vendors/summary",      protect, ctrl.getMktVendorsSummary);
router.get("/products/summary",     protect, ctrl.getMktProductsSummary);
router.get("/mapping/summary",      protect, ctrl.getMappingSummary);
router.get("/pricing/summary",      protect, ctrl.getPricingSummary);
router.get("/approvals/summary",    protect, ctrl.getApprovalsSummary);

// ── Report sub-routes (all static) ───────────────────────────────────────
router.get("/reports/summary",      protect, ctrl.getReportsSummary);
router.get("/reports/marketplaces", protect, ctrl.getReportMarketplaces);
router.get("/reports/vendors",      protect, ctrl.getReportVendors);
router.get("/reports/products",     protect, ctrl.getReportProducts);
router.get("/reports/pricing",      protect, ctrl.getReportPricing);
router.get("/reports/approvals",    protect, ctrl.getReportApprovals);

// ── Bulk action (static, must be before /:id patches) ────────────────────
router.patch("/products/bulk-status", protect, ctrl.bulkUpdateProductStatus);

// ── List routes (static) ─────────────────────────────────────────────────
router.get("/marketplaces", protect, ctrl.getMarketplaces);
router.get("/vendors",      protect, ctrl.getMktVendors);
router.get("/products",     protect, ctrl.getMktProducts);
router.get("/mapping",      protect, ctrl.getMapping);
router.get("/pricing",      protect, ctrl.getPricing);
router.get("/approvals",    protect, ctrl.getApprovals);

// ── Marketplace CRUD ─────────────────────────────────────────────────────
router.post("/marketplaces",             protect, ctrl.createMarketplace);
router.get("/marketplaces/:id",          protect, ctrl.getMarketplaceById);
router.put("/marketplaces/:id",          protect, ctrl.updateMarketplace);
router.patch("/marketplaces/:id/status", protect, ctrl.updateMarketplaceStatus);
router.delete("/marketplaces/:id",       protect, ctrl.deleteMarketplace);

// ── Marketplace Vendors CRUD ─────────────────────────────────────────────
router.post("/vendors",             protect, ctrl.createMktVendor);
router.get("/vendors/:id",          protect, ctrl.getMktVendorById);
router.put("/vendors/:id",          protect, ctrl.updateMktVendor);
router.patch("/vendors/:id/status", protect, ctrl.updateMktVendorStatus);
router.delete("/vendors/:id",       protect, ctrl.deleteMktVendor);

// ── Marketplace Products CRUD + status + pricing + approve/reject ─────────
router.post("/products",               protect, ctrl.createMktProduct);
router.get("/products/:id",            protect, ctrl.getMktProductById);
router.put("/products/:id",            protect, ctrl.updateMktProduct);
router.put("/products/:id/pricing",    protect, ctrl.updateMktProductPricing);
router.patch("/products/:id/status",   protect, ctrl.updateMktProductStatus);
router.patch("/products/:id/active",   protect, ctrl.activateMktProduct);
router.patch("/products/:id/approve",  protect, ctrl.approveMktProduct);
router.patch("/products/:id/reject",   protect, ctrl.rejectMktProduct);
router.delete("/products/:id",         protect, ctrl.deleteMktProduct);

// ── Mapping CRUD ─────────────────────────────────────────────────────────
router.post("/mapping",       protect, ctrl.createMapping);
router.get("/mapping/:id",    protect, ctrl.getMappingById);
router.put("/mapping/:id",    protect, ctrl.updateMapping);
router.delete("/mapping/:id", protect, ctrl.deleteMapping);

// ── Pricing detail ───────────────────────────────────────────────────────
router.get("/pricing/:id",    protect, ctrl.getPricingById);

module.exports = router;
