import * as vscode from 'vscode';
import { runScanAndReport } from './scanner';
import { SecureCodeActionProvider } from './quickfix';

export function activate(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection('secure-code-assistant');
  context.subscriptions.push(diagnostics);

  // Scan current file on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      await runScanAndReport(doc, diagnostics);
    })
  );

  // Also scan the active file when the extension activates
  const active = vscode.window.activeTextEditor?.document;
  if (active) { runScanAndReport(active, diagnostics); }

  // Register Quick Fix provider
  const selector: vscode.DocumentSelector = [
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
    { language: 'python', scheme: 'file' }
  ];

  const provider: vscode.CodeActionProvider = new SecureCodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      selector,
      provider,
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  console.log('Secure Code Assistant activated');
}

export function deactivate() {}
