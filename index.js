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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const secretKey = crypto.randomBytes(32).toString("hex");
app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
  })
);

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

    // --- Insert into pauthtato-client-c2c (original record) ---
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

    // --- Determine previous hash and next block index ---
    const { data: lastBlock, error: fetchErr } = await supabase
      .from("pauthtato-chain")
      .select("index, hash")
      .order("index", { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error(fetchErr);
      return res.status(500).json({ error: "Failed to fetch previous block" });
    }

    const prevIndex = lastBlock && lastBlock.length > 0 ? lastBlock[0].index : -1;
    const index = prevIndex + 1;
    const previous_hash =
      prevIndex === -1 ? "0".repeat(64) : lastBlock[0].hash;

    // --- Data payload of this block ---
    const blockData = {
      user_id: userID,
      service_name: serviceName,
      service_id: serviceID,
      uuid,
      public_key: publicKey,
      obkup_id: ObkupID,
      timestamp,
    };

    // --- Create the block object and calculate its hash ---
    const blockString = JSON.stringify({
      index,
      previous_hash,
      data: blockData,
      timestamp,
    });
    const hash = crypto.createHash("sha256").update(blockString).digest("hex");

    const block = {
      index,
      previous_hash,
      user_id: userID,
      service_name: serviceName,
      service_id: serviceID,
      uuid,
      public_key: publicKey,
      obkup_id: ObkupID,
      timestamp,
      timestamp,
      hash,
    };

    // --- Insert the block into pauthtato-chain ---
    const { error: chainError } = await supabase
      .from("pauthtato-chain")
      .insert([block]);

    if (chainError) {
      console.error(chainError);
      return res.status(500).json({ error: "Failed to insert blockchain block" });
    }

    res.json({ ...block });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
