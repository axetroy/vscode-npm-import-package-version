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
    // NOBUG: ignore error
    return [];
  }

  function delint(SourceFile: TS.SourceFile) {
    delintNode(SourceFile);

    function delintNode(node: TS.Node) {
      let moduleNode: TS.LiteralLikeNode | null = null;
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

            if (argv && ts.isStringLiteral(argv)) {
              moduleNode = argv;
            }
          }
          break;
        // import ts = require('typescript')
        case ts.SyntaxKind.ImportEqualsDeclaration:
          const ref = (node as TS.ImportEqualsDeclaration)
            .moduleReference as TS.ExternalModuleReference;

          if (ts.isStringLiteral(ref.expression)) {
            moduleNode = ref.expression;
          }
          break;
        // import * as from 'xx'
        // import 'xx'
        // import xx from 'xx'
        case ts.SyntaxKind.ImportDeclaration:
          const spec = (node as TS.ImportDeclaration).moduleSpecifier;
          if (spec && ts.isStringLiteral(spec)) {
            moduleNode = spec;
          }
          break;
        // export { window } from "vscode";
        // export * from "vscode";
        case ts.SyntaxKind.ExportDeclaration:
          const exportSpec = (node as TS.ExportDeclaration).moduleSpecifier;
          if (exportSpec && ts.isStringLiteral(exportSpec)) {
            moduleNode = exportSpec;
          }
          break;
      }

      if (moduleNode && isValidNpmPackageName(moduleNode.text)) {
        const mark = createMark(moduleNode.text, filepath, {
          start: moduleNode.pos,
          end: moduleNode.end - 1
        });
        if (mark) {
          marks.push(mark);
        }
      }

      ts.forEachChild(node, delintNode);
    }
  }

  // delint it
  delint(sourceFile);

  return marks;
}
