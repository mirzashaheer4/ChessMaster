import { Router } from 'express';
import { saveGame, getUserGames } from '../controllers/gameController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All game routes require authentication
router.post('/', authenticateToken, saveGame);
router.get('/', authenticateToken, getUserGames);

export default router;
