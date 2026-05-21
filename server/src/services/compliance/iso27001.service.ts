import { db } from '../../config/db.js'
import { v4 as uuidv4 } from 'uuid'

// ISO 27001:2022 Annex A control domains
export const ISO_CONTROLS = {
  'A.5': {
    name: 'Organizational Controls',
    controls: [
      { id: 'A.5.1', name: 'Policies for information security' },
      { id: 'A.5.2', name: 'Information security roles and responsibilities' },
      { id: 'A.5.3', name: 'Segregation of duties' },
      { id: 'A.5.4', name: 'Management responsibilities' },
      { id: 'A.5.5', name: 'Contact with authorities' },
      { id: 'A.5.6', name: 'Contact with special interest groups' },
      { id: 'A.5.7', name: 'Threat intelligence' },
      { id: 'A.5.8', name: 'Information security in project management' },
      { id: 'A.5.9', name: 'Inventory of information and other associated assets' },
      { id: 'A.5.10', name: 'Acceptable use of information and other associated assets' },
      { id: 'A.5.11', name: 'Return of assets' },
      { id: 'A.5.12', name: 'Classification of information' },
      { id: 'A.5.13', name: 'Labelling of information' },
      { id: 'A.5.14', name: 'Information transfer' },
      { id: 'A.5.15', name: 'Access control' },
      { id: 'A.5.16', name: 'Identity management' },
      { id: 'A.5.17', name: 'Authentication information' },
      { id: 'A.5.18', name: 'Access rights' },
      { id: 'A.5.19', name: 'Information security in supplier relationships' },
      { id: 'A.5.20', name: 'Addressing information security within supplier agreements' },
      { id: 'A.5.21', name: 'Managing information security in the ICT supply chain' },
      { id: 'A.5.22', name: 'Monitoring, review and change management of supplier services' },
      { id: 'A.5.23', name: 'Information security for use of cloud services' },
      { id: 'A.5.24', name: 'Information security incident management planning and preparation' },
      { id: 'A.5.25', name: 'Assessment and decision on information security events' },
      { id: 'A.5.26', name: 'Response to information security incidents' },
      { id: 'A.5.27', name: 'Learning from information security incidents' },
      { id: 'A.5.28', name: 'Collection of evidence' },
      { id: 'A.5.29', name: 'Information security during disruption' },
      { id: 'A.5.30', name: 'ICT readiness for business continuity' },
      { id: 'A.5.31', name: 'Legal, statutory, regulatory and contractual requirements' },
      { id: 'A.5.32', name: 'Intellectual property rights' },
      { id: 'A.5.33', name: 'Protection of records' },
      { id: 'A.5.34', name: 'Privacy and protection of PII' },
      { id: 'A.5.35', name: 'Independent review of information security' },
      { id: 'A.5.36', name: 'Compliance with policies, rules and standards for information security' },
      { id: 'A.5.37', name: 'Documented operating procedures' },
    ],
  },
  'A.6': {
    name: 'People Controls',
    controls: [
      { id: 'A.6.1', name: 'Screening' },
      { id: 'A.6.2', name: 'Terms and conditions of employment' },
      { id: 'A.6.3', name: 'Information security awareness, education and training' },
      { id: 'A.6.4', name: 'Disciplinary process' },
      { id: 'A.6.5', name: 'Responsibilities after termination or change of employment' },
      { id: 'A.6.6', name: 'Confidentiality or non-disclosure agreements' },
      { id: 'A.6.7', name: 'Remote working' },
      { id: 'A.6.8', name: 'Information security event reporting' },
    ],
  },
  'A.7': {
    name: 'Physical Controls',
    controls: [
      { id: 'A.7.1', name: 'Physical security perimeters' },
      { id: 'A.7.2', name: 'Physical entry' },
      { id: 'A.7.3', name: 'Securing offices, rooms and facilities' },
      { id: 'A.7.4', name: 'Physical security monitoring' },
      { id: 'A.7.5', name: 'Protecting against physical and environmental threats' },
      { id: 'A.7.6', name: 'Working in secure areas' },
      { id: 'A.7.7', name: 'Clear desk and clear screen' },
      { id: 'A.7.8', name: 'Equipment siting and protection' },
      { id: 'A.7.9', name: 'Security of assets off-premises' },
      { id: 'A.7.10', name: 'Storage media' },
      { id: 'A.7.11', name: 'Supporting utilities' },
      { id: 'A.7.12', name: 'Cabling security' },
      { id: 'A.7.13', name: 'Equipment maintenance' },
      { id: 'A.7.14', name: 'Secure disposal or re-use of equipment' },
    ],
  },
  'A.8': {
    name: 'Technological Controls',
    controls: [
      { id: 'A.8.1', name: 'User endpoint devices' },
      { id: 'A.8.2', name: 'Privileged access rights' },
      { id: 'A.8.3', name: 'Information access restriction' },
      { id: 'A.8.4', name: 'Access to source code' },
      { id: 'A.8.5', name: 'Secure authentication' },
      { id: 'A.8.6', name: 'Capacity management' },
      { id: 'A.8.7', name: 'Protection against malware' },
      { id: 'A.8.8', name: 'Management of technical vulnerabilities' },
      { id: 'A.8.9', name: 'Configuration management' },
      { id: 'A.8.10', name: 'Information deletion' },
      { id: 'A.8.11', name: 'Data masking' },
      { id: 'A.8.12', name: 'Data leakage prevention' },
      { id: 'A.8.13', name: 'Information backup' },
      { id: 'A.8.14', name: 'Redundancy of information processing facilities' },
      { id: 'A.8.15', name: 'Logging' },
      { id: 'A.8.16', name: 'Monitoring activities' },
      { id: 'A.8.17', name: 'Clock synchronization' },
      { id: 'A.8.18', name: 'Use of privileged utility programs' },
      { id: 'A.8.19', name: 'Installation of software on operational systems' },
      { id: 'A.8.20', name: 'Networks security' },
      { id: 'A.8.21', name: 'Security of network services' },
      { id: 'A.8.22', name: 'Segregation of networks' },
      { id: 'A.8.23', name: 'Web filtering' },
      { id: 'A.8.24', name: 'Use of cryptography' },
      { id: 'A.8.25', name: 'Secure development life cycle' },
      { id: 'A.8.26', name: 'Application security requirements' },
      { id: 'A.8.27', name: 'Secure system architecture and engineering principles' },
      { id: 'A.8.28', name: 'Secure coding' },
      { id: 'A.8.29', name: 'Security testing in development and acceptance' },
      { id: 'A.8.30', name: 'Outsourced development' },
      { id: 'A.8.31', name: 'Separation of development, test and production environments' },
      { id: 'A.8.32', name: 'Change management' },
      { id: 'A.8.33', name: 'Test information' },
      { id: 'A.8.34', name: 'Protection of information systems during audit testing' },
    ],
  },
}

