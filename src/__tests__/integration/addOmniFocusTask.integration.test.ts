/**
 * Integration test for the add_omnifocus_task tool via an in-memory MCP server
 * This test uses the Model Context Protocol SDK's InMemoryTransport to wire up
 * a server and client in-process, with the primitive call stubbed out.
 */
import { jest } from '@jest/globals';

// Stub out the primitive implementation so we don't invoke real AppleScript
jest.unstable_mockModule('../../tools/primitives/addOmniFocusTask.js', () => ({
  addOmniFocusTask: jest.fn(async () => ({ success: true, taskId: 'task-integration' }))
}));

let McpServer: typeof import('@modelcontextprotocol/sdk/server/mcp.js').McpServer;
let Client: typeof import('@modelcontextprotocol/sdk/client/index.js').Client;
let StdioClientTransport: typeof import('@modelcontextprotocol/sdk/client/stdio.js').StdioClientTransport;
let InMemoryTransport: typeof import('@modelcontextprotocol/sdk/inMemory.js').InMemoryTransport;
let addOmniFocusTaskDef: typeof import('../../tools/definitions/addOmniFocusTask.js');

beforeAll(async () => {
  ({ McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js'));
  ({ Client } = await import('@modelcontextprotocol/sdk/client/index.js'));
  ({ StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js'));
  ({ InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js'));
  addOmniFocusTaskDef = await import('../../tools/definitions/addOmniFocusTask.js');
});

describe('add_omnifocus_task integration (in-memory)', () => {
  jest.setTimeout(30_000);
  let server: import('@modelcontextprotocol/sdk/server/mcp.js').McpServer;
  let client: import('@modelcontextprotocol/sdk/client/index.js').Client;

  beforeAll(async () => {
    // Setup MCP server and register only the add_omnifocus_task tool
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    server.tool(
      'add_omnifocus_task',
      addOmniFocusTaskDef.schema.shape,
      addOmniFocusTaskDef.handler
    );

    // Wire up in-memory transport pair
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    // Create MCP client
    client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: { tools: {}, prompts: {}, resources: {} } }
    );
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it('executes add_omnifocus_task end-to-end', async () => {
    const response: any = await client.callTool({
      name: 'add_omnifocus_task',
      arguments: {
          name: 'Integration Task',
          note: 'This is a note',
          dueDate: '2024-12-31 12:00',
          deferDate: '2024-12-31 11:00',
          flagged: true,
          estimatedMinutes: 30,
          tags: ['Me', '1'],
          projectName: 'Home'
        }
    });
    expect(response.content).toHaveLength(1);
    expect(response.content[0].text).toMatch(/Integration Task/);
  });
});
