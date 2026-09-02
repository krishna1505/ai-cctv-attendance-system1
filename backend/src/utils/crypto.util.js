const crypto = require("crypto");

const GCM_ALGORITHM = "aes-256-gcm";
const CBC_ALGORITHM = "aes-256-cbc";

// 32-byte key generated securely from ENCRYPTION_SECRET or ENCRYPTION_KEY
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(
    process.env.ENCRYPTION_SECRET ||
      process.env.ENCRYPTION_KEY ||
      "default_encryption_secret_key_32b_attendance"
  )
  .digest();

/**
 * Encrypts plain text using AES-256-GCM (Auth Tag included)
 */
function encrypt(text) {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(GCM_ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(String(text), "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    // Format: iv:authTag:encryptedPayload
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("[Crypto Error] Encryption failed:", err.message);
    return null;
  }
}

/**
 * Decrypts cipher text with support for AES-256-GCM and legacy fallback
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== "string") return null;

  try {
    const parts = cipherText.split(":");

    // Case 1: Standard AES-256-GCM (3 parts: iv, authTag, encrypted)
    if (parts.length === 3) {
      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = crypto.createDecipheriv(GCM_ALGORITHM, SECRET_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }

    // Case 2: Legacy AES-256-CBC fallback (2 parts: iv, encrypted)
    if (parts.length === 2) {
      const [ivHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, "hex");

      const decipher = crypto.createDecipheriv(CBC_ALGORITHM, SECRET_KEY, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }

    return cipherText;
  } catch (err) {
    console.error("[Crypto Error] Decryption failed:", err.message);
    return cipherText;
  }
}

module.exports = {
  encrypt,
  decrypt,
};