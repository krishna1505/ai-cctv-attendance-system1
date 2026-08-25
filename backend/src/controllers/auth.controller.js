const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!admin || admin.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or inactive account",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        companyId: admin.companyId,
      },
      process.env.JWT_SECRET || "my_super_secret_jwt_key_change_later",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          companyId: admin.companyId,
          companyName: admin.company.name,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

module.exports = { login, logout };