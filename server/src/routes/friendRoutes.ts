import { Router } from 'express';
import {
  searchUsers,
  sendFriendRequest,
  respondToRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  getUserProfile,
} from '../controllers/friendController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.get('/search', authenticateToken, searchUsers);
router.post('/request', authenticateToken, sendFriendRequest);
router.post('/respond', authenticateToken, respondToRequest);
router.get('/requests', authenticateToken, getFriendRequests);
router.get('/', authenticateToken, getFriends);
router.delete('/:id', authenticateToken, removeFriend);
router.get('/profile/:userId', authenticateToken, getUserProfile);

export default router;
