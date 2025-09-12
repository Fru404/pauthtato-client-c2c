import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const r = await axios.post(
      "http://<YOUR_GPYCRAFT_HOST>/create-block",
      req.body,
      { timeout: 5000 }
    );
    res.status(200).json({ status: "forwarded", gpycraftResponse: r.data });
  } catch (err) {
    console.error(err.message);
    res.status(502).json({ error: "Failed to reach gpycraft service." });
  }
}
