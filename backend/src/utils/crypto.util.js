const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || "12345678901234567890123456789012").padEnd(32, "0").slice(0, 32)
);
const IV_LENGTH = 16;

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(String(text), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decrypt = (text) => {
  if (!text) return null;
  try {
    const parts = text.split(":");
    if (parts.length < 2) return text;
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return text;
  }
};

module.exports = { encrypt, decrypt };