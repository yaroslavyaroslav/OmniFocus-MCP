import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';

import { dumpDatabase } from './tools/dumpDatabase.js';
import { addOmniFocusTask, AddOmniFocusTaskParams } from './tools/primitives/addOmniFocusTask.js';
import { addProject, AddProjectParams } from './tools/primitives/addProject.js';
const execAsync = promisify(exec);

// Define a type for OmniFocus data
interface OmniFocusData {
  exportDate: string;
  tasks: any[];
  projects?: Record<string, any>;
  folders?: Record<string, any>;
  tags?: Record<string, any>;
}

// Global variable to store the latest OmniFocus data
let latestOmniFocusData: OmniFocusData | null = null;

// Choose a very unusual port number to minimize conflict chance
const PORT = 54767;

// Create an HTTP server to receive data from OmniFocus
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ? parseUrl(req.url, true) : { pathname: null };
  
  // Handle requests to /data endpoint
  if (url.pathname === '/data' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        console.log('Received data from OmniFocus');
        latestOmniFocusData = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error processing OmniFocus data:', errorMessage);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: errorMessage }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Improved server startup with error handling
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Attempting to close existing connection...`);
    
    // Try to forcefully release the port using the 'kill' command to find and terminate 
    // the process using this port
    exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Failed to release port ${PORT}:`, err);
        console.error(`Please manually terminate the process using port ${PORT} and restart.`);
        process.exit(1);
      } else {
        console.error(`Successfully released port ${PORT}, restarting server...`);
        // Wait a moment for the port to be fully released
        setTimeout(() => {
          httpServer.listen(PORT, () => {
            console.error(`HTTP server listening on port ${PORT} for OmniFocus data`);
          });
        }, 1000);
      }
    });
  } else {
    console.error(`HTTP server error:`, err);
    process.exit(1);
  }
});

// Start the HTTP server
httpServer.listen(PORT, () => {
  console.error(`HTTP server listening on port ${PORT} for OmniFocus data`);
});

// Implement graceful shutdown
const gracefulShutdown = () => {
  console.error('Shutting down gracefully...');
  httpServer.close(() => {
    console.error('HTTP server closed.');
    process.exit(0);
  });
  
  // Force close if it takes too long
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 5000);
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGHUP', gracefulShutdown);

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
      
      // Display all tasks instead of just the first 20
      for (var i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const taskName = task.name || "[No Name]";
        const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
        const dueString = "Due: " + dueDateStr;
        const flaggedString = task.flagged ? '⭐' : '';
        const repeatingString = task.isRepeating ? '🔄' : '';
        
        responseText += (i+1) + ". " + flaggedString + repeatingString + " " + taskName + " (" + dueString + ")\n";
        
        if (task.note && task.note.trim() !== '') {
          responseText += "   Note: " + task.note + "\n";
        }
        
        // Add repetition information if task is repeating
        if (task.isRepeating && task.repetitionRule) {
          let repetitionInfo = "   Repeats: " + task.repetitionRule;
          if (task.repetitionMethod) {
            repetitionInfo += " (" + task.repetitionMethod + " repetition)";
          }
          responseText += repetitionInfo + "\n";
        }
        
        responseText += '\n';
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

// Define Zod schema for add_omnifocus_task parameters
const AddOmniFocusTaskSchema = z.object({
  name: z.string().describe("The name of the task"),
  note: z.string().optional().describe("Additional notes for the task"),
  dueDate: z.string().optional().describe("The due date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  deferDate: z.string().optional().describe("The defer date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  flagged: z.boolean().optional().describe("Whether the task is flagged or not"),
  estimatedMinutes: z.number().optional().describe("Estimated time to complete the task, in minutes"),
  tags: z.array(z.string()).optional().describe("Tags to assign to the task"),
  projectName: z.string().optional().describe("The name of the project to add the task to (will add to inbox if not specified)")
});

server.tool(
  "add_omnifocus_task",
  AddOmniFocusTaskSchema.shape,
  async (params, extra) => {
    try {
      // Call the addOmniFocusTask function 
      const result = await addOmniFocusTask(params as AddOmniFocusTaskParams);
      
      if (result.success) {
        // Task was added successfully
        let locationText = params.projectName 
          ? `in project "${params.projectName}"` 
          : "in your inbox";
          
        let tagText = params.tags && params.tags.length > 0
          ? ` with tags: ${params.tags.join(', ')}`
          : "";
          
        let dueDateText = params.dueDate
          ? ` due on ${new Date(params.dueDate).toLocaleDateString()}`
          : "";
          
        return {
          content: [{
            type: "text",
            text: `✅ Task "${params.name}" created successfully ${locationText}${dueDateText}${tagText}.`
          }]
        };
      } else {
        // Task creation failed
        return {
          content: [{
            type: "text",
            text: `Failed to create task: ${result.error}`
          }],
          isError: true
        };
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Tool execution error: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error creating task: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Define Zod schema for add_project parameters
const AddProjectSchema = z.object({
  name: z.string().describe("The name of the project"),
  note: z.string().optional().describe("Additional notes for the project"),
  dueDate: z.string().optional().describe("The due date of the project in ISO format (YYYY-MM-DD or full ISO date)"),
  deferDate: z.string().optional().describe("The defer date of the project in ISO format (YYYY-MM-DD or full ISO date)"),
  flagged: z.boolean().optional().describe("Whether the project is flagged or not"),
  estimatedMinutes: z.number().optional().describe("Estimated time to complete the project, in minutes"),
  tags: z.array(z.string()).optional().describe("Tags to assign to the project"),
  folderName: z.string().optional().describe("The name of the folder to add the project to (will add to root if not specified)"),
  sequential: z.boolean().optional().describe("Whether tasks in the project should be sequential (default: false)")
});

server.tool(
  "add_project",
  AddProjectSchema.shape,
  async (params, extra) => {
    try {
      // Call the addProject function 
      const result = await addProject(params as AddProjectParams);
      
      if (result.success) {
        // Project was added successfully
        let locationText = params.folderName 
          ? `in folder "${params.folderName}"` 
          : "at the root level";
          
        let tagText = params.tags && params.tags.length > 0
          ? ` with tags: ${params.tags.join(', ')}`
          : "";
          
        let dueDateText = params.dueDate
          ? ` due on ${new Date(params.dueDate).toLocaleDateString()}`
          : "";
          
        let sequentialText = params.sequential
          ? " (sequential)"
          : " (parallel)";
          
        return {
          content: [{
            type: "text",
            text: `✅ Project "${params.name}" created successfully ${locationText}${dueDateText}${tagText}${sequentialText}.`
          }]
        };
      } else {
        // Project creation failed
        return {
          content: [{
            type: "text",
            text: `Failed to create project: ${result.error}`
          }],
          isError: true
        };
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Tool execution error: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error creating project: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Make the latestOmniFocusData available to other modules
export function getLatestOmniFocusData(): OmniFocusData | null {
  return latestOmniFocusData;
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

// For a cleaner shutdown if the process is terminated
process.on('exit', () => {
  console.error('Process exiting');
  httpServer.close();
});