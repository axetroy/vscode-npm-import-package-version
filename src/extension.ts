"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import VSCODE = require("vscode");
import { init, localize } from "vscode-nls-i18n";
import { SupportLanguagesMap } from "./type";
import { compile } from "./parser/index";

const configurationNamespace = "npm-import-package-version";
const configurationFieldEnable = "enable";

enum Commands {
  openPackageJson = "npm-version._open"
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: VSCODE.ExtensionContext) {
  init(context);
  const vscode: typeof VSCODE = require("vscode");
  const debounce = require("lodash.debounce");
  const { workspace, window, Range, OverviewRulerLane } = vscode;
  const configuration = vscode.workspace.getConfiguration(
    configurationNamespace
  );
  let enable = !!configuration.get(configurationFieldEnable);

  const decorationType = window.createTextEditorDecorationType({
    overviewRulerLane: OverviewRulerLane.Right,
    after: { margin: "0 0 0 0rem" }
  });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      const refreshConfigs = [
        `${configurationNamespace}.${configurationFieldEnable}`
      ];
      for (const config of refreshConfigs) {
        if (e.affectsConfiguration(config)) {
          enable = !!vscode.workspace
            .getConfiguration(configurationNamespace)
            .get(configurationFieldEnable, vscode.ConfigurationTarget.Global);
          updateDecorators(activeEditor);
        }
      }
    })
  );

  let activeEditor = window.activeTextEditor;

  const updateDecorators: (
    editor: VSCODE.TextEditor | void
  ) => Promise<void> = debounce(async (editor: VSCODE.TextEditor) => {
    if (!editor) {
      return;
    }

    if (!enable) {
      editor.setDecorations(decorationType, []);
      return;
    }

    const document = editor.document;

    if (!SupportLanguagesMap[document.languageId]) {
      return;
    }

    const marks = await compile(document);

    if (document.isClosed) {
      return;
    }

    editor.setDecorations(
      decorationType,
      marks.map(v => {
        const params = encodeURIComponent(
          JSON.stringify({ name: v.name, packagePath: v.packagePath })
        );
        const hover = new vscode.MarkdownString();
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

        const target: VSCODE.DecorationOptions = {
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
  }, 500);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      Commands.openPackageJson,
      async ({ packagePath }) => {
        const document = await vscode.workspace.openTextDocument(packagePath);
        vscode.window.showTextDocument(document);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("npm-version.enable", async () => {
      await vscode.workspace
        .getConfiguration(configurationNamespace)
        .update(
          configurationFieldEnable,
          true,
          vscode.ConfigurationTarget.Global
        );
      enable = true;
      await updateDecorators(activeEditor);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("npm-version.disable", async () => {
      await vscode.workspace
        .getConfiguration(configurationNamespace)
        .update(
          configurationFieldEnable,
          false,
          vscode.ConfigurationTarget.Global
        );

      enable = false;
      await updateDecorators(activeEditor);
    })
  );

  context.subscriptions.push(
    workspace.onDidChangeTextDocument(event => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorators(activeEditor);
      }
    })
  );

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(editor => {
      activeEditor = editor;
      if (editor) {
        updateDecorators(editor);
      }
    })
  );

  if (activeEditor) {
    setTimeout(() => {
      updateDecorators(activeEditor);
    }, 0);
  }
}

// this method is called when your extension is deactivated
export function deactivate(context: VSCODE.ExtensionContext) {
  //
}
