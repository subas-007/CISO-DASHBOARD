import { v4 as uuidv4 } from 'uuid'
import { db } from '../config/db.js'

export interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  resource: string | null
  details: string | null
  ip: string | null
  user_agent: string | null
  created_at: string
}

export function writeAuditLog(params: {
  userId?: string | null
  action: string
  resource?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}) {
  db.prepare(`
    INSERT INTO audit_log (id, user_id, action, resource, details, ip, user_agent)
    VALUES (@id, @userId, @action, @resource, @details, @ip, @userAgent)
  `).run({
    id: uuidv4(),
    userId: params.userId ?? null,
    action: params.action,
    resource: params.resource ?? null,
    details: params.details ? JSON.stringify(params.details) : null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
  })
}

export function getAuditLog(limit = 100, offset = 0): AuditEntry[] {
  return db.prepare(`
    SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset) as AuditEntry[]
}

export function getUserAuditLog(userId: string, limit = 50): AuditEntry[] {
  return db.prepare(`
    SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit) as AuditEntry[]
}
