import { isValidNpmPackageName, createMark } from "../utils";
import { IMark } from "../type";
import BabelParser = require("@babel/parser");
import BabelTypes = require("@babel/types");

export function compile(code: string, filepath: string): IMark[] {
  const parser: typeof BabelParser = require("@babel/parser");
  const babelTypes: typeof BabelTypes = require("@babel/types");
  const traverse = require("@babel/traverse").default;

  const marks: IMark[] = [];
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "flow",
        "flowComments",
        "doExpressions",
        "objectRestSpread",
        "decorators-legacy",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "asyncGenerators",
        "functionBind",
        "functionSent",
        "dynamicImport",
        "numericSeparator",
        "optionalChaining",
        "importMeta",
        "bigInt",
        "optionalCatchBinding",
        "throwExpressions",
        "nullishCoalescingOperator"
      ]
    });
  } catch (err) {
    // NOBUG: ignore error
    return [];
  }

  function appendMark(node: BabelTypes.StringLiteral) {
    if (!isValidNpmPackageName(node.value)) {
      return;
    }
    const mark = createMark(node.value, filepath, {
      start: node.start || 0,
      end: (node.end || 0) - 1
    });
    if (mark) {
      marks.push(mark);
    }
  }

  const visitor: any = {
    // require('xxx')
    // import('xxx')
    CallExpression(p: any) {
      const node: BabelTypes.CallExpression = p.node;
      const callee = node.callee;
      const isRequire =
        babelTypes.isIdentifier(callee) && callee.name === "require";
      const isDynamicImport = babelTypes.isImport(callee);
      if (isRequire || isDynamicImport) {
        const args = node.arguments as BabelTypes.StringLiteral[];
        if (args.length > 1) {
          return;
        }

        const argv = args[0];

        if (babelTypes.isStringLiteral(argv)) {
          appendMark(argv);
        }
      }
    },
    // import * as from 'xx'
    // import 'xx'
    // import xx from 'xx'
    ImportDeclaration(p: any) {
      const node: BabelTypes.ImportDeclaration = p.node;
      appendMark(node.source);
    },
    // export { window } from "xxx";
    ExportNamedDeclaration(p: any) {
      const node: BabelTypes.ExportNamedDeclaration = p.node;
      if (node.source) {
        appendMark(node.source);
      }
    },
    // export * from "xxx";
    ExportAllDeclaration(p: any) {
      const node: BabelTypes.ExportAllDeclaration = p.node;
      appendMark(node.source);
    }
  };

  traverse(ast, visitor);

  return marks;
}
