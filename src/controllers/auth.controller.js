const bcrypt = require("bcryptjs");
const jwtService = require("../services/JWTService");
const { AppError } = require("../utils/AppError");
const authConfig = require("../config/auth");
const UserService = require("../services/UserService");

class AuthController {
  constructor() {
    this.userService = UserService;
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        throw new AppError(
          400,
          "MISSING_CREDENTIALS",
          "Email and password are required",
          {
            type: "validation",
          }
        );
      }

      // Get user by email
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials", {
          type: "authentication",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials", {
          type: "authentication",
        });
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        instanceId: user.instanceId,
        roles: user.roles,
      };

      const { accessToken, refreshToken } =
        jwtService.generateTokenPair(tokenPayload);

      // Set refresh token as HTTP-only cookie
      res.cookie(authConfig.session.cookieName, refreshToken, {
        httpOnly: true,
        secure: authConfig.session.secure,
        sameSite: authConfig.session.sameSite,
        maxAge: authConfig.session.cookieMaxAge,
      });

      // Return access token and user info using standardized response
      res.success({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          instanceId: user.instanceId,
          roles: user.roles,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies[authConfig.session.cookieName];
      if (!refreshToken) {
        throw new AppError(
          401,
          "REFRESH_TOKEN_MISSING",
          "Refresh token not found",
          {
            type: "authentication",
          }
        );
      }

      const { accessToken, refreshToken: newRefreshToken } =
        jwtService.refreshAccessToken(refreshToken);

      // Update refresh token cookie
      res.cookie(authConfig.session.cookieName, newRefreshToken, {
        httpOnly: true,
        secure: authConfig.session.secure,
        sameSite: authConfig.session.sameSite,
        maxAge: authConfig.session.cookieMaxAge,
      });

      res.success({ accessToken });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      // Clear refresh token cookie
      res.clearCookie(authConfig.session.cookieName);

      res.success({ message: "Successfully logged out" });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await this.userService.findById(userId);
      if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found", {
          type: "notFound",
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isValidPassword) {
        throw new AppError(
          401,
          "INVALID_PASSWORD",
          "Current password is incorrect",
          {
            type: "authentication",
          }
        );
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await this.userService.updatePassword(userId, hashedPassword);

      res.success({ message: "Password successfully updated" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
