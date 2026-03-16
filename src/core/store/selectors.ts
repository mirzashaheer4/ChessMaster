import { useGameStore } from './game';
import { useShallow } from 'zustand/react/shallow';

/**
 * Type-safe store selectors using Zustand's shallow comparison.
 * Prevents unnecessary re-renders by subscribing only to the needed slice.
 */

/** Core game state — for board rendering and move logic */
export const useGameState = () =>
  useGameStore(
    useShallow((s) => ({
      game: s.game,
      fen: s.fen,
      gameStatus: s.gameStatus,
      history: s.history,
      historyLan: s.historyLan,
      moveVersion: s.moveVersion,
      startFen: s.startFen,
      castlingRights: s.castlingRights,
    }))
  );

/** Review navigation state */
export const useReview = () =>
  useGameStore(
    useShallow((s) => ({
      reviewIndex: s.reviewIndex,
      history: s.history,
      currentGameAnalysis: s.currentGameAnalysis,
      setCurrentGameAnalysis: s.setCurrentGameAnalysis,
      startReview: s.startReview,
      setReviewIndex: s.setReviewIndex,
      nextMove: s.nextMove,
      prevMove: s.prevMove,
      exitReview: s.exitReview,
    }))
  );

/** Clock state */
export const useClocks = () =>
  useGameStore(
    useShallow((s) => ({
      whiteTime: s.whiteTime,
      blackTime: s.blackTime,
      clockRunning: s.clockRunning,
      timeControl: s.timeControl,
      startClock: s.startClock,
      pauseClock: s.pauseClock,
      resetClocks: s.resetClocks,
      tickClock: s.tickClock,
    }))
  );

/** Settings and configuration */
export const useSettings = () =>
  useGameStore(
    useShallow((s) => ({
      mode: s.mode,
      difficulty: s.difficulty,
      playerColor: s.playerColor,
      boardFlipped: s.boardFlipped,
      boardTheme: s.boardTheme,
      pieceTheme: s.pieceTheme,
      chessType: s.chessType,
      customBot: s.customBot,
      setMode: s.setMode,
      setDifficulty: s.setDifficulty,
      setPlayerColor: s.setPlayerColor,
      setBoardFlipped: s.setBoardFlipped,
      flipBoard: s.flipBoard,
      setBoardTheme: s.setBoardTheme,
      setPieceTheme: s.setPieceTheme,
      setChessType: s.setChessType,
      setCustomBot: s.setCustomBot,
    }))
  );

/** Evaluation and engine arrows (for eval bar + review) */
export const useEval = () =>
  useGameStore(
    useShallow((s) => ({
      evaluation: s.evaluation,
      mateIn: s.mateIn,
      engineArrows: s.engineArrows,
      setEvaluation: s.setEvaluation,
      setEngineArrows: s.setEngineArrows,
    }))
  );

/** Premove state */
export const usePremoves = () =>
  useGameStore(
    useShallow((s) => ({
      premoves: s.premoves,
      addPremove: s.addPremove,
      clearPremoves: s.clearPremoves,
      executePremove: s.executePremove,
    }))
  );

/** Game actions only (no state) — for handlers that just dispatch */
export const useGameActions = () =>
  useGameStore(
    useShallow((s) => ({
      makeMove: s.makeMove,
      onMoveMade: s.onMoveMade,
      resetGame: s.resetGame,
      setGameStatus: s.setGameStatus,
      saveGame: s.saveGame,
      loadGame: s.loadGame,
      loadCloudGame: s.loadCloudGame,
      setTimeControl: s.setTimeControl,
    }))
  );

/** Saved Games state */
export const usePastGames = () =>
  useGameStore(
    useShallow((s) => ({
      pastGames: s.pastGames,
    }))
  );
