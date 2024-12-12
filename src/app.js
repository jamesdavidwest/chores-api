const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { config } = require("./config/auth");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");

// Import routes
const authRoutes = require("./routes/auth.routes");

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "http://localhost:3000",
		credentials: true,
	})
);

// Request parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiting
app.use("/api/", apiLimiter); // General API rate limiting
app.use("/api/v1/auth", authLimiter); // Stricter limiting for auth routes

// API versioning and routes
app.use("/api/v1/auth", authRoutes);

// Basic health check endpoint
app.get("/health", (req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
	console.error(err);

	const statusCode = err.statusCode || 500;
	const errorCode = err.code || "SERVER_ERROR";
	const message = err.message || "Internal Server Error";

	// Only include error details in development
	const details = process.env.NODE_ENV === "development" ? err.details : undefined;

	res.status(statusCode).json({
		success: false,
		error: {
			code: errorCode,
			message: message,
			details: details,
		},
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({
		success: false,
		error: {
			code: "NOT_FOUND",
			message: "Resource not found",
		},
	});
});

module.exports = app;
