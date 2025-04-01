import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { OmnifocusTask } from './types';
const execAsync = promisify(exec);



// Create an MCP server
const server = new McpServer({
  name: "OmniFocus MCP",
  version: "1.0.0"
});

// server.tool(
//   "listTasks",
//   {}, // No parameters needed
//   async () => {
//     try {
//       // Create a script that directly accesses the OmniFocus database
//       const accessScript = `
//       function run(argv) {
//         try {
//           var app = Application('OmniFocus');
//           var doc = app.defaultDocument;
//           var taskSchema = {
//             id: null,
//             name: 'unnamed task', // Default name
//             note: '',
//             flagged: false,
//             dueDate: null,
//             deferDate: null,
//             estimatedMinutes: null,
//             containingProjectName: null, 
//             containingProjectId: null
//           };
          
//           var allTasks = doc.flattenedTasks();
//           var tasks = [];
//           var taskLimit = 50;
//           var taskCount = 0;
          
//           console.log("Starting to process tasks... (" + allTasks.length + " total)"); // Log to stderr
          
//           for (var i = 0; i < allTasks.length && taskCount < taskLimit; i++) {
//             var taskObj = Object.assign({}, taskSchema);
//             var taskNameForError = 'Unknown (index ' + i + ')';
//             var task = null; // Declare task variable outside the initial try

//             try {
//               // === STEP 1: Try accessing the task object itself ===
//               try {
//                   task = allTasks[i];
//                   if (task === null || typeof task === 'undefined') {
//                       console.log("Task at index " + i + " is null or undefined.");
//                       continue; // Skip this iteration
//                   }
//                   // Optional: Try a basic check immediately after access
//                   // console.log("Accessed task at index " + i + ", type: " + typeof task + ", id attempt: " + task.id());
//               } catch (e) {
//                   console.log("!!! CRITICAL ERROR accessing allTasks[" + i + "]: " + e);
//                   continue; // Skip this task if we can't even access it
//               }

//               // === STEP 2: Try getting the name ===
//               try {
//                   taskNameForError = task.name();
//                   if (taskNameForError == null || taskNameForError === '') { 
//                       taskNameForError = 'Unnamed task (index ' + i + ')'; 
//                   }
//                   taskObj.name = taskNameForError; // Assign successfully retrieved or default name
//               } catch (e) {
//                   console.log("Error getting name for task at index " + i + ": " + e); // Log to stderr
//                   // Keep default name 'unnamed task' from schema
//               }

//               // === STEP 3: Try checking completion status ===
//               var isCompleted = false;
//               try {
//                   isCompleted = task.completed();
//                   if (isCompleted) {
//                       // console.log("Skipping completed task: " + taskNameForError); // Reduce noise
//                       continue;
//                   }
//               } catch (e) {
//                   console.log("Error checking completion status for task '" + taskNameForError + "': " + e); // Log to stderr
//                   // Decide whether to skip or proceed with partial data
//                   // Let's try proceeding for now, maybe other fields work
//                   // continue; 
//               }
              
//               // === STEP 4: Process remaining properties with individual try-catch ===
//               try {
//                 taskObj.id = task.id();
//               } catch (e) {
//                 console.log("Error getting id for task '" + taskNameForError + "': " + e); // Log to stderr
//               }
              
//               try {
//                 var noteContent = task.note();
//                 taskObj.note = noteContent || '';
//               } catch (e) {
//                 console.log("Error getting note for task '" + taskNameForError + "': " + e); // Log to stderr
//               }
              
//               try {
//                 taskObj.flagged = task.flagged();
//               } catch (e) {
//                 console.log("Error getting flagged status for task '" + taskNameForError + "': " + e); // Log to stderr
//               }
              
//               try {
//                 var dDate = task.dueDate();
//                 if (dDate) {
//                   taskObj.dueDate = dDate.toISOString();
//                 }
//               } catch (e) {
//                 console.log("Error getting/converting dueDate for task '" + taskNameForError + "': " + e); // Log to stderr
//               }
              
//               try {
//                 var defDate = task.deferDate();
//                 if (defDate) {
//                   taskObj.deferDate = defDate.toISOString();
//                 }
//               } catch (e) {
//                 console.log("Error getting/converting deferDate for task '" + taskNameForError + "': " + e); // Log to stderr
//               }
              
