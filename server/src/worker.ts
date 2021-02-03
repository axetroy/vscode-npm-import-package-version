import * as workerpool from "workerpool";
import { TextDocument } from "vscode-languageserver-textdocument";
import { compile } from "./parser";

// a deliberately inefficient implementation of the fibonacci sequence
function parse(
  uri: string,
  languageId: string,
  version: number,
  content: string
) {
  return compile(TextDocument.create(uri, languageId, version, content));
}

// create a worker and register public functions
workerpool.worker({
  parse: parse
});
