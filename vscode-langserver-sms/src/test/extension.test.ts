import { expect } from "chai";
import * as path from "path";
import * as vscode from "vscode";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("SMS Language Server Extension", () => {
  let docUri: vscode.Uri;
  let document: vscode.TextDocument | null;

  beforeEach(async () => {
    const ext = vscode.extensions.getExtension("stardog-union.vscode-langserver-sms")!;
    await ext.activate();
    docUri = vscode.Uri.file(
      path.join(__dirname, "..", "..", "fixtures", "bad", "expect-json-sql-graphql.sms")
    );
    document = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(document);
    await sleep(2000); // let server start
  });

  afterEach(() => {
    document = null;
  });

  it("receives error diagnostics from the server", () => {
    const receivedDiagnostics = vscode.languages.getDiagnostics(docUri);
    const normalizedReceivedDiagnostics = JSON.parse(JSON.stringify(receivedDiagnostics));
    expect(normalizedReceivedDiagnostics).to.eql([
      {
        severity: "Error",
        message: "Expecting: one of these possible Token sequences:\n  1. [Sql]\n  2. [Json]\n  3. [GraphQl]\n  4. [Csv]\nbut found: ''",
        range: [
          {
            line: 0,
            character: 12
          },
          {
            line: 0,
            character: 13
          }
        ],
        source: "FromClause"
      }
    ]);
  });

  it("receives hover help from the server", async () => {
    const hoverHelp = (await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      docUri,
      new vscode.Position(0, 0)
    )) as vscode.Hover[];
    const { contents } = hoverHelp[0];
    const range = hoverHelp[0].range as vscode.Range;
    expect(typeof contents[0] === 'string' ? contents[0] : contents[0].value).to.eql("```\nMappingDecl\n```");
    expect(range.start.line).to.eql(0);
    expect(range.start.character).to.eql(0);
    expect(range.end.line).to.eql(0);
    expect(range.end.character).to.eql(7);
  });

  it("provides snippets", async () => {
    docUri = vscode.Uri.file(
      path.join(__dirname, "..", "..", "fixtures", "good", "empty-mapping.sms")
    );
    document = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(document);
    await sleep(2000); // let server start

    const completions = (await vscode.commands.executeCommand(
      "vscode.executeCompletionItemProvider",
      docUri,
      new vscode.Position(0, 0)
    )) as vscode.CompletionList;
    const normalizedSuggestedCompletion = JSON.parse(JSON.stringify(completions.items[0]));
    expect(normalizedSuggestedCompletion).to.eql({
      detail: "Create a basic fill-in-the-blanks SMS2 mapping",
      documentation:
        'Inserts a basic mapping in Stardog Mapping Syntax 2 (SMS2) with tabbing functionality and content assistance. For more documentation of SMS2, check out "Help" --> "Stardog Docs".',
      insertText: {
        _tabstop: 1,
        value:
          "# A basic SMS2 mapping.\nMAPPING$0\nFROM ${1|SQL,JSON,GRAPHQL|} {\n    $2\n}\nTO {\n    $3\n}\nWHERE {\n    $4\n}\n"
      },
      label: "basicSMS2Mapping",
      kind: "Enum",
      sortText: "basicSMS2Mapping",
    });
  });
});
