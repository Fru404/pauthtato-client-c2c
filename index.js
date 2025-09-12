// index.js
import express from "express";
import { createBlock } from "./api/create-block.js";
import { createAccount } from "./api/create-account.js";

const app = express();
app.use(express.json());

// Mount your routes
app.use("/api/create-block", createBlock);
app.use("/api/create-account", createAccount);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
