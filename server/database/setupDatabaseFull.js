const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const setupDatabase = async () => {
  let connection;

  try {
    // Step 1: Connect without database selected
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 3306,
      multipleStatements: true,
    });

    console.log("MySQL connected successfully");

    // Step 2: Create database
    const dbName = process.env.DB_NAME;

    if (!dbName) {
      throw new Error("DB_NAME is not set in .env");
    }

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );

    await connection.query(`USE \`${dbName}\`;`);

    console.log(`Database "${dbName}" selected`);

    // Step 3: Run full schema.sql
    const schemaPath = path.join(__dirname, "schema.sql");

    if (!fs.existsSync(schemaPath)) {
      throw new Error("schema.sql not found inside the database folder");
    }

    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    await connection.query(schemaSql);

    console.log("All Vivin Store tables created successfully");

    // Step 4: Create Super Admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@vivinstore.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
    const adminPhone = process.env.ADMIN_PHONE || "9999999999";

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await connection.query(
      `
      INSERT INTO users (name, email, phone, password, user_type, status)
      VALUES (?, ?, ?, ?, 'super_admin', 'active')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        phone = VALUES(phone),
        password = VALUES(password),
        user_type = 'super_admin',
        status = 'active';
      `,
      ["Super Admin", adminEmail, adminPhone, hashedPassword]
    );

    console.log("Super Admin user created/updated");

    // Step 5: Fetch role and user
    const [[roleRow]] = await connection.query(
      "SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1;"
    );

    if (!roleRow) {
      throw new Error(
        "super_admin role not found in roles table. Check schema.sql starter role insert."
      );
    }

    const [[userRow]] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1;",
      [adminEmail]
    );

    if (!userRow) {
      throw new Error("Super admin user not found after insert");
    }

    // Step 6: Assign Super Admin role
    await connection.query(
      `
      INSERT INTO user_roles (user_id, role_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE role_id = VALUES(role_id);
      `,
      [userRow.id, roleRow.id]
    );

    console.log("Super Admin role assigned");

    console.log("\n--------------------------------------");
    console.log("Vivin Store DB setup complete");
    console.log("Email   :", adminEmail);
    console.log("Password:", adminPassword);
    console.log("--------------------------------------\n");

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Database setup failed:", error.message);

    if (connection) {
      await connection.end().catch(() => {});
    }

    process.exit(1);
  }
};

setupDatabase();