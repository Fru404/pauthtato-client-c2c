import express from "express";
import cors from "cors";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { google } from "googleapis";
import fs from "fs";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
const secretKey = crypto.randomBytes(32).toString("hex");
app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: false
}));

// Load Google Sheets credentials
const spreadsheetId = process.env.SHEET_ID;
const creds = JSON.parse(fs.readFileSync("./credentials.json", "utf8"));

// Helper: get Google Sheets client
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

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

    const sheets = await getSheetsClient();

    // Append new row to Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1",
      valueInputOption: "RAW",
      resource: {
        values: [[serviceName, userID, serviceID, uuid, publicKey, ObkupID, timestamp]],
      },
    });

    res.json({ serviceName, userID, serviceID, uuid, publicKey, ObkupID, timestamp });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
