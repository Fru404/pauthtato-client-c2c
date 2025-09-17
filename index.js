import express from "express";
import cors from "cors";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { GoogleSpreadsheet } from "google-spreadsheet";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ---- Load credentials.json ----
const creds = JSON.parse(fs.readFileSync("./credentials.json", "utf8"));

// ---- Google Sheets setup ----
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

// Authenticate using the service account
await doc.useServiceAccountAuth(creds);

await doc.loadInfo();
const sheet = doc.sheetsByIndex[0];

// ---- API route ----
app.post("/register", async (req, res) => {
  try {
    const { apiKey, serviceName } = req.body;

    if (apiKey !== process.env.MASTER_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    if (!serviceName) {
      return res.status(400).json({ error: "Missing serviceName" });
    }

    const userID    = `pauthtato-${crypto.randomBytes(3).toString("hex")}`;
    const bundleID  = crypto.randomBytes(3).toString("hex");
    const serviceID = `${serviceName}-bundle-${bundleID}`;
    const ObkupID   = crypto.randomBytes(32).toString("hex");
    const publicKey = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now();
    const uuid      = uuidv4();

    await sheet.addRow({
      servicename: serviceName,
      userid: userID,
      serviceid: serviceID,
      uuid,
      publickey: publicKey,
      obkupid: ObkupID,
      timestamp,
    });

    res.json({
      servicename: serviceName,
      userid: userID,
      serviceid: serviceID,
      uuid,
      publickey: publicKey,
      obkupid: ObkupID,
      timestamp,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
