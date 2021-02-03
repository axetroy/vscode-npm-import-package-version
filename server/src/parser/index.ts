import { TextDocument } from "vscode-languageserver-textdocument";
import { fileURLToPath } from "url";
import * as os from "os";
import { compile as JavascriptCompiler } from "./javascript";
import { compile as TypescriptCompiler } from "./typescript";
import { compile as VueCompiler } from "./vue";
import { IMark, SupportLanguages } from "../type";

const oneMByte = 1024 * 1024 * 1;

/**
 * compile the code and return marks
 * @param document
 */
export async function compile(document: TextDocument): Promise<IMark[]> {
  let filepath = fileURLToPath(document.uri);

  if (os.platform() === "win32") {
    filepath = filepath
      .replace(/^\/([a-z])(.*)/, (_, p1: string, p2: string) => {
        return p1.toUpperCase() + p2;
      })
      .replace(/\//g, "\\");
  }

  const fileText = document.getText();
  // do not parse min file
  if (/.*\.\min\.js$/.test(filepath)) {
    return [];
  }

  if (fileText.length > oneMByte) {
    return [];
  }

  const fileSize = Buffer.from(fileText).length;

  // do not parse file which over 1M
  if (fileSize > oneMByte) {
    return [];
  }
  // less then 50 line and file size over 50KB
  else if (document.lineCount < 50 && fileSize > 1024 * 50) {
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
