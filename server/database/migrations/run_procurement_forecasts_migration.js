const db = require("../../config/db");
const fs = require("fs");
const path = require("path");

const runMigration = async () => {
  try {
    const sqlPath = path.join(__dirname, "create_procurement_forecasts_tables.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await db.query(statement);
    }

    console.log("Procurement forecasts tables created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error.message);
    process.exit(1);
  }
};

runMigration();
