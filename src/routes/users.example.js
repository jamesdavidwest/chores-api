const express = require("express");
const router = express.Router();
const UserService = require("../services/UserService");
const { authenticate, authorize } = require("../middleware/auth");

const userService = new UserService();

// Get all users (admin/manager only)
router.get(
  "/",
  authenticate,
  authorize(["ADMIN", "MANAGER"]),
  async (req, res, next) => {
    try {
      const users = await userService.getUsers(req.query);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

// Get user by ID
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    // Only allow users to view their own profile unless admin/manager
    if (
      !["ADMIN", "MANAGER"].includes(req.user.role) &&
      req.params.id !== req.user.id.toString()
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Create new user (admin only)
router.post("/", authenticate, authorize(["ADMIN"]), async (req, res, next) => {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    // Only allow users to update their own profile unless admin
    if (req.user.role !== "ADMIN" && req.params.id !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedUser = await userService.updateUser(req.params.id, req.body);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  async (req, res, next) => {
    try {
      const success = await userService.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Get user points
router.get("/:id/points", authenticate, async (req, res, next) => {
  try {
    if (
      !["ADMIN", "MANAGER"].includes(req.user.role) &&
      req.params.id !== req.user.id.toString()
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const points = await userService.getUserPoints(req.params.id);
    if (!points) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(points);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
