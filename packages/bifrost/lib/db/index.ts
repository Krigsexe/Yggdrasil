/**
 * BIFROST Database Layer
 *
 * Prisma-based database operations for YGGDRASIL frontend.
 * Replaces Supabase from original Bifrost.
 */

export { prisma } from './prisma';

// Chat operations
export {
  getChatById,
  getChatsByWorkspaceId,
  getChatsByUserId,
  createChat,
  createChats,
  updateChat,
  deleteChat,
  deleteChatsByWorkspaceId,
} from './chats';

// Message operations
export {
  getMessageById,
  getMessagesByChatId,
  getMessagesByUserId,
  createMessage,
  createMessages,
  updateMessage,
  deleteMessage,
  deleteMessagesByChatId,
  getNextSequenceNumber,
  createYggdrasilMessage,
} from './messages';

// Re-export types
export type { Chat, Message, Prisma } from '@prisma/client';
