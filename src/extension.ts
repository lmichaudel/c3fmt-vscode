import * as vscode from 'vscode';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    const provider = vscode.languages.registerDocumentFormattingEditProvider('c3', {
        provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
            return formatDocument(document);
        }
    });

    context.subscriptions.push(provider);
}

async function formatDocument(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
    // 2. Get the user's configured command
    const config = vscode.workspace.getConfiguration('c3fmt');
    const command = config.get<string>("path", "c3fmt");

    if (!command) {
        vscode.window.showErrorMessage("No command/path specified for c3fmt!");
        return [];
    }

    const text = document.getText();

    return new Promise((resolve, reject) => {
        const process = cp.spawn(command, ["--stdin"]);

        let stdout = '';
        let stderr = '';

        if (process.stdin) {
            process.stdin.write(text);
            process.stdin.end();
        }

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0) {
                vscode.window.showErrorMessage(`Formatter failed: ${stderr}`);
                return reject(stderr);
            }

            const firstLine = document.lineAt(0);
            const lastLine = document.lineAt(document.lineCount - 1);
            const fullRange = new vscode.Range(firstLine.range.start, lastLine.range.end);

            resolve([vscode.TextEdit.replace(fullRange, stdout)]);
        });

        process.on('error', (err) => {
            vscode.window.showErrorMessage(`Failed to run formatter: ${err.message}`);
            reject(err);
        });
    });
}

export function deactivate() {}