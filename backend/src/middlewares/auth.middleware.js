const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const authenticateToken = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization Header
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2. Query param fallback (for direct browser file downloads)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Token missing or invalid format (Bearer token required)",
      });
    }

    // 3. Dynamic Blacklist Token Check (Safe for any schema naming)
    const tokenTable =
      prisma.revokedToken ||
      prisma.blacklistedToken ||
      prisma.tokenBlacklist ||
      prisma.revoked_tokens ||
      prisma.blacklisted_tokens;

    if (tokenTable && typeof tokenTable.findUnique === "function") {
      const blacklisted = await tokenTable.findUnique({
        where: { token },
      });

      if (blacklisted) {
        return res.status(401).json({
          success: false,
          message: "Session expired / Token revoked. Please log in again.",
        });
      }
    }

    // 4. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");
    req.user = decoded;
    req.companyId = decoded.companyId;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

module.exports = {
  authenticateToken,
  verifyToken: authenticateToken,
};