//               try {
//                   taskObj.estimatedMinutes = task.estimatedMinutes();
//               } catch (e) {
//                   console.log("Error getting estimatedMinutes for task '" + taskNameForError + "': " + e); // Log to stderr
//               }
              
//               try {
//                 var project = task.containingProject();
//                 if (project) {
//                     try {
//                       taskObj.containingProjectName = project.name();
//                     } catch(e) {
//                       console.log("Error getting containing project name for task '" + taskNameForError + "': " + e);
//                     }
//                     try {
//                       taskObj.containingProjectId = project.id();
//                     } catch(e) {
//                        console.log("Error getting containing project id for task '" + taskNameForError + "': " + e);
//                     }
//                 }
//               } catch (e) {
//                 console.log("Error accessing containingProject for task '" + taskNameForError + "': " + e); // Log to stderr
//               }
              
//               tasks.push(taskObj);
//               taskCount++;

//             } catch(err) {
//               // This outer catch should ideally not be hit now, but keep it as a safety net
//               console.log("Outer catch: General error processing task '" + taskNameForError + "': " + err);
//             }
//           }
          
//           console.log("Total tasks successfully pushed: " + tasks.length); // Log to stderr
          
//           return JSON.stringify(tasks);

//         } catch(error) {
//           console.log("Fatal script error: " + error); // Log to stderr
//           return "[]";
//         }
//       }`;

//       // Execute the script in OmniFocus
//       const tasks = await executeOmniFocusScript(accessScript);

//       // Format and return the tasks (ensure this part handles potential nulls/errors gracefully)
//       let responseText = "Found " + tasks.length + " active tasks processed (check logs for errors):\n\n";
      
//       var displayCount = Math.min(tasks.length, 20);
//       for (var i = 0; i < displayCount; i++) {
//         const task = tasks[i];
//         const taskName = task.name || "[No Name]";
//         const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
//         const dueString = "Due: " + dueDateStr;
//         const flaggedString = task.flagged ? '⭐' : '';
        
//         responseText += (i+1) + ". " + flaggedString + " " + taskName + " (" + dueString + ")\n";
//         if (task.note && task.note.trim() !== '') {
//           responseText += "   Note: " + task.note + "\n";
//         }
//         responseText += '\n';
//       }
      
//       if (tasks.length > 20) {
//         responseText += "... and " + (tasks.length - 20) + " more tasks";
//       }
      
//       if (tasks.length === 0) {
//           responseText = "Found 0 active tasks or encountered errors during processing. Check server logs for details.";
//       }

//       return {
//         content: [{
//           type: "text",
//           text: responseText
//         }]
//       };
//     } catch (err: unknown) {
//       const error = err as Error;
//       console.error(`Tool execution error: ${error.message}`); 
//       return {
//         content: [{
//           type: "text",
//           text: `Error listing tasks: ${error.message}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

