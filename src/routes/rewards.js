const express = require('express');
const router = express.Router();
const RewardService = require('../services/RewardService');
const { authenticate, authorize } = require('../middleware/auth');

const rewardService = new RewardService();

// Get all rewards
router.get('/', authenticate, async (req, res, next) => {
    try {
        const rewards = await rewardService.getRewards(req.query);
        res.json(rewards);
    } catch (error) {
        next(error);
    }
});

// Get reward by ID
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const reward = await rewardService.getRewardById(req.params.id);
        if (!reward) {
            return res.status(404).json({ error: 'Reward not found' });
        }
        res.json(reward);
    } catch (error) {
        next(error);
    }
});

// Create new reward (admin/manager only)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const newReward = await rewardService.createReward(req.body);
        res.status(201).json(newReward);
    } catch (error) {
        next(error);
    }
});

// Update reward (admin/manager only)
router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
        const updatedReward = await rewardService.updateReward(req.params.id, req.body);
        if (!updatedReward) {
            return res.status(404).json({ error: 'Reward not found' });
        }
        res.json(updatedReward);
    } catch (error) {
        next(error);
    }
});

// Delete reward (admin only)
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res, next) => {
    try {
        const success = await rewardService.deleteReward(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Reward not found' });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// Redeem reward
router.post('/:id/redeem', authenticate, async (req, res, next) => {
    try {
        const result = await rewardService.redeemReward(req.user.id, req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message === 'Insufficient points') {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
});

// Get user transactions
router.get('/transactions/user', authenticate, async (req, res, next) => {
    try {
        const transactions = await rewardService.getUserTransactions(req.user.id, req.query);
        res.json(transactions);
    } catch (error) {
        next(error);
    }
});

// Get user stats
router.get('/stats/user', authenticate, async (req, res, next) => {
    try {
        const stats = await rewardService.getUserStats(req.user.id);
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

module.exports = router;