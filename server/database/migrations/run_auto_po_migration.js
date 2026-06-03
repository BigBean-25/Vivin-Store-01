const db = require("../../config/db");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, "create_procurement_reorder_po_links_table.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await db.query(statement);
    }

    console.log("✅ Procurement reorder PO links table created successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error.message);
    process.exit(1);
  }
}

runMigration();
