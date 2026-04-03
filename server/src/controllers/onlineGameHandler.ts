import { Server, Socket } from 'socket.io';
import { Chess } from 'chess.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET_SAFE } from '../config';
import { onlineUsers } from './friendController';
import { prisma } from '../prisma';

// ─── Types ───────────────────────────────────────────────────────────
interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  elo: number;
  timeCategory: string; // 'bullet' | 'blitz' | 'rapid'
  timeInitial: number;
  timeIncrement: number;
}

interface GameRoom {
  id: string;
  chess: Chess;
  white: { socketId: string; userId: string; username: string; elo: number };
  black: { socketId: string; userId: string; username: string; elo: number };
  whiteTime: number;   // ms remaining
  blackTime: number;   // ms remaining
  timeIncrement: number; // ms
  lastMoveTime: number;  // Date.now() of last move
  clockInterval: NodeJS.Timeout | null;
  status: 'playing' | 'ended';
  drawOfferedBy: 'white' | 'black' | null;
  disconnectedPlayer: 'white' | 'black' | null;
  disconnectTimer: NodeJS.Timeout | null;
  moves: string[]; // SAN history
}

// ─── State ───────────────────────────────────────────────────────────
const matchmakingQueue: Map<string, QueueEntry> = new Map(); // socketId -> entry
const gameRooms: Map<string, GameRoom> = new Map();           // roomId -> room
const playerRooms: Map<string, string> = new Map();           // socketId -> roomId
const pendingInvites: Map<string, { from: QueueEntry; to: string; timeout: NodeJS.Timeout }> = new Map(); // inviteId -> invite

// ─── Helpers ─────────────────────────────────────────────────────────
function generateRoomId(): string {
  return 'room_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getPlayerColor(room: GameRoom, socketId: string): 'white' | 'black' | null {
  if (room.white.socketId === socketId) return 'white';
  if (room.black.socketId === socketId) return 'black';
  return null;
}

function getOpponentSocketId(room: GameRoom, socketId: string): string | null {
  if (room.white.socketId === socketId) return room.black.socketId;
  if (room.black.socketId === socketId) return room.white.socketId;
  return null;
}

function startClock(io: Server, room: GameRoom) {
  if (room.clockInterval) clearInterval(room.clockInterval);
  room.lastMoveTime = Date.now();

  room.clockInterval = setInterval(() => {
    if (room.status !== 'playing') {
      if (room.clockInterval) clearInterval(room.clockInterval);
      return;
    }

    const now = Date.now();
    const elapsed = now - room.lastMoveTime;
    const turn = room.chess.turn(); // 'w' or 'b'

    if (turn === 'w') {
      room.whiteTime = Math.max(0, room.whiteTime - elapsed);
    } else {
      room.blackTime = Math.max(0, room.blackTime - elapsed);
    }
    room.lastMoveTime = now;

    // Check timeout
    if (room.whiteTime <= 0) {
      endGame(io, room, 'black', 'timeout');
    } else if (room.blackTime <= 0) {
      endGame(io, room, 'white', 'timeout');
    }
  }, 100); // Tick every 100ms
}

function stopClock(room: GameRoom) {
  if (room.clockInterval) {
    clearInterval(room.clockInterval);
    room.clockInterval = null;
  }
}

function endGame(io: Server, room: GameRoom, winner: 'white' | 'black' | 'draw', reason: string) {
  if (room.status === 'ended') return;
  room.status = 'ended';
  stopClock(room);

  // Clear disconnect timer if any
  if (room.disconnectTimer) {
    clearTimeout(room.disconnectTimer);
    room.disconnectTimer = null;
  }

  const result = winner === 'draw' ? '1/2-1/2' : winner === 'white' ? '1-0' : '0-1';

  io.to(room.id).emit('game_over', {
    winner,
    reason,
    result,
    whiteTime: Math.round(room.whiteTime),
    blackTime: Math.round(room.blackTime),
    pgn: room.chess.pgn(),
  });

  // Cleanup after a delay
  setTimeout(() => {
    gameRooms.delete(room.id);
    // Clean up player room mappings
    for (const [sid, rid] of playerRooms.entries()) {
      if (rid === room.id) playerRooms.delete(sid);
    }
  }, 60000); // Keep room data for 60 seconds for any reconnecting clients
}

