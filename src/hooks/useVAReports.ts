import { useState, useCallback } from 'react'
import type { VAReport, VAFinding } from '../types/vaReport'
import type { Severity } from '../types/security'

const STORAGE_KEY = 'ciso_va_reports'

function load(): VAReport[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

// Parse a JSON VA report file. Accepts two shapes:
// 1. Our own VAReport format (has "findings" array)
// 2. Flat array of findings [{title, severity, cvssScore, affectedHost, ...}]
export function parseVAReportJSON(raw: unknown, scannerName: 'Qualys' | 'Tenable' | 'Nessus'): VAReport | null {
  try {
    if (Array.isArray(raw)) {
      // Flat array of findings
      const findings: VAFinding[] = (raw as Record<string, unknown>[]).map((f, i) => ({
        id: `f-${i}`,
        title: String(f.title ?? f.name ?? 'Unknown Finding'),
        severity: (['critical','high','medium','low'].includes(String(f.severity).toLowerCase()) ? String(f.severity).toLowerCase() : 'medium') as Severity,
        cvssScore: Number(f.cvssScore ?? f.cvss ?? f.score ?? 5.0),
        cveId: f.cveId ? String(f.cveId) : undefined,
        affectedHost: String(f.host ?? f.affectedHost ?? f.ip ?? 'Unknown'),
        affectedPort: f.port ? String(f.port) : undefined,
        service: f.service ? String(f.service) : undefined,
        description: String(f.description ?? f.detail ?? ''),
        recommendation: String(f.recommendation ?? f.solution ?? f.fix ?? 'Apply vendor patch.'),
        pluginId: f.pluginId ? String(f.pluginId) : undefined,
        firstSeen: String(f.firstSeen ?? f.detected ?? new Date().toISOString()),
        source: scannerName,
        status: 'open',
      }))
      return {
        id: `report-${Date.now()}`,
        scanName: `${scannerName} Import — ${new Date().toLocaleDateString()}`,
        scanner: scannerName,
        scanStarted: new Date(Date.now() - 7200000).toISOString(),
        scanCompleted: new Date().toISOString(),
        totalHosts: [...new Set(findings.map(f => f.affectedHost))].length,
        hostsScanned: [...new Set(findings.map(f => f.affectedHost))].length,
        findings,
        importedAt: new Date().toISOString(),
      }
    }
    // Already VAReport shape
    const r = raw as VAReport
    if (r.findings && Array.isArray(r.findings)) {
      return { ...r, id: `report-${Date.now()}`, importedAt: new Date().toISOString() }
    }
    return null
  } catch { return null }
}

// Generate a sample demo report for the upload demo button
export function generateDemoReport(scanner: 'Qualys' | 'Tenable' | 'Nessus'): VAReport {
  const hosts = ['10.0.1.45', '10.0.2.13', '192.168.1.100', '10.10.0.5', '172.16.0.22']
  const findings: VAFinding[] = [
    { id: 'df-1', title: 'OpenSSL CVE-2024-0160 — Remote Code Execution', severity: 'critical', cvssScore: 9.8, cveId: 'CVE-2024-0160', affectedHost: hosts[0], affectedPort: '443', service: 'HTTPS', description: 'Remote code execution via heap buffer overflow in TLS handshake.', recommendation: 'Upgrade OpenSSL to 3.0.14 or later.', firstSeen: '2026-05-01', source: scanner, status: 'open' },
    { id: 'df-2', title: 'Apache HTTP Server Path Traversal', severity: 'high', cvssScore: 7.5, cveId: 'CVE-2024-1234', affectedHost: hosts[1], affectedPort: '80', service: 'HTTP', description: 'Path traversal allows reading arbitrary files outside document root.', recommendation: 'Update Apache to 2.4.59+', firstSeen: '2026-05-03', source: scanner, status: 'open' },
    { id: 'df-3', title: 'SSH Weak Ciphers Enabled', severity: 'medium', cvssScore: 5.3, affectedHost: hosts[2], affectedPort: '22', service: 'SSH', description: 'Server supports weak cipher suites (RC4, DES).', recommendation: 'Disable weak ciphers in sshd_config.', firstSeen: '2026-04-20', source: scanner, status: 'open' },
    { id: 'df-4', title: 'SMB Signing Disabled', severity: 'medium', cvssScore: 5.9, affectedHost: hosts[3], affectedPort: '445', service: 'SMB', description: 'SMB signing not required, enabling MITM relay attacks.', recommendation: 'Enable RequireSecuritySignature in group policy.', firstSeen: '2026-04-15', source: scanner, status: 'open' },
    { id: 'df-5', title: 'Self-Signed TLS Certificate', severity: 'low', cvssScore: 3.1, affectedHost: hosts[4], affectedPort: '8443', service: 'HTTPS', description: 'Certificate is self-signed and not trusted by browsers.', recommendation: 'Replace with CA-signed certificate.', firstSeen: '2026-03-01', source: scanner, status: 'accepted_risk' },
    { id: 'df-6', title: 'Jenkins Remote Code Execution', severity: 'critical', cvssScore: 9.9, cveId: 'CVE-2024-23897', affectedHost: hosts[1], affectedPort: '8080', service: 'HTTP', description: 'Unauthenticated RCE via CLI path traversal.', recommendation: 'Upgrade Jenkins to 2.442+ immediately.', firstSeen: '2026-05-10', source: scanner, status: 'open' },
    { id: 'df-7', title: 'Default Credentials on Network Device', severity: 'high', cvssScore: 8.6, affectedHost: hosts[3], description: 'Device accessible with factory default admin/admin credentials.', recommendation: 'Change default credentials immediately.', firstSeen: '2026-05-08', source: scanner, status: 'open' },
    { id: 'df-8', title: 'Unencrypted HTTP Admin Interface', severity: 'medium', cvssScore: 6.1, affectedHost: hosts[0], affectedPort: '8080', description: 'Management interface transmits credentials in plaintext.', recommendation: 'Enforce HTTPS on all management interfaces.', firstSeen: '2026-04-28', source: scanner, status: 'open' },
  ]
  return {
    id: `report-${Date.now()}`,
    scanName: `${scanner} Full Scan — ${new Date().toLocaleDateString()}`,
    scanner,
    scanStarted: new Date(Date.now() - 14400000).toISOString(),
    scanCompleted: new Date(Date.now() - 7200000).toISOString(),
    totalHosts: hosts.length,
    hostsScanned: hosts.length,
    findings,
    importedAt: new Date().toISOString(),
  }
}

export function useVAReports() {
  const [reports, setReports] = useState<VAReport[]>(load)

  const importReport = useCallback((report: VAReport) => {
    const updated = [report, ...load()]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setReports(updated)
  }, [])

  const clearReports = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setReports([])
  }, [])

  const allFindings = reports.flatMap(r => r.findings)
  const openFindings = allFindings.filter(f => f.status === 'open')

  return { reports, importReport, clearReports, allFindings, openFindings }
}
