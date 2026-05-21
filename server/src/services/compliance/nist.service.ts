import { db } from '../../config/db.js'
import { v4 as uuidv4 } from 'uuid'

export type NistFunction = 'GOVERN' | 'IDENTIFY' | 'PROTECT' | 'DETECT' | 'RESPOND' | 'RECOVER'
export type MaturityLevel = 1 | 2 | 3 | 4 | 5
export type ControlStatus = 'compliant' | 'partial' | 'non_compliant' | 'not_applicable'

// NIST CSF 2.0 functions with subcategories
export const NIST_FUNCTIONS: Record<NistFunction, { label: string; subcategories: string[] }> = {
  GOVERN: {
    label: 'Govern',
    subcategories: [
      'GV.OC-01', 'GV.OC-02', 'GV.OC-03', 'GV.OC-04', 'GV.OC-05',
      'GV.RM-01', 'GV.RM-02', 'GV.RM-03', 'GV.RM-04', 'GV.RM-05', 'GV.RM-06', 'GV.RM-07',
      'GV.RR-01', 'GV.RR-02', 'GV.RR-03', 'GV.RR-04',
      'GV.PO-01', 'GV.PO-02',
      'GV.OV-01', 'GV.OV-02', 'GV.OV-03',
      'GV.SC-01', 'GV.SC-02', 'GV.SC-03', 'GV.SC-04', 'GV.SC-05', 'GV.SC-06', 'GV.SC-07', 'GV.SC-08', 'GV.SC-09', 'GV.SC-10',
    ],
  },
  IDENTIFY: {
    label: 'Identify',
    subcategories: [
      'ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04', 'ID.AM-05', 'ID.AM-07', 'ID.AM-08',
      'ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-04', 'ID.RA-05', 'ID.RA-06', 'ID.RA-07', 'ID.RA-08', 'ID.RA-09', 'ID.RA-10',
      'ID.IM-01', 'ID.IM-02', 'ID.IM-03', 'ID.IM-04',
    ],
  },
  PROTECT: {
    label: 'Protect',
    subcategories: [
      'PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04', 'PR.AA-05', 'PR.AA-06',
      'PR.AT-01', 'PR.AT-02',
      'PR.DS-01', 'PR.DS-02', 'PR.DS-10', 'PR.DS-11',
      'PR.IR-01', 'PR.IR-02', 'PR.IR-03', 'PR.IR-04',
      'PR.PS-01', 'PR.PS-02', 'PR.PS-03', 'PR.PS-04', 'PR.PS-05', 'PR.PS-06',
    ],
  },
  DETECT: {
    label: 'Detect',
    subcategories: [
      'DE.AE-02', 'DE.AE-03', 'DE.AE-04', 'DE.AE-06', 'DE.AE-07', 'DE.AE-08',
      'DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-06', 'DE.CM-09',
    ],
  },
  RESPOND: {
    label: 'Respond',
    subcategories: [
      'RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.MA-05',
      'RS.AN-03', 'RS.AN-06', 'RS.AN-07', 'RS.AN-08',
      'RS.CO-02', 'RS.CO-03',
      'RS.MI-01', 'RS.MI-02',
    ],
  },
  RECOVER: {
    label: 'Recover',
    subcategories: [
      'RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-04', 'RC.RP-05', 'RC.RP-06',
      'RC.CO-03', 'RC.CO-04',
    ],
  },
}

export interface NistControlRecord {
  id: string
  function: NistFunction
  subcategory: string
  status: ControlStatus
  maturity_level: MaturityLevel
  score: number
  evidence: string | null
  finding: string | null
  assessed_at: string
  assessor_id: string | null
}

export function upsertNistControl(params: {
  functionName: NistFunction
  subcategory: string
  status: ControlStatus
  maturityLevel: MaturityLevel
  score: number
  evidence?: string
  finding?: string
  assessorId?: string
}): void {
  db.prepare(`
    INSERT INTO compliance_findings
      (id, framework, control_id, control_name, status, score, evidence, finding, source, assessed_at)
    VALUES
      (@id, 'NIST_CSF', @controlId, @controlName, @status, @score, @evidence, @finding, @assessorId, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      score = excluded.score,
      evidence = excluded.evidence,
      finding = excluded.finding,
      assessed_at = excluded.assessed_at
  `).run({
    id: uuidv4(),
    controlId: `${params.functionName}.${params.subcategory}`,
    controlName: params.subcategory,
    status: params.status,
    score: params.score,
    evidence: params.evidence ?? null,
    finding: params.finding ?? null,
    assessorId: params.assessorId ?? null,
  })
}

export function getNistMaturityScores(): Record<NistFunction, { score: number; level: MaturityLevel; controls: number; compliant: number }> {
  const rows = db.prepare(`
    SELECT control_id, status, score
    FROM compliance_findings
    WHERE framework = 'NIST_CSF'
    ORDER BY assessed_at DESC
  `).all() as { control_id: string; status: string; score: number }[]

  // Keep only the most recent assessment per control
  const latest: Map<string, { status: string; score: number }> = new Map()
  for (const row of rows) {
    if (!latest.has(row.control_id)) latest.set(row.control_id, row)
  }

  const result = {} as Record<NistFunction, { score: number; level: MaturityLevel; controls: number; compliant: number }>

  for (const [fn, def] of Object.entries(NIST_FUNCTIONS) as [NistFunction, typeof NIST_FUNCTIONS[NistFunction]][]) {
    let totalScore = 0
    let compliant = 0
    let assessed = 0

    for (const sub of def.subcategories) {
      const key = `${fn}.${sub}`
      const record = latest.get(key)
      if (record) {
        assessed++
        totalScore += record.score
        if (record.status === 'compliant') compliant++
      }
    }

    const avgScore = assessed > 0 ? totalScore / assessed : 0
    const level = Math.max(1, Math.min(5, Math.round(avgScore / 20))) as MaturityLevel

    result[fn] = {
      score: Math.round(avgScore),
      level,
      controls: def.subcategories.length,
      compliant,
    }
  }

  return result
}

export function getNistGapReport(): Array<{
  function: NistFunction
  subcategory: string
  status: ControlStatus
  score: number
  finding: string | null
}> {
  const rows = db.prepare(`
    SELECT control_id, status, score, finding
    FROM compliance_findings
    WHERE framework = 'NIST_CSF' AND status != 'compliant' AND status != 'not_applicable'
    ORDER BY score ASC
  `).all() as { control_id: string; status: ControlStatus; score: number; finding: string | null }[]

  return rows.map(row => {
    const [fn, ...rest] = row.control_id.split('.')
    return {
      function: fn as NistFunction,
      subcategory: rest.join('.'),
      status: row.status,
      score: row.score,
      finding: row.finding,
    }
  })
}
