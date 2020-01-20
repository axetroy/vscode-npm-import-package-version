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

const configurationNamespace = "npm-import-package-version";

process.title = "Npm Import Package Version Server"

// The example settings
interface ISettings {
  enable: boolean;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ISettings = { enable: true };
let globalSettings: ISettings = defaultSettings;

// Create a connection for the server. The connection uses Node's IPC as a transport
const connection: IConnection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents = new TextDocuments(TextDocument);

connection.onInitialize(
  (): InitializeResult => {
    return {
      serverInfo: {
        name: "Npm Version Server"
      },
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Full
        }
      }
    };
  }
);

connection.onInitialized(() => {
  connection.console.log("server start");
});

function compileDocument(document: TextDocument) {
  if (!globalSettings.enable) {
    return;
  }
  connection.console.log(`compile: ${document.uri}`);
  compile(document)
    .then(decorators => {
      connection.sendNotification("decorators", {
        uri: document.uri,
        marks: decorators
      });
    })
    .catch(err => {
      connection.console.error(err.message);
      connection.console.error(err.stack);
    });
}

connection.onDidChangeConfiguration(change => {
  const s = (change.settings[configurationNamespace] ||
    defaultSettings) as ISettings;

  const docs = documents.all();
  const enableChange = s.enable !== globalSettings.enable;

  globalSettings = { ...globalSettings, ...s };

  if (enableChange) {
    if (s.enable) {
      for (const doc of docs) {
        compileDocument(doc);
      }
    } else {
      for (const doc of docs) {
        connection.sendNotification("decorators", {
          uri: doc.uri,
          marks: []
        });
      }
    }
  }
});

documents.onDidChangeContent(change => {
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

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
