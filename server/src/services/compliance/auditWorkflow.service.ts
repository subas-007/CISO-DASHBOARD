import { db } from '../../config/db.js'
import { v4 as uuidv4 } from 'uuid'
import { writeAuditLog } from '../audit.service.js'

export type WorkflowStage = 'DRAFT' | 'UNDER_REVIEW' | 'CISO_APPROVED' | 'BOARD_APPROVED'

export interface AuditWorkflow {
  id: string
  report_id: string
  report_name: string
  stage: WorkflowStage
  created_by: string
  ciso_approved_by: string | null
  ciso_approved_at: string | null
  board_approved_by: string | null
  board_approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowTransition {
  id: string
  workflow_id: string
  from_stage: WorkflowStage | null
  to_stage: WorkflowStage
  actor_id: string
  comment: string | null
  created_at: string
}

// Ensure workflow tables exist (additional migration run at startup)
export function ensureWorkflowTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_workflows (
      id                  TEXT PRIMARY KEY,
      report_id           TEXT NOT NULL,
      report_name         TEXT NOT NULL,
      stage               TEXT NOT NULL DEFAULT 'DRAFT',
      created_by          TEXT NOT NULL,
      ciso_approved_by    TEXT,
      ciso_approved_at    TEXT,
      board_approved_by   TEXT,
      board_approved_at   TEXT,
      notes               TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflow_transitions (
      id            TEXT PRIMARY KEY,
      workflow_id   TEXT NOT NULL REFERENCES audit_workflows(id) ON DELETE CASCADE,
      from_stage    TEXT,
      to_stage      TEXT NOT NULL,
      actor_id      TEXT NOT NULL,
      comment       TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_report ON audit_workflows(report_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_stage ON audit_workflows(stage);
    CREATE INDEX IF NOT EXISTS idx_transitions_workflow ON workflow_transitions(workflow_id);
  `)
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export function createWorkflow(params: {
  reportId: string
  reportName: string
  createdBy: string
  notes?: string
}): AuditWorkflow {
  const id = uuidv4()
  db.prepare(`
    INSERT INTO audit_workflows (id, report_id, report_name, stage, created_by, notes)
    VALUES (@id, @reportId, @reportName, 'DRAFT', @createdBy, @notes)
  `).run({ id, reportId: params.reportId, reportName: params.reportName, createdBy: params.createdBy, notes: params.notes ?? null })

  recordTransition({ workflowId: id, fromStage: null, toStage: 'DRAFT', actorId: params.createdBy })

  writeAuditLog({ userId: params.createdBy, action: 'AUDIT_WORKFLOW_CREATED', resource: params.reportId })
  return getWorkflow(id)!
}

export function advanceWorkflow(params: {
  workflowId: string
  actorId: string
  comment?: string
}): AuditWorkflow | null {
  const workflow = getWorkflow(params.workflowId)
  if (!workflow) return null

  const transitions: Record<WorkflowStage, WorkflowStage> = {
    DRAFT: 'UNDER_REVIEW',
    UNDER_REVIEW: 'CISO_APPROVED',
    CISO_APPROVED: 'BOARD_APPROVED',
    BOARD_APPROVED: 'BOARD_APPROVED', // terminal
  }

  const nextStage = transitions[workflow.stage]
  if (nextStage === workflow.stage) return workflow

  const updates: Record<string, unknown> = {
    stage: nextStage,
    updatedAt: new Date().toISOString(),
    id: params.workflowId,
  }

  let sql = `UPDATE audit_workflows SET stage = @stage, updated_at = @updatedAt`

  if (nextStage === 'CISO_APPROVED') {
    updates['cisoApprovedBy'] = params.actorId
    updates['cisoApprovedAt'] = new Date().toISOString()
    sql += `, ciso_approved_by = @cisoApprovedBy, ciso_approved_at = @cisoApprovedAt`
  } else if (nextStage === 'BOARD_APPROVED') {
    updates['boardApprovedBy'] = params.actorId
    updates['boardApprovedAt'] = new Date().toISOString()
    sql += `, board_approved_by = @boardApprovedBy, board_approved_at = @boardApprovedAt`
  }

  db.prepare(sql + ` WHERE id = @id`).run(updates)

  recordTransition({
    workflowId: params.workflowId,
    fromStage: workflow.stage,
    toStage: nextStage,
    actorId: params.actorId,
    comment: params.comment,
  })

  writeAuditLog({
    userId: params.actorId,
    action: 'AUDIT_WORKFLOW_ADVANCED',
    resource: params.workflowId,
    details: { from: workflow.stage, to: nextStage },
  })

  return getWorkflow(params.workflowId)
}

export function revertWorkflow(params: {
  workflowId: string
  actorId: string
  comment?: string
}): AuditWorkflow | null {
  const workflow = getWorkflow(params.workflowId)
  if (!workflow) return null

  const revertMap: Partial<Record<WorkflowStage, WorkflowStage>> = {
    UNDER_REVIEW: 'DRAFT',
    CISO_APPROVED: 'UNDER_REVIEW',
    BOARD_APPROVED: 'CISO_APPROVED',
  }

  const prevStage = revertMap[workflow.stage]
  if (!prevStage) return workflow

  db.prepare(`UPDATE audit_workflows SET stage = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(prevStage, params.workflowId)

  recordTransition({
    workflowId: params.workflowId,
    fromStage: workflow.stage,
    toStage: prevStage,
    actorId: params.actorId,
    comment: params.comment ?? 'Reverted',
  })

  writeAuditLog({
    userId: params.actorId,
    action: 'AUDIT_WORKFLOW_REVERTED',
    resource: params.workflowId,
    details: { from: workflow.stage, to: prevStage },
  })

  return getWorkflow(params.workflowId)
}

export function getWorkflow(id: string): AuditWorkflow | null {
  return (db.prepare('SELECT * FROM audit_workflows WHERE id = ?').get(id) as AuditWorkflow | undefined) ?? null
}

export function listWorkflows(stage?: WorkflowStage): AuditWorkflow[] {
  if (stage) {
    return db.prepare('SELECT * FROM audit_workflows WHERE stage = ? ORDER BY created_at DESC').all(stage) as AuditWorkflow[]
  }
  return db.prepare('SELECT * FROM audit_workflows ORDER BY created_at DESC').all() as AuditWorkflow[]
}

export function getWorkflowHistory(workflowId: string): WorkflowTransition[] {
  return db.prepare('SELECT * FROM workflow_transitions WHERE workflow_id = ? ORDER BY created_at ASC').all(workflowId) as WorkflowTransition[]
}

function recordTransition(params: {
  workflowId: string
  fromStage: WorkflowStage | null
  toStage: WorkflowStage
  actorId: string
  comment?: string
}) {
  db.prepare(`
    INSERT INTO workflow_transitions (id, workflow_id, from_stage, to_stage, actor_id, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), params.workflowId, params.fromStage, params.toStage, params.actorId, params.comment ?? null)
}
