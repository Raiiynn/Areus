import 'server-only'

import type { Prisma, PrismaClient } from '@prisma/client'

import type { AuditAction } from '@/domain/constants'
import { db } from '@/lib/db'

/**
 * Audit logging (FULL_BUILD §48).
 *
 * Accepts a transaction client so an audit row commits or rolls back with the
 * action it records. An approval that succeeded but left no audit trail, or a
 * trail for an approval that rolled back, would both be lies.
 */

type Client = PrismaClient | Prisma.TransactionClient

export interface AuditEntry {
  actorId: string | null
  action: AuditAction
  targetType?: string
  targetId?: string
  /** Contextual detail. Must never contain passwords, tokens or hashes. */
  metadata?: Record<string, unknown>
}

export async function recordAudit(
  entry: AuditEntry,
  client: Client = db,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    },
  })
}

export async function recentAuditEntries(limit = 20) {
  return db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: { select: { id: true, username: true, role: true } },
    },
  })
}
