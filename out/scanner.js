"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScanAndReport = runScanAndReport;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
function whichSemgrep() {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        const p = (0, child_process_1.spawn)(cmd, ['semgrep']);
        let found = '';
        p.stdout.on('data', (d) => (found += d.toString()));
        p.on('close', (code) => resolve(code === 0 ? found.trim().split('\n')[0] : null));
    });
}
// Very small fallback checks (if semgrep isn't installed)
function fallbackScan(doc) {
    const findings = [];
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
                    newText: lineText.replace(/(["'`][^"'`]+["'`])/, 'process.env.SECRET_NAME /* TODO: set in .env */')
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
async function runScanAndReport(doc, collection) {
    if (doc.isUntitled)
        return;
    const semgrepPath = await whichSemgrep();
    let findings = [];
    if (semgrepPath) {
        findings = await semgrepScan(doc, semgrepPath).catch(() => fallbackScan(doc));
    }
    else {
        findings = fallbackScan(doc);
    }
    const diags = findings.map(f => {
        const range = new vscode.Range(f.startLine, f.startCol, f.endLine, f.endCol);
        const d = new vscode.Diagnostic(range, `[Secure] ${f.message}`, f.severity);
        d.ruleId = f.ruleId;
        if (f.fix)
            d.fix = f.fix;
        return d;
    });
    collection.set(doc.uri, diags);
}
async function semgrepScan(doc, semgrepPath) {
    const rulesDir = path.join(vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath || '', 'semgrep-rules');
    const args = ['--json', '--quiet', '--config', rulesDir, doc.uri.fsPath];
    return new Promise((resolve, reject) => {
        const p = (0, child_process_1.spawn)(semgrepPath, args, { cwd: path.dirname(doc.uri.fsPath) });
        let out = '', err = '';
        p.stdout.on('data', d => out += d.toString());
        p.stderr.on('data', d => err += d.toString());
        p.on('close', (code) => {
            if (code !== 0 && !out)
                return reject(new Error(err || 'semgrep failed'));
            try {
                const json = JSON.parse(out || '{}');
                const results = (json.results || []);
                const findings = results.map(r => {
                    const start = r.start || r.start_position || r.extra?.start || r.extra?.lines?.[0];
                    const end = r.end || r.end_position || start;
                    const startLine = Math.max(0, (start?.line || 1) - 1);
                    const startCol = Math.max(0, (start?.col || 1) - 1);
                    const endLine = Math.max(0, (end?.line || startLine + 1) - 1);
                    const endCol = Math.max(0, (end?.col || 1) - 1);
                    const severity = (r.extra?.severity || 'WARNING').toUpperCase() === 'ERROR'
                        ? vscode.DiagnosticSeverity.Error
                        : vscode.DiagnosticSeverity.Warning;
                    return {
                        message: r.extra?.message || r.check_id || 'Semgrep finding',
                        startLine, startCol, endLine, endCol,
                        ruleId: r.check_id || 'semgrep.rule',
                        severity
                    };
                });
                resolve(findings);
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
//# sourceMappingURL=scanner.js.map