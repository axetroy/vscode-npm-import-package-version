import {
  createConnection,
  TextDocuments,
  InitializeResult,
  TextDocumentSyncKind,
  ProposedFeatures
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as workerpool from "workerpool";
import { IMark } from "./type";

const configurationNamespace = "npm-import-package-version";

process.title = "Npm Import Package Version Server";

// create a worker pool using an external worker script
const pool = workerpool.pool(__dirname + "/worker.js", {
  minWorkers: 1
});

interface ISettings {
  enable: boolean;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ISettings = { enable: true };
let globalSettings: ISettings = defaultSettings;

// Create a connection for the server. The connection uses Node's IPC as a transport
const connection = createConnection(ProposedFeatures.all);

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
  pool
    .exec("parse", [
      document.uri,
      document.languageId,
      document.version,
      document.getText()
    ])
    .then(function(decorators: IMark[]) {
      connection.sendNotification("decorators", {
        uri: document.uri,
        marks: decorators
      });
    })
    .catch(function(err: any) {
      if (err instanceof Error) {
        connection.console.error(err.message);
        err.stack && connection.console.error(err.stack);
      } else {
        connection.console.error(JSON.stringify(err));
      }
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

connection.onNotification((method, params) => {
  switch (method) {
    case "compile":
      const target = params as { uri: string };
      const document = documents.get(target.uri);
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

connection.onExit(() => {
  pool.terminate();
});
