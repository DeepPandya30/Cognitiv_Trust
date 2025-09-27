import * as vscode from 'vscode';

export class SecureCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const relevant = context.diagnostics.filter(d =>
      d.range.intersection(range) || range.contains(d.range)
    );

    const actions: vscode.CodeAction[] = [];

    for (const diag of relevant) {
      const anyDiag = diag as any;

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
      const ruleId = (anyDiag.ruleId || '') as string;

      if (ruleId.includes('hardcoded-secret')) {
        const comment = new vscode.CodeAction('Comment with guidance', vscode.CodeActionKind.QuickFix);
        comment.edit = new vscode.WorkspaceEdit();
        const line = diag.range.start.line;
        comment.edit.insert(
          document.uri,
          new vscode.Position(line, 0),
          '// TODO: Move secrets to env (e.g., process.env.SECRET_NAME) and load via dotenv/secret manager.\n'
        );
        actions.push(comment);
      }

      if (ruleId.includes('missing-auth')) {
        const snippet = new vscode.CodeAction('Insert auth check stub', vscode.CodeActionKind.QuickFix);
        snippet.edit = new vscode.WorkspaceEdit();
        snippet.edit.insert(
          document.uri,
          diag.range.start,
          `\n// Authorization check\nif (!req.user || !req.user.roles?.includes('admin')) {\n  return res.status(403).send('Forbidden');\n}\n`
        );
        actions.push(snippet);
      }
    }

    return actions;
  }
}
