import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getOverviewStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [playersCount, gamesCount] = await Promise.all([
      prisma.user.count(),
      prisma.game.count()
    ]);

    res.json({
      players: playersCount,
      games: gamesCount,
      accuracy: 88 // Defaulted/mock static metric for visual completeness
    });
  } catch (error: any) {
    console.error('Fetch overview stats error:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const topPlayers = await prisma.user.findMany({
      orderBy: { eloRating: 'desc' },
      take: 10,
      select: {
        id: true,
        username: true,
        eloRating: true,
        _count: {
          select: {
            savedGames: true,
            gamesAsWhite: true,
            gamesAsBlack: true
          }
        }
      }
    });

    const formattedLeaders = topPlayers.map((player, index) => ({
      rank: index + 1,
      name: player.username,
      rating: player.eloRating,
      country: 'Global',
      wins: player._count.savedGames + player._count.gamesAsWhite + player._count.gamesAsBlack
    }));

    res.json({ leaders: formattedLeaders });
  } catch (error: any) {
    console.error('Fetch leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
