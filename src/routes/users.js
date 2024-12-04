const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { getUsers } = require("../utils/dataAccess");

// Get all users
router.get("/", authenticate, async (req, res, next) => {
	try {
		const users = await getUsers();
		res.json(users);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
