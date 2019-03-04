import * as fs from "fs-extra";
import { TextDocument } from "vscode";
import { compile as JavascriptCompiler } from "./javascript";
import { compile as TypescriptCompiler } from "./typescript";
import { compile as VueCompiler } from "./vue";

import { IMark, SupportLanguages } from "../type";

/**
 * compile the code and return marks
 * @param document
 */
export async function compile(document: TextDocument): Promise<IMark[]> {
  const filepath = document.fileName;
  const fileText = document.getText();
  // do not parse min file
  if (/.*\.\min\.js$/.test(filepath)) {
    return [];
  }

  let fileSize = 0;

  try {
    const stat = await fs.stat(filepath);
    fileSize = stat.size;
  } catch (err) {
    // ignore error
    return [];
  }

  // do not parse file which over 1M
  if (fileSize > 1024 * 1024 * 1) {
    return [];
  }
  // less then 20 line and file size over 100KB
  else if (document.lineCount < 20 && fileSize > 1024 * 100) {
    return [];
  }
  // over 10000 line and file size over 10KB
  else if (document.lineCount > 10000 && fileSize > 1024 * 10) {
    return [];
  }

  switch (document.languageId) {
    case SupportLanguages.js:
    case SupportLanguages.jsx:
      return JavascriptCompiler(fileText, filepath);
    case SupportLanguages.ts:
    case SupportLanguages.tsx:
      return TypescriptCompiler(fileText, filepath);
    case SupportLanguages.vue:
      return VueCompiler(fileText, filepath);
    default:
      return [];
  }
}
