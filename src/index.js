require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initializeDatabase } = require("./data/init");
const authRoutes = require("./routes/auth");

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

// Initialize database
initializeDatabase();

// Basic route
app.get("/", (req, res) => {
	res.json({ message: "Chores API is running" });
});

// Start server
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
