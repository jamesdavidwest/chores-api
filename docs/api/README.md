# API Documentation

This directory contains the auto-generated API documentation for the backend boilerplate.

## Files

- `openapi.json` - The complete OpenAPI specification in JSON format
- `index.html` - Interactive HTML documentation using Swagger UI

## Usage

### Generate Documentation

To generate the latest version of the documentation:

```bash
npm run docs:generate
```

This will:

1. Parse all JSDoc comments from the source code
2. Generate an OpenAPI specification
3. Create both JSON and HTML versions of the documentation

### View Documentation

To view the documentation locally:

```bash
npm run docs:serve
```

This will start a local server (default port: 3001) where you can browse the interactive API documentation.

Visit http://localhost:3001 in your browser to view it.

### Integration with CI/CD

Add the documentation generation step to your CI/CD pipeline:

```yaml
steps:
  - name: Generate API Documentation
    run: npm run docs:generate
```

## Updating Documentation

The API documentation is generated from JSDoc comments in the route files. To update the documentation:

1. Add or modify JSDoc comments in the relevant route files
2. Run `npm run docs:generate` to update the documentation
3. Commit the changes to version control

### Example JSDoc Comment

```javascript
/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
```

## Contributing

When adding new endpoints or modifying existing ones:

1. Always include comprehensive JSDoc comments
2. Follow the established OpenAPI 3.0 format
3. Include all possible response scenarios
4. Document security requirements
5. Generate and test the documentation locally before committing

## Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc/blob/master/docs/GETTING-STARTED.md)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