function tryMatch(io: Server) {
  // Group queue entries by time category
  const byCategory: Map<string, QueueEntry[]> = new Map();

  for (const entry of matchmakingQueue.values()) {
    const key = `${entry.timeCategory}_${entry.timeInitial}_${entry.timeIncrement}`;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(entry);
  }

  // Match pairs
  for (const [, entries] of byCategory) {
    while (entries.length >= 2) {
      const p1 = entries.shift()!;
      const p2 = entries.shift()!;
      
      // Don't match against yourself
      if (p1.userId === p2.userId) {
        entries.unshift(p1); // put p1 back
        break;
      }

      matchmakingQueue.delete(p1.socketId);
      matchmakingQueue.delete(p2.socketId);

      createGameRoom(io, p1, p2);
    }
  }
}

function createGameRoom(io: Server, p1: QueueEntry, p2: QueueEntry) {
  // Randomly assign colors
  const whiteIsP1 = Math.random() < 0.5;
  const whitePlayer = whiteIsP1 ? p1 : p2;
  const blackPlayer = whiteIsP1 ? p2 : p1;

  const roomId = generateRoomId();
  const timeMs = whitePlayer.timeInitial * 1000;
  const incrementMs = whitePlayer.timeIncrement * 1000;

  const room: GameRoom = {
    id: roomId,
    chess: new Chess(),
    white: { socketId: whitePlayer.socketId, userId: whitePlayer.userId, username: whitePlayer.username, elo: whitePlayer.elo },
    black: { socketId: blackPlayer.socketId, userId: blackPlayer.userId, username: blackPlayer.username, elo: blackPlayer.elo },
    whiteTime: timeMs,
    blackTime: timeMs,
    timeIncrement: incrementMs,
    lastMoveTime: Date.now(),
    clockInterval: null,
    status: 'playing',
    drawOfferedBy: null,
    disconnectedPlayer: null,
    disconnectTimer: null,
    moves: [],
  };

  gameRooms.set(roomId, room);
  playerRooms.set(whitePlayer.socketId, roomId);
  playerRooms.set(blackPlayer.socketId, roomId);

  // Join socket room
  const whiteSocket = io.sockets.sockets.get(whitePlayer.socketId);
  const blackSocket = io.sockets.sockets.get(blackPlayer.socketId);
  whiteSocket?.join(roomId);
  blackSocket?.join(roomId);

  // Notify players
  whiteSocket?.emit('game_matched', {
    roomId,
    color: 'white',
    opponent: { username: blackPlayer.username, elo: blackPlayer.elo },
    timeInitial: whitePlayer.timeInitial,
    timeIncrement: whitePlayer.timeIncrement,
  });

  blackSocket?.emit('game_matched', {
    roomId,
    color: 'black',
    opponent: { username: whitePlayer.username, elo: whitePlayer.elo },
    timeInitial: whitePlayer.timeInitial,
    timeIncrement: whitePlayer.timeIncrement,
  });

  // Start the clock
  startClock(io, room);
}

