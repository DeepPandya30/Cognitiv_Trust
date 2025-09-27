# Secure Code Assistant

Secure Code Assistant is a Visual Studio Code extension that inspects JavaScript, TypeScript, and Python files for common security anti-patterns. It surfaces findings inline, offers quick fixes, and can leverage Semgrep rules for deeper checks.

## Features
- Runs a scan when the extension activates and whenever you save a supported file.
- Uses Semgrep rules from `semgrep_rules/` when the `semgrep` CLI is available; falls back to lightweight heuristics otherwise.
- Highlights diagnostics directly in the editor with severity-aware messages.
- Provides quick fixes to replace insecure patterns or insert guidance snippets.

## Requirements
- VS Code 1.88 or newer.
- Node.js 18+ for building the extension.
- The `semgrep` CLI (optional, recommended) for full rule coverage.

## Getting Started
1. Install dependencies:
   ```bash
   cd secure-code-assistant
   npm install
   ```
2. Build the extension:
   ```bash
   npm run compile
   ```
3. Launch the extension host from VS Code via `Run → Start Debugging` (or press `F5`).
4. Open a workspace containing JavaScript, TypeScript, or Python files and start editing; scans run automatically on activation and save.

A sample file (`../demo.js`) is included in this repository to quickly see diagnostics and quick fixes in action.

## Scanning Details
- **Primary engine:** Semgrep, using the rules in `semgrep_rules/` (e.g., `secrets.yml`, `auth.yml`). Add or edit YAML files in this directory to customize findings.
- **Fallback engine:** Lightweight heuristics detect hardcoded secrets and functions missing obvious authorization checks when Semgrep is unavailable or fails.

## Quick Fixes
For each diagnostic, Secure Code Assistant may offer one or more quick fixes:
- Apply an automated rewrite supplied by the scanner (when available).
- Insert guidance comments reminding you to externalize secrets.
- Stub out authorization checks for routes or handlers flagged by the heuristics.

## Development Workflow
- Use `npm run watch` to recompile TypeScript on file changes during development.
- Source entry point: `src/extension.ts` (activation and wiring), `src/scanner.ts` (Semgrep + fallback logic), `src/quickfix.ts` (code actions).
- Compiled JavaScript emits to `out/` (created by the TypeScript compiler).
- Update package metadata in `package.json` before publishing.

## Troubleshooting
- If no diagnostics appear, verify that `semgrep` is installed and accessible from your PATH, or rely on the fallback heuristics.
- Ensure the workspace folder you open in VS Code contains the `semgrep_rules/` directory so the extension can locate custom rule files.
