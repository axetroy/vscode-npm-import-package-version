// import * as ts from "typescript"
import TS = require("typescript");
import { IMark } from "../type";
import { createMark, isValidNpmPackageName } from "../utils";

export function compile(code: string, filepath: string): IMark[] {
  const ts: typeof TS = require("typescript");
  const marks: IMark[] = [];
  let sourceFile;
  try {
    // Parse a file
    sourceFile = ts.createSourceFile(
      filepath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
  } catch (err) {
    return [];
  }

  function delint(SourceFile: TS.SourceFile) {
    delintNode(SourceFile);

    function delintNode(node: TS.Node) {
      switch (node.kind) {
        // require('xxx')
        // import('xxx')
        case ts.SyntaxKind.CallExpression:
          const expression = (node as TS.CallExpression).expression;
          const args = (node as TS.CallExpression).arguments;
          const isRequire =
            ts.isIdentifier(expression) && expression.text === "require";
          const isDynamicImport =
            expression.kind === ts.SyntaxKind.ImportKeyword;
          if (isRequire || isDynamicImport) {
            const argv = args[0] as TS.StringLiteral;
            if (
              argv &&
              ts.isStringLiteral(argv) &&
              isValidNpmPackageName(argv.text)
            ) {
              const mark = createMark(
                argv.text,
                filepath,
                {
                  start: argv.pos,
                  end: argv.end - 1
                },
                isRequire ? "require" : "import"
              );

              if (mark) {
                marks.push(mark);
              }
            }
          }
          break;
        // import ts = require('typescript')
        case ts.SyntaxKind.ImportEqualsDeclaration:
          const ref = (node as TS.ImportEqualsDeclaration)
            .moduleReference as TS.ExternalModuleReference;

          //
          if (
            ts.isStringLiteral(ref.expression) &&
            isValidNpmPackageName(ref.expression.text)
          ) {
            const mark = createMark(
              ref.expression.text,
              filepath,
              {
                start: ref.expression.pos,
                end: ref.expression.end - 1
              },
              "import"
            );

            if (mark) {
              marks.push(mark);
            }
          }
          break;
        // import * as from 'xx'
        // import 'xx'
        // import xx from 'xx'
        case ts.SyntaxKind.ImportDeclaration:
          const spec = (node as TS.ImportDeclaration).moduleSpecifier;
          if (
            spec &&
            ts.isStringLiteral(spec) &&
            isValidNpmPackageName(spec.text)
          ) {
            const mark = createMark(
              spec.text,
              filepath,
              {
                start: spec.pos,
                end: spec.end - 1
              },
              "import"
            );

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
