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
exports.SecureCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
class SecureCodeActionProvider {
    provideCodeActions(document, range, context, _token) {
        const relevant = context.diagnostics.filter(d => d.range.intersection(range) || range.contains(d.range));
        const actions = [];
        for (const diag of relevant) {
            const anyDiag = diag;
            // If scanner attached a fix, surface as a quick fix
            if (anyDiag.fix) {
                const fix = new vscode.CodeAction('Replace with safe pattern', vscode.CodeActionKind.QuickFix);
                fix.diagnostics = [diag];
                fix.edit = new vscode.WorkspaceEdit();
                fix.edit.replace(document.uri, anyDiag.fix.range, anyDiag.fix.newText);
                fix.isPreferred = true;
                actions.push(fix);
            }
            // Generic helpers by ruleId
            const ruleId = (anyDiag.ruleId || '');
            if (ruleId.includes('hardcoded-secret')) {
                const comment = new vscode.CodeAction('Comment with guidance', vscode.CodeActionKind.QuickFix);
                comment.edit = new vscode.WorkspaceEdit();
                const line = diag.range.start.line;
                comment.edit.insert(document.uri, new vscode.Position(line, 0), '// TODO: Move secrets to env (e.g., process.env.SECRET_NAME) and load via dotenv/secret manager.\n');
                actions.push(comment);
            }
            if (ruleId.includes('missing-auth')) {
                const snippet = new vscode.CodeAction('Insert auth check stub', vscode.CodeActionKind.QuickFix);
                snippet.edit = new vscode.WorkspaceEdit();
                snippet.edit.insert(document.uri, diag.range.start, `\n// Authorization check\nif (!req.user || !req.user.roles?.includes('admin')) {\n  return res.status(403).send('Forbidden');\n}\n`);
                actions.push(snippet);
            }
        }
        return actions;
    }
}
exports.SecureCodeActionProvider = SecureCodeActionProvider;
//# sourceMappingURL=quickfix.js.map