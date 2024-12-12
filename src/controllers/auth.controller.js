const bcrypt = require('bcryptjs');
const jwtService = require('../services/JWTService');
const { AppError } = require('../utils/AppError');
const { config } = require('../config/auth');
const UserService = require('../services/UserService');

class AuthController {
    constructor() {
        this.userService = UserService;
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                throw new AppError(400, 'AUTH011', 'Email and password are required');
            }

            // Get user by email
            const user = await this.userService.findByEmail(email);
            if (!user) {
                throw new AppError(401, 'AUTH012', 'Invalid credentials');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new AppError(401, 'AUTH013', 'Invalid credentials');
            }

            // Generate tokens
            const tokenPayload = {
                userId: user.id,
                instanceId: user.instanceId,
                roles: user.roles
            };
            
            const { accessToken, refreshToken } = jwtService.generateTokenPair(tokenPayload);

            // Set refresh token as HTTP-only cookie
            res.cookie(config.session.cookieName, refreshToken, {
                httpOnly: true,
                secure: config.session.secure,
                sameSite: config.session.sameSite,
                maxAge: config.session.cookieMaxAge
            });

            // Return access token and user info
            res.json({
                success: true,
                data: {
                    accessToken,
                    user: {
                        id: user.id,
                        email: user.email,
                        instanceId: user.instanceId,
                        roles: user.roles
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies[config.session.cookieName];
            if (!refreshToken) {
                throw new AppError(401, 'AUTH014', 'Refresh token not found');
            }

            const { accessToken, refreshToken: newRefreshToken } = jwtService.refreshAccessToken(refreshToken);

            // Update refresh token cookie
            res.cookie(config.session.cookieName, newRefreshToken, {
                httpOnly: true,
                secure: config.session.secure,
                sameSite: config.session.sameSite,
                maxAge: config.session.cookieMaxAge
            });

            res.json({
                success: true,
                data: { accessToken }
            });
        } catch (error) {
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            // Clear refresh token cookie
            res.clearCookie(config.session.cookieName);

            res.json({
                success: true,
                data: { message: 'Successfully logged out' }
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();