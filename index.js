const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios"); // ✅ for forwarding

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Generates account identifiers
app.post("/create-account", (req, res) => {
  const { service } = req.body || {};
  const serviceName = service || "unknown-service";

  const userID   = `pauthtato-${crypto.randomBytes(3).toString("hex")}`;
  const bundleID = crypto.randomBytes(3).toString("hex");
  const serviceID = `${serviceName}-bundle-${bundleID}`;

  const payload = {
    userID,
    serviceID,
    uuid: uuidv4(),
    publicKey: crypto.randomBytes(32).toString("hex"),
    ObkupID: crypto.randomBytes(32).toString("hex"),
    timestamp: Date.now()
  };

  res.json(payload);
});

/**
 * POST /create-block
 * Receives JSON and immediately relays it to gpycraft
 */
app.post("/create-block", async (req, res) => {
  const blockData = req.body;

  if (!blockData || !blockData.userID || !blockData.serviceID || !blockData.uuid) {
    return res.status(400).json({ error: "Missing required block data." });
  }

  try {
    // Forward to gpycraft API
    const gpyResponse = await axios.post(
      "http://localhost:5001/create-block", // <-- gpycraft endpoint
      blockData,
      { timeout: 5000 }
    );

    // Return whatever gpycraft returns
    res.json({
      status: "block_forwarded",
      gpycraftResponse: gpyResponse.data
    });
  } catch (err) {
    console.error("Error forwarding to gpycraft:", err.message);
    res.status(502).json({ error: "Failed to reach gpycraft service." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
