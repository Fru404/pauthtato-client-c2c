import express from "express";
import cors from "cors";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
const secretKey = crypto.randomBytes(32).toString("hex");
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
  })
);

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

    const userID = `pauthtato-${crypto.randomBytes(3).toString("hex")}`;
    const bundleID = crypto.randomBytes(3).toString("hex");
    const serviceID = `${serviceName}-bundle-${bundleID}`;
    const ObkupID = crypto.randomBytes(32).toString("hex");
    const publicKey = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now();
    const uuid = uuidv4();

    // 1️⃣ Insert into pauthtato-client-c2c
    const { error: insertError } = await supabase
      .from("pauthtato-client-c2c")
      .insert([
        {
          user_id: userID,
          service_name: serviceName,
          service_id: serviceID,
          uuid,
          public_key: publicKey,
          obkup_id: ObkupID,
          timestamp,
        },
      ]);

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: "Failed to register user" });
    }

    // 2️⃣ Create a hash of the record for the blockchain table
    const hashPayload = `${userID}${serviceName}${serviceID}${uuid}${publicKey}${ObkupID}${timestamp}`;
    const hash = crypto.createHash("sha256").update(hashPayload).digest("hex");

    // 3️⃣ Insert duplicate block into pauthtato-chain with the hash
    const { error: chainError } = await supabase
      .from("pauthtato-chain")
      .insert([
        {
          user_id: userID,
          service_name: serviceName,
          service_id: serviceID,
          uuid,
          public_key: publicKey,
          obkup_id: ObkupID,
          timestamp,
          hash, // extra column
        },
      ]);

    if (chainError) {
      console.error(chainError);
      return res.status(500).json({ error: "Failed to insert blockchain record" });
    }

    res.json({
      serviceName,
      userID,
      serviceID,
      uuid,
      publicKey,
      ObkupID,
      timestamp,
      hash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
