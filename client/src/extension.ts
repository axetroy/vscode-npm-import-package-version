import * as path from "path";
import {
  commands,
  ConfigurationTarget,
  DecorationOptions,
  ExtensionContext,
  Hover,
  MarkdownString,
  OverviewRulerLane,
  Range,
  window,
  workspace,
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { init, localize } from "vscode-nls-i18n";
import { IMark } from "./type";

enum Commands {
  openPackageJson = "npm-version._open",
}

const configurationNamespace = "npm-import-package-version";
const configurationFieldEnable = "enable";

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
  await init(context.extensionPath);

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
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      { scheme: "file", language: "javascript" },
      { scheme: "file", language: "javascriptreact" },
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "typescriptreact" },
      { scheme: "file", language: "vue" },
    ],
    synchronize: {
      configurationSection: configurationNamespace,
    },
    progressOnInitialization: true,
    stdioEncoding: "utf8",
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "npm_import_version_server",
    "Npm Import Version Server",
    serverOptions,
    clientOptions
  );

  client.registerProposedFeatures();

  const decorationType = window.createTextEditorDecorationType({
    overviewRulerLane: OverviewRulerLane.Right,
    after: { margin: "0 0 0 0rem" },
  });

  const tsExpectedSpinupTime = 700;
  let isFirstInit = true;

  client.onReady().then(() => {
    client.onNotification(
      "decorators",
      async ({ uri, marks }: { uri: string; marks: IMark[] }) => {
        const editor = window.activeTextEditor;

        if (!editor) {
          return;
        }

        const { document } = editor ?? {};
        if (document.uri.toString() !== uri) {
          return;
        }

        const resolvedDecorations: DecorationOptions[] = [];
        const resolveDecoration = (decoration: DecorationOptions) => {
          resolvedDecorations.push(decoration);
          editor.setDecorations(decorationType, resolvedDecorations);
        };

        for (const v of marks) {
          const params = encodeURIComponent(
            JSON.stringify({ name: v.name, packagePath: v.packagePath })
          );
          const hover = new MarkdownString();
          hover.value = "";

          hover.isTrusted = true;

          if (v.description) {
            hover.value += v.description;
          }

          let shouldBeIgnored = v.buildIn;
          if (!v.version) {
            const getHovers = async () => {
              const hovers: Hover[] = await commands.executeCommand(
                "vscode.executeHoverProvider",
                document.uri,
                document.positionAt(v.location.end)
              );
              return hovers;
            };
            let hovers = await getHovers();
            if (isFirstInit && hovers.length === 0) {
              await new Promise((resolve) => {
                setTimeout(resolve, tsExpectedSpinupTime);
              });
              hovers = await getHovers();
              isFirstInit = false;
            }
            if (
              hovers.some(
                (hover) =>
                  typeof hover.contents[0] === "object" &&
                  hover.contents[0].value
                    .trim()
                    .startsWith('```typescript\nmodule "')
              )
            ) {
              shouldBeIgnored = true;
            }
          }
          if (!shouldBeIgnored) {
            if (!v.version) {
              hover.value += localize("tip.not_installed_warning", v.name);
            } else {
              hover.value += `\n\n[${localize("cmd.open.title")}](command:${
                Commands.openPackageJson
              }?${params})`;
            }
          }

          hover.value = hover.value.trim();

          resolveDecoration({
            range: new Range(
              document.positionAt(v.location.start),
              document.positionAt(v.location.end)
            ),
            hoverMessage: hover,
            renderOptions: {
              after: {
                contentText: shouldBeIgnored
                  ? ""
                  : `@${v.version || localize("tip.not_installed")}`,
                color: "#9e9e9e",
              },
            },
          });
        }
      }
    );

    context.subscriptions.push(
      window.onDidChangeActiveTextEditor((editor) => {
        client.sendNotification("compile", {
          uri: editor?.document.uri.toString(),
        });
      })
    );
  });

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
    commands.registerCommand("npm-version.enable", async () => {
      await workspace
        .getConfiguration(configurationNamespace)
        .update(configurationFieldEnable, true, ConfigurationTarget.Global);
    })
  );

  context.subscriptions.push(
    commands.registerCommand("npm-version.disable", async () => {
      await workspace
        .getConfiguration(configurationNamespace)
        .update(configurationFieldEnable, false, ConfigurationTarget.Global);
    })
  );

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(client.start());
}

export function deactivate() {
  client && client.stop();
}