// ─── Socket Handler ──────────────────────────────────────────────────
export function registerOnlineGameHandler(io: Server) {

  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET_SAFE) as { userId: string; username: string };
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as { userId: string; username: string };

    // ── Online Presence ──
    onlineUsers.set(user.userId, socket.id);
    socket.broadcast.emit('user_online', { userId: user.userId, username: user.username });

    for (const [roomId, room] of gameRooms) {
      if (room.status !== 'playing') continue;

      let reconnectColor: 'white' | 'black' | null = null;
      if (room.white.userId === user.userId) reconnectColor = 'white';
      else if (room.black.userId === user.userId) reconnectColor = 'black';

      if (reconnectColor) {
        // Reconnect!
        const oldSocketId = reconnectColor === 'white' ? room.white.socketId : room.black.socketId;
        playerRooms.delete(oldSocketId);

        if (reconnectColor === 'white') room.white.socketId = socket.id;
        else room.black.socketId = socket.id;

        playerRooms.set(socket.id, roomId);
        socket.join(roomId);

        // Cancel disconnect timer
        if (room.disconnectedPlayer === reconnectColor && room.disconnectTimer) {
          clearTimeout(room.disconnectTimer);
          room.disconnectTimer = null;
          room.disconnectedPlayer = null;
        }

        // Send full game state to reconnecting player
        socket.emit('game_reconnected', {
          roomId,
          color: reconnectColor,
          fen: room.chess.fen(),
          pgn: room.chess.pgn(),
          moves: room.moves,
          whiteTime: Math.round(room.whiteTime),
          blackTime: Math.round(room.blackTime),
          opponent: reconnectColor === 'white'
            ? { username: room.black.username, elo: room.black.elo }
            : { username: room.white.username, elo: room.white.elo },
          timeIncrement: room.timeIncrement / 1000,
          drawOfferedBy: room.drawOfferedBy,
        });

        // Notify opponent
        const opId = getOpponentSocketId(room, socket.id);
        if (opId) io.to(opId).emit('opponent_reconnected');

        break;
      }
    }

    // ── Join matchmaking queue ──
    socket.on('join_queue', (data: { timeCategory: string; timeInitial: number; timeIncrement: number; elo?: number }) => {
      // Validate time control values
      if (!data.timeInitial || !data.timeCategory) {
        socket.emit('queue_error', { message: 'Invalid time control' });
        return;
      }

      const timeInitial = parseInt(data.timeInitial as any);
      const timeIncrement = parseInt(data.timeIncrement as any) || 0;

      // Security: Validate time ranges
      if (timeInitial < 1 || timeInitial > 3600 || timeIncrement < 0 || timeIncrement > 180) {
        socket.emit('queue_error', { message: 'Time control out of valid range' });
        return;
      }

      if (!['bullet', 'blitz', 'rapid'].includes(data.timeCategory)) {
        socket.emit('queue_error', { message: 'Invalid time category' });
        return;
      }

      // Remove from any existing queue
      matchmakingQueue.delete(socket.id);

      const entry: QueueEntry = {
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
        elo: data.elo || 1200,
        timeCategory: data.timeCategory,
        timeInitial,
        timeIncrement,
      };

      matchmakingQueue.set(socket.id, entry);
      socket.emit('queue_joined', { position: matchmakingQueue.size });

      // Try to match immediately
      tryMatch(io);
    });

    // ── Leave queue ──
    socket.on('leave_queue', () => {
      matchmakingQueue.delete(socket.id);
      socket.emit('queue_left');
    });

    // ── Make a move ──
    socket.on('make_move', (data: { roomId: string; from: string; to: string; promotion?: string }) => {
      const room = gameRooms.get(data.roomId);
      if (!room || room.status !== 'playing') {
        socket.emit('move_error', { message: 'Game not found or already ended' });
        return;
      }

      const color = getPlayerColor(room, socket.id);
      if (!color) {
        socket.emit('move_error', { message: 'You are not in this game' });
        return;
      }

      // Check it's this player's turn
      const expectedTurn = room.chess.turn() === 'w' ? 'white' : 'black';
      if (color !== expectedTurn) {
        socket.emit('move_error', { message: 'Not your turn' });
        return;
      }

      // Validate input format
      if (!data.from || !data.to || typeof data.from !== 'string' || typeof data.to !== 'string') {
        socket.emit('move_error', { message: 'Invalid move format' });
        return;
      }

      // Validate square format (must be 2 chars like 'e2', 'e4')
      if (!/^[a-h][1-8]$/.test(data.from) || !/^[a-h][1-8]$/.test(data.to)) {
        socket.emit('move_error', { message: 'Invalid square notation' });
        return;
      }

      // Validate promotion if provided
      if (data.promotion && !['q', 'r', 'b', 'n'].includes(data.promotion)) {
        socket.emit('move_error', { message: 'Invalid promotion piece' });
        return;
      }

      // Validate and make the move
      try {
        const move = room.chess.move({
          from: data.from,
          to: data.to,
          promotion: data.promotion || undefined,
        });

        if (!move) {
          socket.emit('move_error', { message: 'Illegal move' });
          return;
        }

        // Check time - ensure player had time to move
        const now = Date.now();
        const elapsed = now - room.lastMoveTime;
        const playerTimeRemaining = color === 'white' ? room.whiteTime : room.blackTime;

        if (playerTimeRemaining - elapsed <= 0) {
          socket.emit('move_error', { message: 'Time expired' });
          // Revert move
          room.chess.undo();
          return;
        }

        // Update clock: grant increment to the player who just moved
        if (color === 'white') {
          room.whiteTime = Math.max(0, room.whiteTime - elapsed + room.timeIncrement);
        } else {
          room.blackTime = Math.max(0, room.blackTime - elapsed + room.timeIncrement);
        }
        room.lastMoveTime = now;

        room.moves.push(move.san);

        // Clear any pending draw offer
        room.drawOfferedBy = null;

        // Broadcast move to both players
        io.to(room.id).emit('move_made', {
          from: move.from,
          to: move.to,
          san: move.san,
          promotion: move.promotion,
          fen: room.chess.fen(),
          whiteTime: Math.round(room.whiteTime),
          blackTime: Math.round(room.blackTime),
          moveNumber: room.moves.length,
        });

        // Check for game end
        if (room.chess.isCheckmate()) {
          endGame(io, room, color, 'checkmate');
        } else if (room.chess.isDraw()) {
          let drawReason = 'draw';
          if (room.chess.isStalemate()) drawReason = 'stalemate';
          else if (room.chess.isThreefoldRepetition()) drawReason = 'repetition';
          else if (room.chess.isInsufficientMaterial()) drawReason = 'insufficient_material';
          endGame(io, room, 'draw', drawReason);
        }

      } catch (err: any) {
        socket.emit('move_error', { message: 'Invalid move' });
      }
    });

    // ── Resign ──
    socket.on('resign', (data: { roomId: string }) => {
      const room = gameRooms.get(data.roomId);
      if (!room || room.status !== 'playing') return;

      const color = getPlayerColor(room, socket.id);
      if (!color) return;

      const winner = color === 'white' ? 'black' : 'white';
      endGame(io, room, winner, 'resign');
    });

    // ── Draw offer ──
    socket.on('offer_draw', (data: { roomId: string }) => {
      const room = gameRooms.get(data.roomId);
      if (!room || room.status !== 'playing') return;

      const color = getPlayerColor(room, socket.id);
      if (!color) return;

      // Can't offer draw if one is already pending
      if (room.drawOfferedBy) {
        socket.emit('draw_error', { message: 'Draw already offered' });
        return;
      }

      room.drawOfferedBy = color;
      const opId = getOpponentSocketId(room, socket.id);
      if (opId) {
        io.to(opId).emit('draw_offered', { by: color });
      }
    });

    // ── Accept draw ──
    socket.on('accept_draw', (data: { roomId: string }) => {
      const room = gameRooms.get(data.roomId);
      if (!room || room.status !== 'playing') return;

      const color = getPlayerColor(room, socket.id);
      if (!color) return;

      // Can only accept if the OTHER player offered
      if (room.drawOfferedBy === color || !room.drawOfferedBy) {
        socket.emit('draw_error', { message: 'No draw offer to accept' });
        return;
      }

      endGame(io, room, 'draw', 'agreement');
    });

    // ── Decline draw ──
    socket.on('decline_draw', (data: { roomId: string }) => {
      const room = gameRooms.get(data.roomId);
      if (!room || room.status !== 'playing') return;

      const color = getPlayerColor(room, socket.id);
      if (!color) return;

      room.drawOfferedBy = null;
      const opId = getOpponentSocketId(room, socket.id);
      if (opId) {
        io.to(opId).emit('draw_declined');
      }
    });

    // ── Get Online Users ──
    socket.on('get_online_users', () => {
      const onlineList = Array.from(onlineUsers.keys());
      socket.emit('online_users_list', { users: onlineList });
    });

    // ── Forward Friend Request Notification ──
    socket.on('notify_friend_request', (data: { receiverId: string; request: any }) => {
      const receiverSocketId = onlineUsers.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('friend_request_received', data.request);
      }
    });

    // ── Forward Friend Request Accepted ──
    socket.on('notify_friend_accepted', (data: { senderId: string }) => {
      const senderSocketId = onlineUsers.get(data.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('friend_request_accepted', { 
          userId: user.userId, 
          username: user.username 
        });
      }
    });

    // ── Invite Friend to Game ──
    socket.on('invite_friend', async (data: { friendId: string; timeCategory: string; timeInitial: number; timeIncrement: number; elo?: number }) => {
      // Check if friend is online
      const friendSocketId = onlineUsers.get(data.friendId);
      if (!friendSocketId) {
        socket.emit('invite_error', { message: 'Friend is not online' });
        return;
      }

      // Verify friendship exists
      const friendship = await (prisma as any).friendship.findFirst({
        where: {
          OR: [
            { userAId: user.userId, userBId: data.friendId },
            { userAId: data.friendId, userBId: user.userId },
          ],
        },
      });

      if (!friendship) {
        socket.emit('invite_error', { message: 'You are not friends with this user' });
        return;
      }

      const inviteId = 'inv_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      
      // Auto-decline after 30 seconds
      const timeout = setTimeout(() => {
        pendingInvites.delete(inviteId);
        socket.emit('invite_expired', { inviteId });
      }, 30000);

      const entry: QueueEntry = {
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
        elo: data.elo || 1200,
        timeCategory: data.timeCategory,
        timeInitial: data.timeInitial,
        timeIncrement: data.timeIncrement,
      };

      pendingInvites.set(inviteId, { from: entry, to: data.friendId, timeout });

      // Send invite to friend
      io.to(friendSocketId).emit('game_invite', {
        inviteId,
        from: { userId: user.userId, username: user.username, elo: data.elo || 1200 },
        timeCategory: data.timeCategory,
        timeInitial: data.timeInitial,
        timeIncrement: data.timeIncrement,
      });

      socket.emit('invite_sent', { inviteId });
    });

    // ── Accept Game Invite ──
    socket.on('accept_invite', (data: { inviteId: string; elo?: number }) => {
      const invite = pendingInvites.get(data.inviteId);
      if (!invite) {
        socket.emit('invite_error', { message: 'Invite not found or expired' });
        return;
      }

      clearTimeout(invite.timeout);
      pendingInvites.delete(data.inviteId);

      // Create game room directly
      const accepter: QueueEntry = {
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
        elo: data.elo || 1200,
        timeCategory: invite.from.timeCategory,
        timeInitial: invite.from.timeInitial,
        timeIncrement: invite.from.timeIncrement,
      };

      createGameRoom(io, invite.from, accepter);
    });

    // ── Decline Game Invite ──
    socket.on('decline_invite', (data: { inviteId: string }) => {
      const invite = pendingInvites.get(data.inviteId);
      if (!invite) return;

      clearTimeout(invite.timeout);
      pendingInvites.delete(data.inviteId);

      // Notify sender
      const senderSocket = io.sockets.sockets.get(invite.from.socketId);
      senderSocket?.emit('invite_declined', { 
        inviteId: data.inviteId, 
        by: user.username 
      });
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      // Remove from queue
      matchmakingQueue.delete(socket.id);

      // Online presence: remove user
      if (onlineUsers.get(user.userId) === socket.id) {
        onlineUsers.delete(user.userId);
        socket.broadcast.emit('user_offline', { userId: user.userId });
      }

      // Handle in-game disconnect
      const roomId = playerRooms.get(socket.id);
      if (roomId) {
        const room = gameRooms.get(roomId);
        if (room && room.status === 'playing') {
          const color = getPlayerColor(room, socket.id);
          if (color) {
            room.disconnectedPlayer = color;

            // Notify opponent
            const opId = getOpponentSocketId(room, socket.id);
            if (opId) {
              io.to(opId).emit('opponent_disconnected', { gracePeriod: 30 });
            }

            // 30-second grace period
            room.disconnectTimer = setTimeout(() => {
              if (room.status === 'playing' && room.disconnectedPlayer === color) {
                const winner = color === 'white' ? 'black' : 'white';
                endGame(io, room, winner, 'abandonment');
              }
            }, 30000);
          }
        }
      }
    });
  });
}
