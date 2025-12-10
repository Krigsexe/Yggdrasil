/**
 * Chat Database Operations
 *
 * Prisma-based adapter for chat CRUD operations.
 * Replaces Supabase client from original Bifrost.
 */

import { prisma } from './prisma';
import type { Chat, Prisma } from '@prisma/client';

export type ChatInsert = Prisma.ChatCreateInput;
export type ChatUpdate = Prisma.ChatUpdateInput;

export const getChatById = async (chatId: string): Promise<Chat | null> => {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });
  return chat;
};

export const getChatsByWorkspaceId = async (workspaceId: string): Promise<Chat[]> => {
  const chats = await prisma.chat.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  return chats;
};

export const getChatsByUserId = async (userId: string): Promise<Chat[]> => {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return chats;
};

export const createChat = async (
  data: Omit<Prisma.ChatUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Chat> => {
  const chat = await prisma.chat.create({
    data,
  });
  return chat;
};

export const createChats = async (
  chats: Omit<Prisma.ChatUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<Chat[]> => {
  const createdChats = await prisma.$transaction(
    chats.map((chat) =>
      prisma.chat.create({
        data: chat,
      })
    )
  );
  return createdChats;
};

export const updateChat = async (
  chatId: string,
  data: Prisma.ChatUpdateInput
): Promise<Chat> => {
  const chat = await prisma.chat.update({
    where: { id: chatId },
    data,
  });
  return chat;
};

export const deleteChat = async (chatId: string): Promise<boolean> => {
  await prisma.chat.delete({
    where: { id: chatId },
  });
  return true;
};

export const deleteChatsByWorkspaceId = async (workspaceId: string): Promise<boolean> => {
  await prisma.chat.deleteMany({
    where: { workspaceId },
  });
  return true;
};
