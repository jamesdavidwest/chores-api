// src/config/swagger.js

const path = require('path');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Boilerplate API',
      version: '1.0.0',
      description: 'A modern Node.js REST API boilerplate with comprehensive features',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Local Development Server'
      },
      {
        url: '{protocol}://{hostname}:{port}',
        description: 'Dynamic Server',
        variables: {
          protocol: {
            enum: ['http', 'https'],
            default: 'http'
          },
          hostname: {
            default: 'localhost'
          },
          port: {
            default: '3000'
          }
        }
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'AUTH001'
                      },
                      message: {
                        type: 'string',
                        example: 'Unauthorized access'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'VAL001'
                      },
                      message: {
                        type: 'string',
                        example: 'Validation failed'
                      },
                      details: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string'
                },
                message: {
                  type: 'string'
                },
                details: {
                  type: 'object'
                }
              }
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              example: 10
            },
            total: {
              type: 'integer',
              example: 100
            },
            hasMore: {
              type: 'boolean',
              example: true
            }
          }
        }
      }
    }
  },
  apis: [
    path.join(__dirname, '../routes/**/*.js'),
    path.join(__dirname, '../models/**/*.js'),
    path.join(__dirname, '../schemas/**/*.js')
  ]
};

module.exports = swaggerOptions;