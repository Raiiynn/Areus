import 'server-only'

import type { Prisma, PrismaClient } from '@prisma/client'

import type { NotificationType } from '@/domain/constants'
import { db } from '@/lib/db'

/**
 * In-app notifications (FULL_BUILD §40).
 *
 * Email is not implemented: no SMTP infrastructure exists in this environment,
 * and §1271 makes email conditional on that infrastructure being available.
 * Adding a transport later means calling it alongside the row insert here.
 */

type Client = PrismaClient | Prisma.TransactionClient

export interface NotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  href?: string
}

export async function notify(
  input: NotificationInput,
  client: Client = db,
): Promise<void> {
  await client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  })
}

/** Bulk variant, so one transaction can notify both players of a match. */
export async function notifyMany(
  inputs: readonly NotificationInput[],
  client: Client = db,
): Promise<void> {
  for (const input of inputs) {
    await notify(input, client)
  }
}

export async function listNotifications(userId: string, limit = 30) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function countUnread(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } })
}

/**
 * Marks notifications read.
 *
 * Scoped by userId as well as id so a crafted request cannot mark someone
 * else's notifications read — object-level authorization, not just a role check.
 */
export async function markRead(
  userId: string,
  notificationId?: string,
): Promise<void> {
  await db.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(notificationId ? { id: notificationId } : {}),
    },
    data: { readAt: new Date() },
  })
}
