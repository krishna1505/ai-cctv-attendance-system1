const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

// POST /api/auth/login
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

    if (admin.company && admin.company.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Company account is inactive",
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

    // Module 1 Security: Record AuditLog for Successful Login (Schema-compliant)
    await prisma.auditLog.create({
      data: {
        companyId: admin.companyId,
        adminUserId: admin.id,
        action: "USER_LOGIN_SUCCESS",
        entityType: "AUTH",
        entityId: admin.id,
        details: { role: admin.role, email: admin.email },
        ipAddress: req.ip || req.socket?.remoteAddress || "::1",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      companyId: admin.companyId,
      user: {
        id: admin.id,
        name: admin.email.split("@")[0],
        email: admin.email,
        role: admin.role,
        companyId: admin.companyId,
        companyName: admin.company?.name || null,
      },
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          companyId: admin.companyId,
          companyName: admin.company?.name || null,
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

// POST /api/auth/logout (Real Server-Side Blacklist Invalidation & AuditLog)
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token);

      // Extract expiry or fallback to 24h
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Save token to blacklist table
      await prisma.tokenBlacklist.upsert({
        where: { token },
        update: {},
        create: {
          token,
          expiresAt,
        },
      });

      // Module 1 Security: Record AuditLog for Logout Event (Schema-compliant)
      if (decoded?.companyId) {
        await prisma.auditLog.create({
          data: {
            companyId: decoded.companyId,
            adminUserId: decoded.id || null,
            action: "USER_LOGOUT",
            entityType: "AUTH",
            entityId: decoded.id || null,
            details: { tokenRevoked: true, email: decoded.email },
            ipAddress: req.ip || req.socket?.remoteAddress || "::1",
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully. Server session invalidated.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(200).json({
      success: true,
      message: "Logged out",
    });
  }
};

module.exports = { login, logout };