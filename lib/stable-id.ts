import crypto from "crypto";

const UUID_NAMESPACE = "6f53976b-6e2c-4d1d-9b33-f5d58c6f86d4";

function uuidBytes(uuid: string) {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

function formatUuid(bytes: Buffer) {
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function toStableUuid(value: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return value;
  }

  const hash = crypto
    .createHash("sha1")
    .update(Buffer.concat([uuidBytes(UUID_NAMESPACE), Buffer.from(value)]))
    .digest();

  return formatUuid(Buffer.from(hash.subarray(0, 16)));
}

