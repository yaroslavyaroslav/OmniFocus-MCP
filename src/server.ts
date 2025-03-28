import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "Local Development Server",
  version: "1.0.0"
});

// Example resource: Get system information
server.resource(
  "system-info",
  "system://info",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        platform: process.platform,
        nodeVersion: process.version,
        cwd: process.cwd()
      }, null, 2)
    }]
  })
);

// Example resource: Get file contents
server.resource(
  "file-contents",
  new ResourceTemplate("file://{path}", { list: undefined }),
  async (uri, { path }) => {
    try {
      const fs = await import('fs/promises');
      const contents = await fs.readFile(path as string, 'utf-8');
      return {
        contents: [{
          uri: uri.href,
          text: contents
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        contents: [{
          uri: uri.href,
          text: `Error reading file: ${errorMessage}`
        }]
      };
    }
  }
);

// Example tool: List directory contents
server.tool(
  "list-directory",
  { path: z.string() },
  async ({ path }) => {
    try {
      const fs = await import('fs/promises');
      const entries = await fs.readdir(path, { withFileTypes: true });
      const contents = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file'
      }));
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(contents, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error listing directory: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Example tool: Execute shell command
server.tool(
  "execute-command",
  { command: z.string() },
  async ({ command }) => {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const { stdout, stderr } = await execAsync(command, { cwd: process.cwd() });
      
      return {
        content: [{
          type: "text",
          text: `stdout:\n${stdout}\n\nstderr:\n${stderr}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error executing command: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Example prompt: Code review template
server.prompt(
  "review-code",
  { code: z.string(), language: z.string().optional() },
  ({ code, language }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please review this ${language || 'code'}:\n\n${code}`
      }
    }]
  })
);

// Start the server using stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("MCP Server started and ready to accept connections..."); 