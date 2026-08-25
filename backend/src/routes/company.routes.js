const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  getCompanyProfile,
  updateCompanySettings,
} = require("../controllers/company.controller");

router.get("/profile", verifyToken, getCompanyProfile);
router.put("/settings", verifyToken, updateCompanySettings);

module.exports = router;