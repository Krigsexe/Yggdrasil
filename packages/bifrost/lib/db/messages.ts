/**
 * Message Database Operations
 *
 * Prisma-based adapter for message CRUD operations.
 * Includes YGGDRASIL-specific metadata fields.
 */

import { prisma } from './prisma';
import type { Message, Prisma, EpistemicBranch } from '@prisma/client';

export type MessageInsert = Prisma.MessageUncheckedCreateInput;
export type MessageUpdate = Prisma.MessageUpdateInput;

export interface MessageWithYggdrasil extends Message {
  yggdrasilBranch: EpistemicBranch | null;
  yggdrasilConfidence: number | null;
  yggdrasilSources: unknown | null;
  yggdrasilTrace: unknown | null;
  yggdrasilRequestId: string | null;
}

export const getMessageById = async (messageId: string): Promise<Message | null> => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });
  return message;
};

export const getMessagesByChatId = async (chatId: string): Promise<Message[]> => {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { sequenceNumber: 'asc' },
  });
  return messages;
};

export const getMessagesByUserId = async (userId: string): Promise<Message[]> => {
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return messages;
};

export const createMessage = async (
  data: Omit<MessageInsert, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Message> => {
  const message = await prisma.message.create({
    data,
  });
  return message;
};

export const createMessages = async (
  messages: Omit<MessageInsert, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<Message[]> => {
  const createdMessages = await prisma.$transaction(
    messages.map((msg) =>
      prisma.message.create({
        data: msg,
      })
    )
  );
  return createdMessages;
};

export const updateMessage = async (
  messageId: string,
  data: MessageUpdate
): Promise<Message> => {
  const message = await prisma.message.update({
    where: { id: messageId },
    data,
  });
  return message;
};

export const deleteMessage = async (messageId: string): Promise<boolean> => {
  await prisma.message.delete({
    where: { id: messageId },
  });
  return true;
};

export const deleteMessagesByChatId = async (chatId: string): Promise<boolean> => {
  await prisma.message.deleteMany({
    where: { chatId },
  });
  return true;
};

/**
 * Get the next sequence number for a chat
 */
export const getNextSequenceNumber = async (chatId: string): Promise<number> => {
  const lastMessage = await prisma.message.findFirst({
    where: { chatId },
    orderBy: { sequenceNumber: 'desc' },
    select: { sequenceNumber: true },
  });
  return (lastMessage?.sequenceNumber ?? 0) + 1;
};

/**
 * Create a message with YGGDRASIL metadata
 */
export const createYggdrasilMessage = async (data: {
  chatId: string;
  userId: string;
  role: string;
  content: string;
  model?: string;
  yggdrasilBranch?: EpistemicBranch;
  yggdrasilConfidence?: number;
  yggdrasilSources?: unknown;
  yggdrasilTrace?: unknown;
  yggdrasilRequestId?: string;
}): Promise<Message> => {
  const sequenceNumber = await getNextSequenceNumber(data.chatId);

  const message = await prisma.message.create({
    data: {
      chatId: data.chatId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      model: data.model,
      sequenceNumber,
      yggdrasilBranch: data.yggdrasilBranch,
      yggdrasilConfidence: data.yggdrasilConfidence,
      yggdrasilSources: data.yggdrasilSources as Prisma.InputJsonValue,
      yggdrasilTrace: data.yggdrasilTrace as Prisma.InputJsonValue,
      yggdrasilRequestId: data.yggdrasilRequestId,
    },
  });
  return message;
};
