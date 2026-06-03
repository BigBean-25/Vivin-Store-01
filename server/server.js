const app = require("./app");
require("dotenv").config();

// Add missing routes directly to ensure they're loaded
const procurementDocumentRoutes = require("./routes/procurementDocumentRoutes");
const procurementRequisitionConversionRoutes = require("./routes/procurementRequisitionConversionRoutes");
const procurementRateContractCheckRoutes = require("./routes/procurementRateContractCheckRoutes");
const procurementAlertRoutes = require("./routes/procurementAlertRoutes");
const procurementMasterDashboardRoutes = require("./routes/procurementMasterDashboardRoutes");

app.use("/api/procurement-documents", procurementDocumentRoutes);
app.use("/api/procurement-requisition-conversions", procurementRequisitionConversionRoutes);
app.use("/api/procurement-rate-contract-checks", procurementRateContractCheckRoutes);
app.use("/api/procurement-alerts", procurementAlertRoutes);
app.use("/api/procurement-master-dashboard", procurementMasterDashboardRoutes);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Vivin Store server running on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server error:", error.message);
});