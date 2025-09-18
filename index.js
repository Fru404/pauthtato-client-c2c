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

    // Insert into Supabase table "services"
    const { error } = await supabase.from("pauthtato-c2c").insert([
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

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to register user" });
    }

    res.json({ serviceName, userID, serviceID, uuid, publicKey, ObkupID, timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
