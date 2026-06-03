const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role_name,
      user_type: user.user_type,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const [users] = await db.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.password,
        u.avatar,
        u.user_type,
        u.status,
        r.name AS role_name,
        r.display_name AS role_display_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      await db.query(
        "INSERT INTO login_logs (email, status, message) VALUES (?, 'failed', ?)",
        [email, "User not found"]
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await db.query(
        "INSERT INTO login_logs (user_id, email, status, message) VALUES (?, ?, 'failed', ?)",
        [user.id, user.email, "Wrong password"]
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    await db.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
      user.id,
    ]);

    await db.query(
      "INSERT INTO login_logs (user_id, email, status, message) VALUES (?, ?, 'success', ?)",
      [user.id, user.email, "Login successful"]
    );

    const token = createToken(user);

    delete user.password;

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

exports.me = async (req, res) => {
  try {
    const [users] = await db.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.avatar,
        u.user_type,
        u.status,
        r.name AS role_name,
        r.display_name AS role_display_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};