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

    // 2. Query param fallback (e.g. for direct browser exports/reports)
    if (!token && req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access Denied: Token missing or invalid format (Bearer token required)",
      });
    }

    // 3. Check Server-side Token Blacklist (Logout check)
    const tokenTable =
      prisma.tokenBlacklist ||
      prisma.revokedToken ||
      prisma.blacklistedToken;

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

    // 4. Verify JWT Payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    // 5. Attach Tenant & User Context strictly
    req.user = decoded;
    req.companyId = decoded.companyId || decoded.company_id;
    req.adminId = decoded.id || decoded.userId || decoded.adminId;

    if (!req.companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: No tenant/company context associated with token",
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please log in again.",
      });
    }
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
  authenticate: authenticateToken,
};