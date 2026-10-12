import crypto from "crypto";

export const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    return Buffer.from("01234567890123456789012345678901", "utf-8");
  }
  
  // 64 hex characters = 32 bytes
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, "hex");
  }

  // Exact 32 characters
  if (key.length === 32) {
    return Buffer.from(key, "utf-8");
  }

  // Any other length: safely hash to 32 bytes with SHA-256
  return crypto.createHash("sha256").update(key).digest();
};

const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const keyBuffer = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  const textParts = text.split(":");
  const ivStr = textParts.shift();
  if (!ivStr) throw new Error("Invalid encrypted string format");
  const iv = Buffer.from(ivStr, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const keyBuffer = getEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
