process.env.NODE_ENV = "test";
process.env.PORT = 3001;
process.env.DB_TYPE = "sqlite";
process.env.DB_PATH = ":memory:";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-token-secret";
process.env.LOG_LEVEL = "error";
process.env.LOG_FORMAT = "text";
