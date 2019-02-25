import {
  CallExpression,
  ImportDeclaration,
  isIdentifier,
  isStringLiteral
} from "babel-types";
import { isValidNpmPackageName, createMark } from "../utils";
import { IMark } from "../type";
import { parse } from "babylon";
const traverse = require("@babel/traverse").default;

export function compile(code: string, filepath: string): IMark[] {
  const marks: IMark[] = [];
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "flow",
        "classConstructorCall",
        "doExpressions",
        "objectRestSpread",
        "decorators",
        "classProperties",
        "exportExtensions",
        "asyncGenerators",
        "functionBind",
        "functionSent",
        "dynamicImport"
      ]
    });
  } catch (err) {
    return []
  }

  const visitor: any = {
    CallExpression(p: any) {
      const node: CallExpression = p.node;
      if (isIdentifier(node.callee) && node.callee.name === "require") {
        const args = node.arguments;
        if (args.length > 1) {
          return;
        }

        const argv = args[0];

        if (isStringLiteral(argv) && isValidNpmPackageName(argv.value)) {
          const mark = createMark(
            argv.value,
            filepath,
            {
              start: argv.start,
              end: argv.end - 1
            },
            "require"
          );
          if (mark) {
            marks.push(mark);
          }
        }
      }
    },
    ImportDeclaration(p: any) {
      const node: ImportDeclaration = p.node;
      if (
        isStringLiteral(node.source) &&
        isValidNpmPackageName(node.source.value)
      ) {
        const mark = createMark(
          node.source.value,
          filepath,
          {
            start: node.source.start,
            end: node.source.end - 1
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
