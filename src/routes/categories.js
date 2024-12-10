const express = require('express');
const router = express.Router();
const CategoryService = require('../services/CategoryService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCreateCategory, validateUpdateCategory } = require('../middleware/validation/categoryValidator');

const categoryService = new CategoryService();

// Get all categories
router.get('/', authenticate, async (req, res, next) => {
    try {
        const categories = await categoryService.getCategories(req.query);
        res.json(categories);
    } catch (error) {
        next(error);
    }
});

// Get category hierarchy
router.get('/hierarchy', authenticate, async (req, res, next) => {
    try {
        const hierarchy = await categoryService.getCategoryHierarchy();
        res.json(hierarchy);
    } catch (error) {
        next(error);
    }
});

// Get category by ID
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        next(error);
    }
});

// Create new category (admin/manager only)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), validateCreateCategory, async (req, res, next) => {
    try {
        const newCategory = await categoryService.createCategory(req.validatedData);
        res.status(201).json(newCategory);
    } catch (error) {
        next(error);
    }
});

// Update category (admin/manager only)
router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), validateUpdateCategory, async (req, res, next) => {
    try {
        const updatedCategory = await categoryService.updateCategory(req.params.id, req.validatedData);
        if (!updatedCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(updatedCategory);
    } catch (error) {
        next(error);
    }
});

// Delete category (admin only)
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res, next) => {
    try {
        const success = await categoryService.deleteCategory(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Get tasks in category
router.get('/:id/tasks', authenticate, async (req, res, next) => {
    try {
        const tasks = await categoryService.getTasksByCategory(req.params.id);
        res.json(tasks);
    } catch (error) {
        next(error);
    }
});

module.exports = router;