import {
  CallExpression,
  ImportDeclaration,
  isIdentifier,
  isStringLiteral,
  isImport,
  StringLiteral
} from "@babel/types";
import { isValidNpmPackageName, createMark } from "../utils";
import { IMark } from "../type";
import * as parser from "@babel/parser";
const traverse = require("@babel/traverse").default;

export function compile(code: string, filepath: string): IMark[] {
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
    return [];
  }

  const visitor: any = {
    CallExpression(p: any) {
      const node: CallExpression = p.node;
      const callee = node.callee;
      const isRequire = isIdentifier(callee) && callee.name === "require";
      const isDynamicImport = isImport(callee);
      if (isRequire || isDynamicImport) {
        const args = node.arguments as StringLiteral[];
        if (args.length > 1) {
          return;
        }

        const argv = args[0];

        if (isStringLiteral(argv) && isValidNpmPackageName(argv.value)) {
          const mark = createMark(
            argv.value,
            filepath,
            {
              start: argv.start || 0,
              end: (argv.end || 0) - 1
            },
            (callee as any).name
          );
          if (mark) {
            marks.push(mark);
          }
        }
      }
    },
    ImportDeclaration(p: any) {
      const node: ImportDeclaration = p.node;
      const argv = node.source;
      if (isStringLiteral(argv) && isValidNpmPackageName(argv.value)) {
        const mark = createMark(
          argv.value,
          filepath,
          {
            start: argv.start || 0,
            end: (argv.end || 0) - 1
          },
          "import"
        );
        if (mark) {
          marks.push(mark);
        }
      }
    }
  };

  traverse(ast, visitor);

  return marks;
}
