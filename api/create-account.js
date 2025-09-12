import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { service } = req.body || {};
  const serviceName = service || "unknown-service";

  const userID = `pauthtato-${crypto.randomBytes(3).toString("hex")}`;
  const bundleID = crypto.randomBytes(3).toString("hex");
  const serviceID = `${serviceName}-bundle-${bundleID}`;

  res.status(200).json({
    userID,
    serviceID,
    uuid: uuidv4(),
    publicKey: crypto.randomBytes(32).toString("hex"),
    ObkupID: crypto.randomBytes(32).toString("hex"),
    timestamp: Date.now()
  });
}
