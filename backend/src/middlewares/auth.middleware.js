const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access Denied: Token missing",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "my_super_secret_jwt_key_change_later"
    );

    if (decoded.role !== "COMPANY_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only COMPANY_ADMIN is allowed",
      });
    }

    req.user = decoded; // { id, email, role, companyId }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = { verifyToken };