// NIST CSF ↔ ISO 27001:2022 crosswalk
export const NIST_ISO_CROSSWALK: Array<{
  nistFunction: string
  nistSubcategory: string
  isoControls: string[]
  pciReq: string
  soc2Tsc: string
}> = [
  { nistFunction: 'GOVERN', nistSubcategory: 'GV.RM-01', isoControls: ['A.5.1', 'A.5.2'], pciReq: '12.1', soc2Tsc: 'CC1.1' },
  { nistFunction: 'GOVERN', nistSubcategory: 'GV.SC-01', isoControls: ['A.5.19', 'A.5.20'], pciReq: '12.8', soc2Tsc: 'CC9.2' },
  { nistFunction: 'IDENTIFY', nistSubcategory: 'ID.AM-01', isoControls: ['A.5.9', 'A.5.10'], pciReq: '2.4', soc2Tsc: 'CC6.1' },
  { nistFunction: 'IDENTIFY', nistSubcategory: 'ID.AM-02', isoControls: ['A.5.9'], pciReq: '2.4', soc2Tsc: 'CC6.1' },
  { nistFunction: 'IDENTIFY', nistSubcategory: 'ID.RA-01', isoControls: ['A.8.8'], pciReq: '6.3', soc2Tsc: 'CC7.1' },
  { nistFunction: 'PROTECT', nistSubcategory: 'PR.AA-01', isoControls: ['A.5.15', 'A.5.16', 'A.5.18'], pciReq: '7.1', soc2Tsc: 'CC6.2' },
  { nistFunction: 'PROTECT', nistSubcategory: 'PR.AA-05', isoControls: ['A.8.5'], pciReq: '8.3', soc2Tsc: 'CC6.2' },
  { nistFunction: 'PROTECT', nistSubcategory: 'PR.DS-01', isoControls: ['A.8.24', 'A.8.11'], pciReq: '3.4', soc2Tsc: 'CC6.7' },
  { nistFunction: 'PROTECT', nistSubcategory: 'PR.PS-06', isoControls: ['A.8.25', 'A.8.28', 'A.8.29'], pciReq: '6.2', soc2Tsc: 'CC8.1' },
  { nistFunction: 'DETECT', nistSubcategory: 'DE.CM-01', isoControls: ['A.8.15', 'A.8.16'], pciReq: '10.4', soc2Tsc: 'CC7.2' },
  { nistFunction: 'DETECT', nistSubcategory: 'DE.AE-02', isoControls: ['A.5.25', 'A.8.16'], pciReq: '10.7', soc2Tsc: 'CC7.3' },
  { nistFunction: 'RESPOND', nistSubcategory: 'RS.MA-01', isoControls: ['A.5.24', 'A.5.26'], pciReq: '12.10', soc2Tsc: 'CC7.4' },
  { nistFunction: 'RECOVER', nistSubcategory: 'RC.RP-01', isoControls: ['A.5.29', 'A.5.30'], pciReq: '12.10.1', soc2Tsc: 'A1.3' },
]

