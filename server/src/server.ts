import {
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
  IConnection,
  TextDocuments,
  InitializeResult,
  TextDocumentSyncKind
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { compile } from "./parser";

// Create a connection for the server. The connection uses Node's IPC as a transport
const connection: IConnection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

connection.onInitialize(
  (): InitializeResult => {
    return {
      serverInfo: {
        name: "Npm Version Server"
      },
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full
      }
    };
  }
);

function compileDocument(document: TextDocument) {
  compile(document)
    .then(decorators => {
      connection.sendNotification("decorators", {
        uri: document.uri,
        marks: decorators
      });
    })
    .catch(err => {
      connection.console.error(err);
    });
}

documents.onDidChangeContent(change => {
  connection.console.log(`on change: ${change.document.uri}`);
  compileDocument(change.document);
});

connection.onNotification((method, ...params) => {
  switch (method) {
    case "compile":
      const uri: string = params[0];
      const document = documents.get(uri);
      if (document) {
        compileDocument(document);
      }
      break;
  }
});

connection.listen();
