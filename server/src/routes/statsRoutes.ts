import { Router } from 'express';
import { getOverviewStats, getLeaderboard } from '../controllers/statsController';

const router = Router();

// Public routes for landing page
router.get('/overview', getOverviewStats);
router.get('/leaderboard', getLeaderboard);

export default router;
