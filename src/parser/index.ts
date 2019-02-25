import * as path from "path";
import { compile as JavascriptCompiler } from "./javascript";
import { compile as TypescriptCompiler } from "./typescript";
import { compile as VueCompiler } from "./vue";

import { IMark } from "../type";

/**
 * compile the code and return marks
 * @export
 * @param {string} code
 * @param {string} filepath
 * @returns
 */
export function compile(code: string, filepath: string): IMark[] {
  switch (path.extname(filepath)) {
    case ".js":
    case ".jsx":
    case ".mjs":
      return JavascriptCompiler(code, filepath);
    case ".ts":
    case ".tsx":
      return TypescriptCompiler(code, filepath);
    case ".vue":
      return VueCompiler(code, filepath);
    default:
      return [];
  }
}
