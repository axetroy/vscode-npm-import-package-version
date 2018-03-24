import * as ts from "typescript";

import { IMark } from "../type";
import { createMark, isValidNpmPackageName } from "../utils";

export function compile(code: string, filepath: string): IMark[] | void {
  const marks: IMark[] = [];
  let sourceFile;
  try {
    // Parse a file
    sourceFile = ts.createSourceFile(
      "test.ts",
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
  } catch (err) {
    return void 0;
  }

  function delint(SourceFile: ts.SourceFile) {
    delintNode(SourceFile);

    function delintNode(node: ts.Node) {
      switch (node.kind) {
        case ts.SyntaxKind.CallExpression:
          const expression = (node as ts.CallExpression).expression;
          const argvs = (node as ts.CallExpression).arguments;
          if (ts.isIdentifier(expression) && expression.text === "require") {
            const argv = argvs[0] as ts.StringLiteral;
            if (ts.isStringLiteral(argv) && isValidNpmPackageName(argv.text)) {
              const mark = createMark(argv.text, filepath, {
                start: node.pos - 1,
                end: node.end - 1
              });

              if (mark) {
                marks.push(mark);
              }
            }
          }
          break;
        case ts.SyntaxKind.ImportDeclaration:
          const spec = (node as ts.ImportDeclaration).moduleSpecifier;
          if (ts.isStringLiteral(spec) && isValidNpmPackageName(spec.text)) {
            const mark = createMark(spec.text, filepath, {
              start: node.pos - 1,
              end: node.end - 1
            });

            if (mark) {
              marks.push(mark);
            }
          }
          break;
      }

      ts.forEachChild(node, delintNode);
    }
  }

  // delint it
  delint(sourceFile);

  return marks;
}
