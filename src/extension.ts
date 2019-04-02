"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import VSCODE = require("vscode");

import { SupportLanguagesMap } from "./type";
import { compile } from "./parser/index";

const configurationNamespace = "npm-import-package-version";
const configurationFieldEnable = "enable";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: VSCODE.ExtensionContext) {
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
            .get(configurationFieldEnable);
        }
      }
    })
  );

  let activeEditor = window.activeTextEditor;

  const updateDecorators = debounce(async (editor: VSCODE.TextEditor) => {
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

    editor.setDecorations(decorationType, marks.map(v => {
      return {
        range: new Range(
          editor.document.positionAt(v.location.start),
          editor.document.positionAt(v.location.end)
        ),
        renderOptions: {
          after: {
            contentText: `@${v.version || "Not Installed"}`,
            color: "#9e9e9e"
          }
        }
      };
    }) as VSCODE.DecorationOptions[]);
  }, 500);

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
