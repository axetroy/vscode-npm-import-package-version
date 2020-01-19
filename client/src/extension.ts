import * as path from "path";
import {
  workspace,
  ExtensionContext,
  window,
  OverviewRulerLane,
  MarkdownString,
  DecorationOptions,
  Range,
  commands
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from "vscode-languageclient";
import { init, localize } from "vscode-nls-i18n";
import { IMark } from "./type";

enum Commands {
  openPackageJson = "npm-version._open"
}

export async function activate(context: ExtensionContext) {
  await init(context);
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js")
  );
  // The debug options for the server
  const debugOptions = { execArgv: ["--nolazy", "--inspect=9527"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      { language: "javascript" },
      { language: "javascriptreact" },
      { language: "typescript" },
      { language: "typescriptreact" },
      { language: "vue" }
    ],
    synchronize: {
      configurationSection: "npm-version"
    }
  };

  // Create the language client and start the client.
  const client = new LanguageClient(
    "npm_import_version_server",
    "Npm Import Version Server",
    serverOptions,
    clientOptions
  );

  const decorationType = window.createTextEditorDecorationType({
    overviewRulerLane: OverviewRulerLane.Right,
    after: { margin: "0 0 0 0rem" }
  });

  client.onReady().then(() => {
    client.onNotification(
      "decorators",
      ({ uri, marks }: { uri: string; marks: IMark[] }) => {
        const editor = window.activeTextEditor;

        if (!editor) {
          return;
        }

        if (editor.document.uri.toString() !== uri) {
          return;
        }

        editor.setDecorations(
          decorationType,
          marks.map(v => {
            const params = encodeURIComponent(
              JSON.stringify({ name: v.name, packagePath: v.packagePath })
            );
            const hover = new MarkdownString();
            hover.value = "";

            hover.isTrusted = true;

            if (v.description) {
              hover.value += v.description;
            }

            if (!v.buildIn) {
              if (!v.version) {
                hover.value += localize("tip.not_installed_warning", v.name);
              } else {
                hover.value += `\n\n[${localize("cmd.open.title")}](command:${
                  Commands.openPackageJson
                }?${params})`;
              }
            }

            hover.value = hover.value.trim();

            const target: DecorationOptions = {
              range: new Range(
                editor.document.positionAt(v.location.start),
                editor.document.positionAt(v.location.end)
              ),
              hoverMessage: hover,
              renderOptions: {
                after: {
                  contentText: v.buildIn
                    ? ""
                    : `@${v.version || localize("tip.not_installed")}`,
                  color: "#9e9e9e"
                }
              }
            };
            return target;
          })
        );
      }
    );
  });

  const disposable = client.start();

  context.subscriptions.push(
    commands.registerCommand(
      Commands.openPackageJson,
      async ({ packagePath }) => {
        const document = await workspace.openTextDocument(packagePath);
        window.showTextDocument(document);
      }
    )
  );

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(editor => {
      client.sendNotification("compile", editor.document.uri.toString());
    })
  );

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(disposable);
}
