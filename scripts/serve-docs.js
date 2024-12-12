// scripts/serve-docs.js

const express = require("express");
const path = require("path");
const app = express();

const PORT = process.env.DOCS_PORT || 3001;

// Serve static files from the docs/api directory
app.use(express.static(path.join(__dirname, "..", "docs", "api")));

// Serve the main documentation page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "docs", "api", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Documentation server running at http://localhost:${PORT}`);
});
