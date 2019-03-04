"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  workspace,
  window,
  Range,
  OverviewRulerLane,
  ExtensionContext,
  TextEditor,
  DecorationOptions
} from "vscode";

const debounce = require("lodash.debounce");
import { SupportLanguagesMap } from "./type";
import { compile } from "./parser/index";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  const decorationType = window.createTextEditorDecorationType({
    overviewRulerLane: OverviewRulerLane.Right,
    after: { margin: "0 0 0 0rem" }
  });

  let activeEditor = window.activeTextEditor;

  const updateDecorators = debounce(async (editor: TextEditor) => {
    if (!editor) {
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
            contentText: `@${v.version}`,
            color: "#9e9e9e"
          }
        }
      };
    }) as DecorationOptions[]);
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
