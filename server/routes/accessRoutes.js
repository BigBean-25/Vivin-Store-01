const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const C = require("../controllers/accessController");

const router = express.Router();

/* ── static summary routes (must be before /:id) ── */
router.get("/users/summary",           protect, C.getUsersSummary);
router.get("/roles/summary",           protect, C.getRolesSummary);
router.get("/login-logs/summary",      protect, C.getLoginLogsSummary);
router.get("/approvals/summary",       protect, C.getApprovalsSummary);

/* ── users ── */
router.get("/users",                   protect, C.getUsers);
router.post("/users",                  protect, C.createUser);
router.get("/users/:id",               protect, C.getUser);
router.put("/users/:id",               protect, C.updateUser);
router.patch("/users/:id/status",      protect, C.updateUserStatus);
router.patch("/users/:id/password",    protect, C.updateUserPassword);
router.patch("/users/:id/force-reset", protect, C.forcePasswordReset);
router.delete("/users/:id",            protect, C.deleteUser);

/* ── user sub-resources (before /:id generic) ── */
router.get("/users/:userId/outlets",   protect, C.getUserOutlets);
router.put("/users/:userId/outlets",   protect, C.updateUserOutlets);
router.get("/users/:userId/modules",   protect, C.getUserModules);
router.put("/users/:userId/modules",   protect, C.updateUserModules);

/* ── roles ── */
router.get("/roles",                   protect, C.getRoles);
router.post("/roles",                  protect, C.createRole);
router.get("/roles/:id",               protect, C.getRole);
router.put("/roles/:id",               protect, C.updateRole);
router.patch("/roles/:id/status",      protect, C.updateRoleStatus);
router.delete("/roles/:id",            protect, C.deleteRole);

/* ── role sub-resources ── */
router.get("/roles/:roleId/permissions",  protect, C.getRolePermissions);
router.put("/roles/:roleId/permissions",  protect, C.updateRolePermissions);
router.get("/roles/:roleId/modules",      protect, C.getRoleModules);
router.put("/roles/:roleId/modules",      protect, C.updateRoleModules);

/* ── permissions ── */
router.get("/permissions",             protect, C.getPermissions);

/* ── outlets ── */
router.get("/outlets",                 protect, C.getOutlets);

/* ── modules ── */
router.get("/modules",                 protect, C.getModules);

/* ── login logs ── */
router.get("/login-logs",              protect, C.getLoginLogs);

/* ── approvals ── */
router.get("/approvals",               protect, C.getApprovals);
router.patch("/approvals/:id/approve", protect, C.approveUser);
router.patch("/approvals/:id/reject",  protect, C.rejectUser);

module.exports = router;
