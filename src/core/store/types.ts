import { Chess } from 'chess.js';
import type { MoveAnalysis } from '../utils/analysisEngine';
import type { BoardTheme, PieceTheme } from '../utils/themes';
import type { Chess960Setup } from '../utils/chess960';

export type GameMode = 'local' | 'ai' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme' | 'custom';
export type TimeControlCategory = 'rapid' | 'blitz' | 'bullet';
export type ChessType = 'standard' | 'chess960';

export interface TimeControl {
  category: TimeControlCategory;
  initial: number; 
  increment: number;
  label: string;
}

export interface PastGame {
  id: string;
  date: string;
  mode: GameMode;
  difficulty?: Difficulty;
  result: 'win' | 'loss' | 'draw';
  pgn: string;
  fen: string; 
  analysis?: MoveAnalysis[];
  stats?: {
    mistakes: number;
    blunders: number;
    missedWins: number;
    accuracy: number;
  };
}

export interface SettingsSlice {
  // Configuration
  chessType: ChessType;
  mode: GameMode | null;
  difficulty: Difficulty | null;
  playerColor: 'white' | 'black' | null;
  boardFlipped: boolean;
  
  // Themes & Bot
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  customBot: { 
    name: string; 
    avatar: string; 
    elo: number;
    playStyle: 'aggressive' | 'defensive' | 'balanced';
  } | null;

  // Actions
  setMode: (mode: GameMode) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setPlayerColor: (color: 'white' | 'black' | null) => void;
  setChessType: (type: ChessType) => void;
  setBoardFlipped: (flipped: boolean) => void;
  flipBoard: () => void;
  setBoardTheme: (t: BoardTheme) => void;
  setPieceTheme: (t: PieceTheme) => void;
  setCustomBot: (bot: { name: string; avatar: string; elo: number; playStyle: 'aggressive' | 'defensive' | 'balanced' } | null) => void;
}

export interface GameSlice {
  // Facade State
  game: Chess;
  fen: string;
  history: string[]; 
  historyLan: string[];
  
  // 960 Specific
  startFen?: string;
  castlingRights?: Chess960Setup['rights'];
  
  // UX State
  moveVersion: number;
  evaluation: number;
  mateIn: number | null;
  gameStatus: 'active' | 'checkmate' | 'draw' | 'timeout' | 'resign';
  reviewIndex: number;
  currentGameAnalysis: MoveAnalysis[] | null;
  engineArrows: { from: string; to: string; color: string }[]; // Engine best move arrows for review
  
  // Premove
  premoves: { from: string; to: string; promotion?: string }[];
  
  // Clocks
  timeControl: TimeControl | null;
  whiteTime: number;
  blackTime: number;
  clockRunning: boolean;
  
  // Legacy History
  pastGames: PastGame[];
  
  // Core Game Actions
  makeMove: (move: { from: string; to: string; promotion?: string }, isNetworkMove?: boolean) => any;
  resetGame: () => void;
  setEvaluation: (v: number, mateIn?: number | null) => void;
  onMoveMade: () => void;
  
  // Review
  startReview: () => void;
  setReviewIndex: (i: number) => void;
  nextMove: () => void;
  prevMove: () => void;
  exitReview: () => void;
  setEngineArrows: (arrows: { from: string; to: string; color: string }[]) => void;
  setCurrentGameAnalysis: (analysis: MoveAnalysis[] | null) => void;
  
  // Premove
  addPremove: (move: { from: string; to: string; promotion?: string }) => void;
  clearPremoves: () => void;
  executePremove: () => void;
  
  // Clock
  setTimeControl: (tc: TimeControl | null) => void;
  tickClock: (delta: number) => void;
  startClock: () => void;
  pauseClock: () => void;
  resetClocks: () => void;
  setGameStatus: (s: 'active' | 'checkmate' | 'draw' | 'timeout' | 'resign') => void;
  
  saveGame: (result: 'win' | 'loss' | 'draw', analysis?: MoveAnalysis[], stats?: PastGame['stats'], pgnOverride?: string) => void;
  loadGame: (id: string) => void;
  loadCloudGame: (pgn: string, mode?: string) => void;
  saveReviewState: () => void;
  restoreReviewState: () => boolean;
}

export type OnlineStatus = 'idle' | 'connecting' | 'queuing' | 'matched' | 'playing' | 'reconnecting' | 'ended';

export interface OnlineSlice {
  // State
  onlineStatus: OnlineStatus;
  roomId: string | null;
  onlineColor: 'white' | 'black' | null;
  opponentName: string | null;
  opponentElo: number | null;
  drawOfferedBy: 'white' | 'black' | null;
  opponentDisconnected: boolean;
  connectionError: string | null;

  // Actions
  joinQueue: (timeCategory: string, timeInitial: number, timeIncrement: number) => void;
  leaveQueue: () => void;
  makeOnlineMove: (move: { from: string; to: string; promotion?: string }) => void;
  resignOnline: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  resetOnline: () => void;
  initSocketListeners: () => void;
  cleanupSocketListeners: () => void;
}

export type GameStore = SettingsSlice & GameSlice & OnlineSlice;
