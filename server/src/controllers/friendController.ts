import { Response } from 'express';
import { prisma } from '../prisma';
import type { AuthRequest } from '../middleware/auth';

// In-memory online users map — shared with onlineGameHandler
// Exported so the socket handler can update it
export const onlineUsers: Map<string, string> = new Map(); // userId -> socketId

// ─── Search Users ─────────────────────────────────────────────────
export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const query = (req.query.q as string || '').trim();
    if (query.length < 2) {
      res.json({ users: [] });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        username: { contains: query, mode: 'insensitive' },
        id: { not: userId }, // exclude self
      },
      take: 20,
      select: { id: true, username: true, eloRating: true, createdAt: true },
    });

    // Enrich with online status and friendship info
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
      },
      select: { userAId: true, userBId: true },
    });

    const friendIds = new Set(
      friendships.map((f: any) => f.userAId === userId ? f.userBId : f.userAId)
    );

    // Check pending requests
    const pendingRequests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'pending',
        receiverId: { in: users.map(u => u.id) },
      },
      select: { receiverId: true },
    });
    const pendingIds = new Set(pendingRequests.map((r: any) => r.receiverId));

    const enrichedUsers = users.map(u => ({
      ...u,
      isOnline: onlineUsers.has(u.id),
      isFriend: friendIds.has(u.id),
      requestPending: pendingIds.has(u.id),
    }));

    res.json({ users: enrichedUsers });
  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

// ─── Send Friend Request ──────────────────────────────────────────
export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { receiverId } = req.body;
    if (!receiverId) { res.status(400).json({ error: 'receiverId is required' }); return; }
    if (receiverId === userId) { res.status(400).json({ error: 'Cannot friend yourself' }); return; }

    // Check if already friends
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: receiverId },
          { userAId: receiverId, userBId: userId },
        ],
      },
    });
    if (existingFriendship) {
      res.status(400).json({ error: 'Already friends' });
      return;
    }

    // Check for existing request in either direction
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId, status: 'pending' },
          { senderId: receiverId, receiverId: userId, status: 'pending' },
        ],
      },
    });
    if (existingRequest) {
      res.status(400).json({ error: 'Friend request already pending' });
      return;
    }

    const request = await prisma.friendRequest.create({
      data: { senderId: userId, receiverId },
      include: {
        sender: { select: { id: true, username: true, eloRating: true } },
      },
    });

    res.status(201).json({ request });
  } catch (error: any) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};

// ─── Respond to Friend Request ────────────────────────────────────
export const respondToRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { requestId, accept } = req.body;
    if (!requestId) { res.status(400).json({ error: 'requestId is required' }); return; }

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== userId) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(400).json({ error: 'Request already processed' });
      return;
    }

    if (accept) {
      // Accept: update request status and create friendship
      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id: requestId },
          data: { status: 'accepted' },
        }),
        prisma.friendship.create({
          data: {
            userAId: request.senderId,
            userBId: request.receiverId,
          },
        }),
      ]);
    } else {
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'declined' },
      });
    }

    res.json({ success: true, accepted: !!accept });
  } catch (error: any) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
};

// ─── Get Pending Friend Requests ──────────────────────────────────
export const getFriendRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'pending' },
      include: {
        sender: { select: { id: true, username: true, eloRating: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error: any) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
};

// ─── Get Friends ──────────────────────────────────────────────────
export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: { id: true, username: true, eloRating: true } },
        userB: { select: { id: true, username: true, eloRating: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const friends = friendships.map((f: any) => {
      const friend = f.userAId === userId ? f.userB : f.userA;
      return {
        friendshipId: f.id,
        ...friend,
        isOnline: onlineUsers.has(friend.id),
      };
    });

    res.json({ friends });
  } catch (error: any) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
};

// ─── Remove Friend ───────────────────────────────────────────────
export const removeFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const friendshipId = req.params.id as string;
    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });

    if (!friendship || (friendship.userAId !== userId && friendship.userBId !== userId)) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};

// ─── Get User Public Profile ──────────────────────────────────────
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        eloRating: true,
        createdAt: true,
        _count: {
          select: {
            savedGames: true,
            gamesAsWhite: true,
            gamesAsBlack: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Fetch games for this user to compute stats
    const games = await prisma.game.findMany({
      where: { userId: targetUserId },
      select: { result: true, createdAt: true, mode: true },
      orderBy: { createdAt: 'asc' },
    });

    let wins = 0, losses = 0, draws = 0;
    games.forEach(game => {
      const res = game.result?.toLowerCase() || '';
      if (res === 'win' || res === '1-0') wins++;
      else if (res === 'loss' || res === '0-1') losses++;
      else if (res === 'draw' || res === '1/2-1/2') draws++;
    });

    const total = games.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    res.json({
      ...user,
      stats: { wins, losses, draws, total, winRate },
      isOnline: onlineUsers.has(targetUserId),
    });
  } catch (error: any) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};
