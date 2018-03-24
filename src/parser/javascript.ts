import {
  CallExpression,
  ImportDeclaration,
  isIdentifier,
  isStringLiteral
} from "babel-types";
import { transform } from "babel-core";
import { isValidNpmPackageName, createMark } from "../utils";
import { IMark } from "../type";
import { parse } from "babylon";
const traverse = require("@babel/traverse").default;

export function compile(code: string, filepath: string): IMark[] | void {
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
    return void 0;
  }

  const visitor: any = {
    CallExpression(p: any) {
      console.log(p);
      const node: CallExpression = p.node;
      if (isIdentifier(node.callee) && node.callee.name === "require") {
        const argvs = node.arguments;
        if (argvs.length > 1) {
          return;
        }

        const argv = argvs[0];

        if (isStringLiteral(argv) && isValidNpmPackageName(argv.value)) {
          const mark = createMark(argv.value, filepath, {
            start: argv.start,
            end: argv.end
          });
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
        const mark = createMark(node.source.value, filepath, {
          start: node.source.start,
          end: node.source.end
        });
        if (mark) {
          marks.push(mark);
        }
      }
    }
  };

  traverse(ast, visitor);

  return marks;
}
