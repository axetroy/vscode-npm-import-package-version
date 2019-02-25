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
import * as fs from "fs-extra";

import { compile } from "./parser/index";
import { IMark } from "./type";

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

  const updateDecorators = debounce(async (editor: TextEditor) => {
    if (!editor || !activeLanguages[editor.document.languageId.toLowerCase()]) {
      return;
    }

    const document = editor.document;

    // do not parse min file
    if (/\min\.js%/.test(document.fileName)) {
      return;
    }

    let marks: IMark[] = [];

    try {
      const stat = await fs.stat(document.fileName);
      // do not parse file which over 1M
      if (stat.size > 1024 * 1024 * 1) {
        window.showWarningMessage(
          "This file too large. will not show import version!"
        );
        return;
      }
      marks = compile(document.getText(), document.fileName);
    } catch (err) {
      //
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

  if (activeEditor) {
    updateDecorators(activeEditor);
  }
}

// this method is called when your extension is deactivated
export function deactivate(context: ExtensionContext) {
  //
}
