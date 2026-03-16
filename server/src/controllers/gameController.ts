import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

/**
 * POST /api/games — Save a completed game
 * userId is extracted from JWT token, never from body
 */
export const saveGame = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      pgn,
      result,
      status,
      timeControl,
      mode,
      difficulty,
      opponentName,
      playerColor,
      fen
    } = req.body;

    if (!pgn && !result) {
      res.status(400).json({ error: 'PGN or result is required' });
      return;
    }

    const game = await prisma.game.create({
      data: {
        userId,
        pgn: pgn || '',
        result: result || null,
        status: status || 'active',
        timeControl: timeControl || null,
        mode: mode || null,
        difficulty: difficulty || null,
        opponentName: opponentName || null,
        playerColor: playerColor || null,
        currentFen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }
    });

    res.status(201).json({
      message: 'Game saved successfully',
      game: {
        id: game.id,
        result: game.result,
        status: game.status,
        mode: game.mode,
        difficulty: game.difficulty,
        opponentName: game.opponentName,
        createdAt: game.createdAt,
      }
    });
  } catch (error: any) {
    console.error('Save game error:', error);
    res.status(500).json({ error: 'Failed to save game', details: error.message });
  }
};

/**
 * GET /api/games — Fetch all games for the authenticated user
 * Enforces user isolation: only returns games WHERE userId = authenticated user
 */
export const getUserGames = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const games = await prisma.game.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        pgn: true,
        result: true,
        status: true,
        mode: true,
        difficulty: true,
        opponentName: true,
        playerColor: true,
        timeControl: true,
        currentFen: true,
        createdAt: true,
      }
    });

    res.json({ games });
  } catch (error: any) {
    console.error('Fetch games error:', error);
    res.status(500).json({ error: 'Failed to fetch games', details: error.message });
  }
};
