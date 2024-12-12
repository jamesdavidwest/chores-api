const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-default-secret-key-do-not-use-in-production',
    refreshSecret:
      process.env.REFRESH_TOKEN_SECRET ||
      'your-default-refresh-secret-key-do-not-use-in-production',
    accessExpiresIn: process.env.JWT_EXPIRY || '1h',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },
  password: {
    saltRounds: 12,
    minLength: 8,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  session: {
    cookieName: 'refresh_token',
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  tokens: {
    accessTokenHeader: 'Authorization',
    refreshTokenHeader: 'X-Refresh-Token',
    bearerPrefix: 'Bearer',
  },
};

module.exports = config;