export interface IsoAssessment {
  controlId: string
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable'
  score: number
  evidence?: string
  finding?: string
  assessorId?: string
}

export function upsertIsoControl(params: IsoAssessment): void {
  const allControls = Object.values(ISO_CONTROLS).flatMap(d => d.controls)
  const controlDef = allControls.find(c => c.id === params.controlId)

  db.prepare(`
    INSERT INTO compliance_findings
      (id, framework, control_id, control_name, status, score, evidence, finding, source, assessed_at)
    VALUES
      (@id, 'ISO_27001', @controlId, @controlName, @status, @score, @evidence, @finding, @assessorId, datetime('now'))
  `).run({
    id: uuidv4(),
    controlId: params.controlId,
    controlName: controlDef?.name ?? params.controlId,
    status: params.status,
    score: params.score,
    evidence: params.evidence ?? null,
    finding: params.finding ?? null,
    assessorId: params.assessorId ?? null,
  })
}

export function getIsoComplianceScore(): { overall: number; byDomain: Record<string, { score: number; compliant: number; total: number }> } {
  const rows = db.prepare(`
    SELECT control_id, status, score
    FROM compliance_findings
    WHERE framework = 'ISO_27001'
    ORDER BY assessed_at DESC
  `).all() as { control_id: string; status: string; score: number }[]

  const latest = new Map<string, { status: string; score: number }>()
  for (const row of rows) {
    if (!latest.has(row.control_id)) latest.set(row.control_id, row)
  }

  const byDomain: Record<string, { score: number; compliant: number; total: number }> = {}
  let totalScore = 0
  let totalAssessed = 0

  for (const [domain, def] of Object.entries(ISO_CONTROLS)) {
    let domainScore = 0
    let compliant = 0
    let assessed = 0

    for (const ctrl of def.controls) {
      const record = latest.get(ctrl.id)
      if (record) {
        assessed++
        domainScore += record.score
        if (record.status === 'compliant') compliant++
      }
    }

    const avg = assessed > 0 ? Math.round(domainScore / assessed) : 0
    byDomain[domain] = { score: avg, compliant, total: def.controls.length }
    totalScore += domainScore
    totalAssessed += assessed
  }

  return {
    overall: totalAssessed > 0 ? Math.round(totalScore / totalAssessed) : 0,
    byDomain,
  }
}
