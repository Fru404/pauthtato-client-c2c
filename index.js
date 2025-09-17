import express from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { GoogleSpreadsheet } from "google-spreadsheet";

const app = express();
app.use(express.json());

const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_KEY, "base64").toString("utf8")
);
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

const doc = new GoogleSpreadsheet(SHEET_ID);
await doc.useServiceAccountAuth(creds);
await doc.loadInfo();
const sheet = doc.sheetsByIndex[0];

app.post("/register", async (req, res) => {
  try {
    const { apiKey, serviceName } = req.body;
    if (apiKey !== process.env.MASTER_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    if (!serviceName) return res.status(400).json({ error: "Missing serviceName" });

    const row = {
      servicename: serviceName,
      userid: `pauthtato-${crypto.randomBytes(3).toString("hex")}`,
      serviceid: `${serviceName}-bundle-${crypto.randomBytes(3).toString("hex")}`,
      uuid: uuidv4(),
      publickey: crypto.randomBytes(32).toString("hex"),
      obkupid: crypto.randomBytes(32).toString("hex"),
      timestamp: Date.now(),
    };

    await sheet.addRow(row);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running…")
);
