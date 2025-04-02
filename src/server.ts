import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';

import { dumpDatabase } from './tools/dumpDatabase.js';
const execAsync = promisify(exec);



// Create an MCP server
const server = new McpServer({
  name: "OmniFocus MCP",
  version: "1.0.0"
});


server.tool(
  "dump_database",
  {}, // No parameters needed
  async () => {
    try {
      const tasks = await dumpDatabase();

      // Format and return the tasks
      let responseText = "Found " + tasks.length + " tasks:\n\n";
      
      var displayCount = Math.min(tasks.length, 20);
      for (var i = 0; i < displayCount; i++) {
        const task = tasks[i];
        const taskName = task.name || "[No Name]";
        const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
        const dueString = "Due: " + dueDateStr;
        const flaggedString = task.flagged ? '⭐' : '';
        
        responseText += (i+1) + ". " + flaggedString + " " + taskName + " (" + dueString + ")\n";
        if (task.note && task.note.trim() !== '') {
          responseText += "   Note: " + task.note + "\n";
        }
        responseText += '\n';
      }
      
      if (tasks.length > 20) {
        responseText += "... and " + (tasks.length - 20) + " more tasks";
      }
      
      if (tasks.length === 0) {
          responseText = "Found 0 tasks. Check server logs for any errors.";
      }

      return {
        content: [{
          type: "text",
          text: responseText
        }]
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Tool execution error: ${error.message}`); 
      return {
        content: [{
          type: "text",
          text: `Error listing tasks: ${error.message}`
        }],
        isError: true
      };
    }
  }
);



// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async function() {
  try {
    console.error("Starting MCP server...");
    await server.connect(transport);
    console.error("MCP Server connected and ready to accept commands from Claude");
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();