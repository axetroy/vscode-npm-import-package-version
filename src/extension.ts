"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  workspace,
  window,
  Range,
  Position,
  OverviewRulerLane,
  ExtensionContext,
  TextEditor
} from "vscode";

const debounce = require("lodash.debounce");

import { compile } from "./parser/index";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  const decorationType = window.createTextEditorDecorationType({
    overviewRulerColor: "blue",
    overviewRulerLane: OverviewRulerLane.Right,
    after: { margin: "0 0 0 0.5rem" }
  });

  let activeEditor = window.activeTextEditor;

  const activeLanguages: any = {
    javascript: true,
    javascriptreact: true,
    typescript: true,
    typescriptreact: true
  };

  workspace.onDidChangeTextDocument(
    event => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorators(activeEditor);
      }
    },
    null,
    context.subscriptions
  );

  window.onDidChangeActiveTextEditor(
    editor => {
      activeEditor = editor;
      if (editor) {
        updateDecorators(editor);
      }
    },
    null,
    context.subscriptions
  );

  const updateDecorators = debounce((editor: TextEditor) => {
    if (!editor || !activeLanguages[editor.document.languageId]) {
      return;
    }

    const document = editor.document;

    const marks = compile(document.getText(), document.fileName);

    if (!marks) {
      return;
    }

    editor.setDecorations(
      decorationType,
      marks.map(({ location, name, version }) => {
        return {
          range: new Range(
            editor.document.positionAt(location.start),
            editor.document.positionAt(location.end)
          ),
          renderOptions: {
            after: {
              contentText: `v${version}`,
              color: "#9e9e9e"
            }
          }
        };
      })
    );
  }, 200);

  if (activeEditor) {
    updateDecorators(activeEditor);
  }
}

// this method is called when your extension is deactivated
export async function deactivate(context: ExtensionContext) {
  //
}
