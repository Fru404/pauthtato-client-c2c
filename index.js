// server.js
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(
  cors({
    origin: true,          // adjust to your front-end origin if needed
    credentials: true,     // allow cookies to be sent
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Optional session usage if needed elsewhere
app.use(
  session({
    secret: crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
  })
);

// ---------- Register Route ----------
app.post("/register", async (req, res) => {
  try {
    const { apiKey, serviceName } = req.body;

    if (apiKey !== process.env.MASTER_API_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    if (!serviceName) {
      return res.status(400).json({ error: "Missing serviceName" });
    }

    // Generate IDs
    const userID = `pauthtato-${crypto.randomBytes(3).toString("hex")}`;
    const bundleID = crypto.randomBytes(3).toString("hex");
    const serviceID = `${serviceName}-bundle-${bundleID}`;
    const ObkupID = crypto.randomBytes(32).toString("hex");
    const publicKey = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now();
    const uuid = uuidv4();

    // Insert into pauthtato-client-c2c
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

    // Get last block hash/index
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

    // Block data payload
    const blockData = {
      user_id: userID,
      service_name: serviceName,
      service_id: serviceID,
      uuid,
      public_key: publicKey,
      obkup_id: ObkupID,
      timestamp,
    };

    // Calculate block hash
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
      hash,
    };

    // Insert into pauthtato-block
    const { error: blockError } = await supabase
      .from("pauthtato-block")
      .insert([block]);

    if (blockError) {
      console.error(blockError);
      return res
        .status(500)
        .json({ error: "Failed to insert block to table:pauthtato-block" });
    }

    // Store block in a secure, long-lived cookie
    res.cookie("pauthtato_block", JSON.stringify(block), {
      httpOnly: true,
      secure: true, // set to true in production with HTTPS
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    res.json({ message: "Registration successful", block });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// ---------- Sign-In Route ----------
app.post("/signin", (req, res) => {
  const cookieData = req.cookies.pauthtato_block;
  if (!cookieData) {
    return res.status(401).json({ error: "No cookie found, please register" });
  }

  try {
    const block = JSON.parse(cookieData);
    // Optionally verify hash or cross-check with DB
    res.json({ message: "Login successful via cookie", block });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid cookie data" });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
