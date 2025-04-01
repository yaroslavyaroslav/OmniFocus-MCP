import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// Task interface
interface OmnifocusTask {
  id: string;
  name: string;
  flagged: boolean;
  dueDate: string | null;
  note: string;
}

// Create an MCP server
const server = new McpServer({
  name: "OmniFocus Tasks",
  version: "1.0.0"
});

// Add a tool to list tasks
server.tool(
  "listTasks",
  {}, // No parameters needed
  async () => {
    try {
      // Create a script that directly accesses the OmniFocus database
      const accessScript = `
        function run(argv) {
          try {
            // Get the OmniFocus application and document
            const app = Application('OmniFocus');
            
            // Get the default document
            const doc = app.defaultDocument;
            
            // Access OmniFocus tasks from the database
            const tasks = [];
            
            // Get all tasks with a reasonable limit
            let count = 0;
            const maxTasks = 5000; // Lower task limit for simpler output
            
            // Get all tasks from the database
            const allTasks = doc.flattenedTasks();
            
            // Iterate through tasks
            allTasks.forEach(function(task) {
              // Skip completed tasks and limit total count
              if (count >= maxTasks) return;
              if (task.completed()) return;
              
              // Only include essential info to keep payload small
              tasks.push({
                id: task.id(),
                name: task.name(),
                flagged: task.flagged(),
                dueDate: task.dueDate() ? task.dueDate().toISOString() : null,
                note: task.note() || ''
              });
              
              count++;
            });
            
            // Return the tasks directly
            return JSON.stringify(tasks);
          } catch(error) {
            console.log("Script error: " + error);
            return JSON.stringify([]);
          }
        }
      `;

      // Execute the script in OmniFocus
      const tasks = await executeOmniFocusScript(accessScript);

      // Format and return the tasks
      let responseText = `Found ${tasks.length} active tasks in OmniFocus:\n\n`;
      
      // Add each task in a simple format
      for (let i = 0; i < Math.min(tasks.length, 20); i++) {
        const task = tasks[i];
        const dueString = task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date';
        const flaggedString = task.flagged ? '⭐' : '';
        
        responseText += `${i+1}. ${flaggedString} ${task.name} (${dueString})\n`;
        if (task.note && task.note.trim() !== '') {
          responseText += `   Note: ${task.note}\n`;
        }
        responseText += '\n';
      }
      
      if (tasks.length > 20) {
        responseText += `... and ${tasks.length - 20} more tasks`;
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

// Helper function to execute OmniFocus scripts
async function executeOmniFocusScript(script: string): Promise<any[]> {
  try {
    // Write the script to a temporary file in the system temp directory
    const tempFile = join(tmpdir(), `omnifocus_script_${Date.now()}.js`);
    
    // Write the script to the temporary file
    writeFileSync(tempFile, script);
    
    // Execute the script using osascript
    const { stdout } = await execAsync(`osascript -l JavaScript ${tempFile}`);
    
    // Clean up the temporary file
    unlinkSync(tempFile);
    
    // Parse the output as JSON
    try {
      return JSON.parse(stdout);
    } catch (e) {
      console.error('Failed to parse script output:', e);
      return [];
    }
  } catch (error) {
    console.error('Failed to execute OmniFocus script:', error);
    throw error;
  }
}

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