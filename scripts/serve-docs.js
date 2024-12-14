// scripts/serve-docs.js

const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");

// Create Express app
const app = express();

// Enable CORS
app.use(cors());

// Serve static documentation files
app.use(express.static(path.join(__dirname, "..", "docs", "api")));

// Serve Swagger UI
const swaggerDocument = require("../docs/api/openapi.json");
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "API Documentation",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      syntaxHighlight: {
        activate: true,
        theme: "monokai",
      },
    },
  })
);

// Redirect root to API docs
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// Start server
const PORT = process.env.DOCS_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Documentation server running on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});
