// scripts/generate-docs.js

const fs = require("fs");
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerConfig = require("../src/config/swagger");

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Generate OpenAPI specification
const spec = swaggerJsdoc(swaggerConfig);

// Create docs/api directory if it doesn't exist
const apiDocsDir = path.join(__dirname, "..", "docs", "api");
ensureDirectoryExists(apiDocsDir);

// Write OpenAPI spec to JSON file
fs.writeFileSync(
  path.join(apiDocsDir, "openapi.json"),
  JSON.stringify(spec, null, 2),
  "utf8"
);

// Generate HTML version using swagger-ui-dist
const generateHtmlDoc = (spec) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" >
    <style>
      html {
        box-sizing: border-box;
        overflow: -moz-scrollbars-vertical;
        overflow-y: scroll;
      }
      *,
      *:before,
      *:after {
        box-sizing: inherit;
      }
      body {
        margin: 0;
        background: #fafafa;
      }
      .swagger-ui .topbar {
        background-color: #1b1b1b;
      }
      .swagger-ui .info .title small.version-stamp {
        background-color: #4CAF50;
      }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"></script>
    <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(spec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout",
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        defaultModelRendering: 'model',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        displayRequestDuration: true,
        docExpansion: 'list',
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
      });
      window.ui = ui;
    };
    </script>
</body>
</html>`;
};

// Write HTML documentation
fs.writeFileSync(
  path.join(apiDocsDir, "index.html"),
  generateHtmlDoc(spec),
  "utf8"
);

console.log("API documentation generated successfully in docs/api/");
