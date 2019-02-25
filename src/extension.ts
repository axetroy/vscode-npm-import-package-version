"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  workspace,
  window,
  Range,
  OverviewRulerLane,
  ExtensionContext,
  TextEditor
} from "vscode";

const debounce = require("lodash.debounce");

import { compile } from "./parser/index";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  const decorationType = window.createTextEditorDecorationType({
    overviewRulerLane: OverviewRulerLane.Right,
    after: { margin: "0 0 0 0rem" }
  });

  let activeEditor = window.activeTextEditor;

  const activeLanguages: any = {
    javascript: true,
    javascriptreact: true,
    typescript: true,
    typescriptreact: true,
    vue: true
  };

  workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      updateDecorators(activeEditor);
    }
  });

  window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      updateDecorators(editor);
    }
  });

  const updateDecorators = debounce((editor: TextEditor) => {
    if (!editor || !activeLanguages[editor.document.languageId.toLowerCase()]) {
      return;
    }

    const document = editor.document;

    const marks = compile(document.getText(), document.fileName);

    if (!marks || !marks.length) {
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
              contentText: `@${version}`,
              color: "#9e9e9e"
            }
          }
        };
      })
    );
  }, 500);

  if (activeEditor) {
    updateDecorators(activeEditor);
  }
}

// this method is called when your extension is deactivated
export function deactivate(context: ExtensionContext) {
  //
}
