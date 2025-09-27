import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

type Finding = {
  message: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  ruleId: string;
  severity: vscode.DiagnosticSeverity;
  fix?: { range: vscode.Range; newText: string };
};

function whichSemgrep(): Promise<string | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const p = spawn(cmd, ['semgrep']);
    let found = '';
    p.stdout.on('data', (d) => (found += d.toString()));
    p.on('close', (code) => resolve(code === 0 ? found.trim().split('\n')[0] : null));
  });
}

// Very small fallback checks (if semgrep isn't installed)
function fallbackScan(doc: vscode.TextDocument): Finding[] {
  const findings: Finding[] = [];
  for (let i = 0; i < doc.lineCount; i++) {
    const lineText = doc.lineAt(i).text;

    // Hardcoded secret
    if (/(api[_-]?key|password|secret)\s*[:=]\s*["'`][^"'`]+["'`]/i.test(lineText)) {
      const range = new vscode.Range(i, 0, i, lineText.length);
      findings.push({
        message: 'Hardcoded secret detected. Use environment variables or secret manager.',
        startLine: i, startCol: 0, endLine: i, endCol: lineText.length,
        ruleId: 'fallback.hardcoded-secret',
        severity: vscode.DiagnosticSeverity.Warning,
        fix: {
          range,
          newText: lineText.replace(/(["'`][^"'`]+["'`])/,
            'process.env.SECRET_NAME /* TODO: set in .env */'
          )
        }
      });
    }

    // Missing auth (very naive)
    if (/function\s+\w+\s*\(/.test(lineText) && !/auth|authorize|requireRole/i.test(lineText)) {
      findings.push({
        message: 'Function may be missing an authorization check (heuristic).',
        startLine: i, startCol: 0, endLine: i, endCol: lineText.length,
        ruleId: 'fallback.missing-auth',
        severity: vscode.DiagnosticSeverity.Information
      });
    }
  }
  return findings;
}

export async function runScanAndReport(
  doc: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
) {
  if (doc.isUntitled) return;
  const semgrepPath = await whichSemgrep();

  let findings: Finding[] = [];
  if (semgrepPath) {
    findings = await semgrepScan(doc, semgrepPath).catch(() => fallbackScan(doc));
  } else {
    findings = fallbackScan(doc);
  }

  const diags: vscode.Diagnostic[] = findings.map(f => {
    const range = new vscode.Range(f.startLine, f.startCol, f.endLine, f.endCol);
    const d = new vscode.Diagnostic(range, `[Secure] ${f.message}`, f.severity);
    (d as any).ruleId = f.ruleId;
    if (f.fix) (d as any).fix = f.fix;
    return d;
  });

  collection.set(doc.uri, diags);
}

async function semgrepScan(doc: vscode.TextDocument, semgrepPath: string): Promise<Finding[]> {
  const rulesDir = path.join(vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath || '', 'semgrep-rules');
  const args = ['--json', '--quiet', '--config', rulesDir, doc.uri.fsPath];

  return new Promise((resolve, reject) => {
    const p = spawn(semgrepPath, args, { cwd: path.dirname(doc.uri.fsPath) });
    let out = '', err = '';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('close', (code) => {
      if (code !== 0 && !out) return reject(new Error(err || 'semgrep failed'));
      try {
        const json = JSON.parse(out || '{}');
        const results = (json.results || []) as any[];
        const findings: Finding[] = results.map(r => {
          const start = r.start || r.start_position || r.extra?.start || r.extra?.lines?.[0];
          const end = r.end || r.end_position || start;
          const startLine = Math.max(0, (start?.line || 1) - 1);
          const startCol = Math.max(0, (start?.col || 1) - 1);
          const endLine = Math.max(0, (end?.line || startLine + 1) - 1);
          const endCol = Math.max(0, (end?.col || 1) - 1);

          const severity =
            (r.extra?.severity || 'WARNING').toUpperCase() === 'ERROR'
              ? vscode.DiagnosticSeverity.Error
              : vscode.DiagnosticSeverity.Warning;

          return {
            message: r.extra?.message || r.check_id || 'Semgrep finding',
            startLine, startCol, endLine, endCol,
            ruleId: r.check_id || 'semgrep.rule',
            severity
          } as Finding;
        });
        resolve(findings);
      } catch (e) {
        reject(e);
      }
    });
  });
}
