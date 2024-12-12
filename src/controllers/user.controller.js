// src/controllers/user.controller.js
const UserService = require('../services/UserService');
const AppError = require('../utils/AppError');
const { generateTokens } = require('../utils/auth');

class UserController {
    constructor() {
        this.userService = new UserService();
    }

    async register(userData) {
        try {
            const existingUser = await this.userService.findByEmail(userData.email);
            if (existingUser) {
                throw new AppError(409, 'USER_EXISTS', 'User with this email already exists');
            }

            const user = await this.userService.create(userData);
            const { password, ...userWithoutPassword } = user;
            
            // Generate tokens
            const tokens = await generateTokens(user);
            
            return {
                user: userWithoutPassword,
                ...tokens
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'REGISTRATION_ERROR', 'Error during registration', error);
        }
    }

    async login(credentials) {
        try {
            const user = await this.userService.validateCredentials(
                credentials.email,
                credentials.password
            );

            if (!user) {
                throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
            }

            const { password, ...userWithoutPassword } = user;
            
            // Generate tokens
            const tokens = await generateTokens(user);
            
            return {
                user: userWithoutPassword,
                ...tokens
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'LOGIN_ERROR', 'Error during login', error);
        }
    }

    async list(page, limit, filters) {
        try {
            return await this.userService.list(page, limit, filters);
        } catch (error) {
            throw new AppError(500, 'USER_LIST_ERROR', 'Error retrieving users', error);
        }
    }

    async getById(id) {
        try {
            const user = await this.userService.getById(id);
            if (!user) {
                throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
            }
            
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'USER_FETCH_ERROR', 'Error retrieving user', error);
        }
    }

    async update(id, userData) {
        try {
            // If email is being updated, check it's not already taken
            if (userData.email) {
                const existingUser = await this.userService.findByEmail(userData.email);
                if (existingUser && existingUser.id !== id) {
                    throw new AppError(409, 'EMAIL_EXISTS', 'Email already in use');
                }
            }

            const user = await this.userService.update(id, userData);
            if (!user) {
                throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
            }

            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'USER_UPDATE_ERROR', 'Error updating user', error);
        }
    }

    async delete(id) {
        try {
            const result = await this.userService.delete(id);
            if (!result) {
                throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
            }
            return result;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'USER_DELETE_ERROR', 'Error deleting user', error);
        }
    }

    async logout(userId) {
        try {
            await this.userService.invalidateTokens(userId);
            return true;
        } catch (error) {
            throw new AppError(500, 'LOGOUT_ERROR', 'Error during logout', error);
        }
    }

    async refreshToken(refreshToken) {
        try {
            const tokens = await this.userService.refreshToken(refreshToken);
            if (!tokens) {
                throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
            }
            return tokens;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'TOKEN_REFRESH_ERROR', 'Error refreshing token', error);
        }
    }

    async forgotPassword(email) {
        try {
            const user = await this.userService.findByEmail(email);
            if (user) {
                const resetToken = await this.userService.generatePasswordResetToken(user.id);
                await mailer.sendPasswordResetEmail(email, resetToken);
            }
            // Always return success to prevent email enumeration
            return true;
        } catch (error) {
            throw new AppError(500, 'PASSWORD_RESET_ERROR', 'Error initiating password reset', error);
        }
    }

    async resetPassword(token, newPassword) {
        try {
            const userId = await this.userService.validatePasswordResetToken(token);
            if (!userId) {
                throw new AppError(400, 'INVALID_TOKEN', 'Invalid or expired password reset token');
            }

            await this.userService.updatePassword(userId, newPassword);
            await this.userService.invalidatePasswordResetToken(token);
            return true;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'PASSWORD_RESET_ERROR', 'Error resetting password', error);
        }
    }

    async verifyEmail(token) {
        try {
            const userId = await this.userService.validateEmailVerificationToken(token);
            if (!userId) {
                throw new AppError(400, 'INVALID_TOKEN', 'Invalid or expired email verification token');
            }

            await this.userService.markEmailAsVerified(userId);
            await this.userService.invalidateEmailVerificationToken(token);
            return true;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(500, 'EMAIL_VERIFICATION_ERROR', 'Error verifying email', error);
        }
    }

    async resendVerificationEmail(email) {
        try {
            const user = await this.userService.findByEmail(email);
            if (user && !user.emailVerified) {
                const verificationToken = await this.userService.generateEmailVerificationToken(user.id);
                await mailer.sendVerificationEmail(email, verificationToken);
            }
            // Always return success to prevent email enumeration
            return true;
        } catch (error) {
            throw new AppError(500, 'VERIFICATION_EMAIL_ERROR', 'Error sending verification email', error);
        }
    }
}

module.exports = UserController;