server.tool(
  "dump_database",
  {}, // No parameters needed
  async () => {
    try {
      // Create a script that directly accesses the OmniFocus database
      const accessScript = `
        function run(argv) {
          try {
            var app = Application('OmniFocus');
            var doc = app.defaultDocument;
            
            // Get all tasks from the database
            var allTasks = doc.flattenedTasks();
            var simpleTasksArray = []; // Will hold simple string representations
            var taskLimit = 5000; 
            var taskCount = 0;
            
            console.log("Dump Script: Starting processing... (" + allTasks.length + " total tasks)");

            for (var i = 0; i < allTasks.length && taskCount < taskLimit; i++) {
              try {
                // Get the task
                var task = allTasks[i];
                if (!task) continue;
                
                // Create a simple array of values for this task
                // [id, name, note, flagged, completed, dueDate, deferDate, estimatedMinutes]
                var taskValues = [];
                
                // ID (string)
                try { taskValues.push(task.id()); } 
                catch (e) { taskValues.push(""); }
                
                // Name (string)
                try { taskValues.push(task.name() || "Unnamed Task"); } 
                catch (e) { taskValues.push("Unnamed Task"); }
                
                // Note (string)
                try { taskValues.push(task.note() || ""); } 
                catch (e) { taskValues.push(""); }
                
                // Flagged (boolean as string)
                try { taskValues.push(task.flagged() ? "true" : "false"); } 
                catch (e) { taskValues.push("false"); }
                
                // Completed (boolean as string)
                try { taskValues.push(task.completed() ? "true" : "false"); } 
                catch (e) { taskValues.push("false"); }
                
                // Due Date (date as ISO string or empty)
                try { 
                  var dueDate = task.dueDate();
                  taskValues.push(dueDate ? dueDate.toISOString() : ""); 
                } 
                catch (e) { taskValues.push(""); }
                
                // Defer Date (date as ISO string or empty)
                try { 
                  var deferDate = task.deferDate();
                  taskValues.push(deferDate ? deferDate.toISOString() : ""); 
                } 
                catch (e) { taskValues.push(""); }
                
                // Estimated Minutes (number as string or empty)
                try { 
                  var mins = task.estimatedMinutes();
                  taskValues.push(mins !== null && mins !== undefined ? String(mins) : ""); 
                } 
                catch (e) { taskValues.push(""); }
                
                // Project ID (string or empty)
                try { 
                  var proj = task.containingProject();
                  taskValues.push(proj ? proj.id() : ""); 
                } 
                catch (e) { taskValues.push(""); }
                
                // Project Name (string or empty)
                try { 
                  var projName = task.containingProject();
                  taskValues.push(projName ? projName.name() : ""); 
                } 
                catch (e) { taskValues.push(""); }
                
                // Add this task's values to our array
                simpleTasksArray.push(taskValues);
                taskCount++;
              } 
              catch (taskError) {
                console.log("Dump Script: Error processing task at index " + i + ": " + taskError);
              }
            }
            
            console.log("Dump Script: Successfully processed " + taskCount + " tasks");
            
            // Return the simple array structure as a JSON string
            return JSON.stringify(simpleTasksArray);
          } 
          catch (error) {
            console.log("Dump Script: Fatal script error: " + error);
            return "[]";
          }
        }
      `;
      // Execute the script in OmniFocus
      const rawTaskData = await executeOmniFocusScript(accessScript);
      
      // Convert the raw array data to structured objects
      const tasks = rawTaskData.map(taskValues => {
        return {
          id: taskValues[0],
          name: taskValues[1],
          note: taskValues[2],
          flagged: taskValues[3] === "true",
          completed: taskValues[4] === "true",
          dueDate: taskValues[5] || null,
          deferDate: taskValues[6] || null,
          estimatedMinutes: taskValues[7] ? parseInt(taskValues[7], 10) : null,
          containingProjectId: taskValues[8] || null,
          containingProjectName: taskValues[9] || null
        };
      });

      // Return the structured data
      return {
        content: [{
          type: "text",
          text: JSON.stringify(tasks, null, 2)
        }]
      };
    }
    catch (err) {
      const error = err as Error;
      console.error("Tool execution error in dump_database: " + error.message);
      return {
        content: [{
          type: "text",
          text: "Error dumping database: " + error.message
        }],
        isError: true
      };
    }
});

// Helper function to execute OmniFocus scripts
async function executeOmniFocusScript(script: string): Promise<any[]> {
  try {
    console.error("Starting executeOmniFocusScript...");
    
    // Log the beginning of the script to verify its content
    console.error("Writing script (first ~300 chars):\n", script.substring(0, 300));

    // Write the script to a temporary file in the system temp directory
    const tempFile = join(tmpdir(), `omnifocus_script_${Date.now()}.js`);
    console.error(`Writing script to temporary file: ${tempFile}`);
    
    // Write the script to the temporary file
    writeFileSync(tempFile, script);
    console.error("Successfully wrote script to temp file");
    
    // Execute the script using osascript
    console.error("Executing script with osascript...");
    const { stdout, stderr } = await execAsync(`osascript -l JavaScript ${tempFile}`);
    
    if (stderr) {
      console.error("Script stderr output:", stderr);
    }
    
    console.error("Script stdout:", stdout);
    
    // Clean up the temporary file
    unlinkSync(tempFile);
    console.error("Cleaned up temporary file");
    
    // Parse the output as JSON
    try {
      const result = JSON.parse(stdout);
      console.error(`Successfully parsed JSON. Found ${result.length} tasks`);
      return result;
    } catch (e) {
      console.error("Failed to parse script output as JSON:", e);
      console.error("Raw output was:", stdout);
      return [];
    }
  } catch (error) {
    console.error("Failed to execute OmniFocus script:", error);
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