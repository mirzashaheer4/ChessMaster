import { Chess } from 'chess.js';
import type { MoveAnalysis, MoveClassification } from './analysisEngine';

/**
 * Classification thresholds in centipawns
 */
const THRESHOLDS = {
  best: 15,
  good: 40,
  inaccuracy: 90,
  mistake: 250,
  blunder: Infinity
};

/**
 * Classifies a move based on evaluation loss and context
 */
export function classifyMove(analysis: MoveAnalysis, game: Chess): MoveClassification {
  const { evalLoss, evalBefore } = analysis;

  // Check for brilliant move
  if (isBrilliantMove(analysis, game)) {
    return 'brilliant';
  }

  // Check for great move
  if (isGreatMove(analysis, game)) {
    return 'great';
  }

  // Classify based on eval loss with context adjustments
  const adjustedThresholds = getAdjustedThresholds(evalBefore, game);

  if (evalLoss <= adjustedThresholds.best) {
    return 'best';
  } else if (evalLoss <= adjustedThresholds.good) {
    return 'good';
  } else if (evalLoss <= adjustedThresholds.inaccuracy) {
    return 'inaccuracy';
  } else if (evalLoss <= adjustedThresholds.mistake) {
    return 'mistake';
  } else {
    return 'blunder';
  }
}

/**
 * Check if move qualifies as Brilliant
 */
function isBrilliantMove(analysis: MoveAnalysis, game: Chess): boolean {
  const { move, bestMove, evalLoss, evalBefore, evalAfter, alternatives } = analysis;

  // Must not worsen position significantly
  if (evalLoss > 30) return false;

  // Move should not be the obvious best move initially
  if (move === bestMove) return false;

  // Check if move involves a sacrifice
  const hasSacrifice = checkForSacrifice(move, game);
  if (!hasSacrifice) return false;

  // Move should still maintain or improve position
  if (evalAfter < evalBefore - 50) return false;

  // Check if move is among top alternatives (but not #1)
  const moveInTop3 = alternatives?.some((alt, idx) => 
    idx > 0 && idx < 3 && alt.move.includes(move.substring(0, 4))
  );

  return moveInTop3 || false;
}

/**
 * Check if move qualifies as Great
 */
function isGreatMove(analysis: MoveAnalysis, game: Chess): boolean {
  const { evalLoss, bestMove, move, evalBefore } = analysis;

  // Very small eval loss
  if (evalLoss > 25) return false;

  // Check if it's the only good move
  const isOnlyGoodMove = checkIfOnlyGoodMove(game);
  if (isOnlyGoodMove) return true;

  // Check if it prevents a major threat
  const preventsThreat = checkIfPreventsThreat(game, evalBefore);
  if (preventsThreat) return true;

  // High precision move among multiple good options
  if (evalLoss <= 10 && move !== bestMove) return true;

  return false;
}

/**
 * Adjust thresholds based on position advantage
 */
function getAdjustedThresholds(evalBefore: number, game: Chess): typeof THRESHOLDS {
  const thresholds = { ...THRESHOLDS };

  // If winning significantly, be more lenient
  if (Math.abs(evalBefore) > 500) {
    thresholds.best *= 1.2;
    thresholds.good *= 1.2;
    thresholds.inaccuracy *= 1.3;
  }

  // If losing badly, be stricter
  if (evalBefore < -500) {
    thresholds.good *= 0.8;
    thresholds.inaccuracy *= 0.8;
  }

  // If only one legal move, cap at 'good'
  if (game.moves().length === 1) {
    return {
      best: 0,
      good: Infinity,
      inaccuracy: Infinity,
      mistake: Infinity,
      blunder: Infinity
    };
  }

  return thresholds;
}

/**
 * Check if move involves a material sacrifice
 */
function checkForSacrifice(_move: string, game: Chess): boolean {
  // Use the last move from game's history directly instead of expensive getSafeHistory
  const verboseHistory = game.history({ verbose: true });
  const moveObj = verboseHistory.length > 0 ? verboseHistory[verboseHistory.length - 1] : null;
  if (!moveObj) return false;

  const { captured, piece } = moveObj;
  if (!captured) return false;

  const pieceValues: Record<string, number> = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
  };

  const capturedValue = pieceValues[captured] || 0;
  const pieceValue = pieceValues[piece] || 0;

  // Sacrifice = giving up more valuable piece
  return pieceValue > capturedValue;
}

/**
 * Check if this is the only move that doesn't lose
 */
function checkIfOnlyGoodMove(game: Chess): boolean {
  const legalMoves = game.moves();
  return legalMoves.length <= 2;
}

/**
 * Check if move prevents a major threat
 */
function checkIfPreventsThreat(_game: Chess, evalBefore: number): boolean {
  // If position was in danger (negative eval) and move improves it
  return evalBefore < -200;
}

/**
 * Generate explanation for move classification
 */
export function generateExplanation(
  classification: MoveClassification,
  analysis: MoveAnalysis,
  _game: Chess
): string {
  const { evalLoss, move, bestMove } = analysis;

  switch (classification) {
    case 'brilliant':
      return `Brilliant sacrifice! ${move} finds a creative solution with long-term compensation.`;
    
    case 'great':
      return `Excellent move! ${move} demonstrates high precision in a critical position.`;
    
    case 'best':
      return `Best move. ${move} matches the engine's top choice.`;
    
    case 'good':
      if (evalLoss <= 20) {
        return `Good move with minor imprecision.`;
      }
      return `Solid move, though ${bestMove} was slightly better.`;
    
    case 'inaccuracy':
      return `Inaccuracy. ${bestMove} would have maintained a better position (-${Math.round(evalLoss)}cp).`;
    
    case 'mistake':
      return `Mistake! ${bestMove} was significantly stronger (-${Math.round(evalLoss)}cp).`;
    
    case 'blunder':
      if (evalLoss > 500) {
        return `Blunder! ${move} loses the game. ${bestMove} was necessary.`;
      }
      return `Serious blunder. ${bestMove} would have kept the position (-${Math.round(evalLoss)}cp).`;
    
    default:
      return '';
  }
}

/**
 * Calculate overall game statistics
 */
export function calculateGameStats(analyses: MoveAnalysis[]): {
  mistakes: number;
  blunders: number;
  missedWins: number;
  accuracy: number;
} {
  let mistakes = 0;
  let blunders = 0;
  let missedWins = 0;
  let totalAccuracy = 0;

  analyses.forEach((analysis) => {
    // Count mistakes and blunders
    if (analysis.classification === 'mistake') {
      mistakes++;
    } else if (analysis.classification === 'blunder') {
      blunders++;
    }

    // Check for missed wins (had winning advantage but lost it)
    if (analysis.evalBefore > 300 && analysis.evalAfter < 100) {
      missedWins++;
    }

    // Calculate move accuracy
    const moveAccuracy = Math.max(0, 100 - (analysis.evalLoss / 5));
    totalAccuracy += moveAccuracy;
  });

  const accuracy = analyses.length > 0 ? totalAccuracy / analyses.length : 100;

  return {
    mistakes,
    blunders,
    missedWins,
    accuracy: Math.round(accuracy)
  };
}
