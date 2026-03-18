// Socket.io event names used in online multiplayer
export const SOCKET_EVENTS = [
  'queue_joined',
  'game_matched',
  'game_reconnected',
  'move_made',
  'move_error',
  'game_over',
  'draw_offered',
  'draw_declined',
  'opponent_disconnected',
  'opponent_reconnected',
] as const;

/**
 * Remove all socket event listeners at once
 * Prevents memory leaks from duplicate listeners
 */
export function removeAllSocketListeners(socket: any): void {
  SOCKET_EVENTS.forEach(event => socket.removeAllListeners(event));
}
