import * as fs from "fs-extra";
import { TextDocument, window } from "vscode";
import { compile as JavascriptCompiler } from "./javascript";
import { compile as TypescriptCompiler } from "./typescript";
import { compile as VueCompiler } from "./vue";

import { IMark } from "../type";

/**
 * compile the code and return marks
 * @param document
 */
export async function compile(document: TextDocument): Promise<IMark[]> {
  try {
    const stat = await fs.stat(document.fileName);
    // do not parse file which over 1M
    if (stat.size > 1024 * 1024 * 1) {
      window.showWarningMessage(
        "This file too large. will not show import version!"
      );
      return [];
    }
  } catch (err) {
    // ignore error
    return [];
  }
  const code = document.getText();
  const filepath = document.fileName;
  switch (document.languageId.toLowerCase()) {
    case "javascript":
    case "javascriptreact":
      return JavascriptCompiler(code, filepath);
    case "typescript":
    case "typescriptreact":
      return TypescriptCompiler(code, filepath);
    case "vue":
      return VueCompiler(code, filepath);
    default:
      return [];
  }
}
