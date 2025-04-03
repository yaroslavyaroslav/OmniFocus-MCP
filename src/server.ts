import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

import { dumpDatabase } from './tools/dumpDatabase.js';
import { addOmniFocusTask, AddOmniFocusTaskParams } from './tools/addOmniFocusTask.js';
import { addProject, AddProjectParams } from './tools/addProject.js';
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
      
      // Display all tasks instead of just the first 20
      for (var i = 0; i < tasks.length; i++) {
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