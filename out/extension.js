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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const scanner_1 = require("./scanner");
const quickfix_1 = require("./quickfix");
function activate(context) {
    const diagnostics = vscode.languages.createDiagnosticCollection('secure-code-assistant');
    context.subscriptions.push(diagnostics);
    // Scan current file on save
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (doc) => {
        await (0, scanner_1.runScanAndReport)(doc, diagnostics);
    }));
    // Also scan the active file when the extension activates
    const active = vscode.window.activeTextEditor?.document;
    if (active) {
        (0, scanner_1.runScanAndReport)(active, diagnostics);
    }
    // Register Quick Fix provider
    const selector = [
        { language: 'javascript', scheme: 'file' },
        { language: 'typescript', scheme: 'file' },
        { language: 'python', scheme: 'file' }
    ];
    const provider = new quickfix_1.SecureCodeActionProvider();
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(selector, provider, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
    console.log('Secure Code Assistant activated');
}
function deactivate() { }
//# sourceMappingURL=extension.js.map