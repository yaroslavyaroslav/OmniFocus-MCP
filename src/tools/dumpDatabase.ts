import { OmnifocusTask } from '../types.js';
import { executeOmniFocusScript } from '../utils/scriptExecution.js';
import { getLatestOmniFocusData } from '../server.js';
import fs from 'fs';
// Define an interface for the task object returned by omnifocusDump.js
interface OmnifocusDumpTask {
  id: string;
  name: string;
  note?: string;
  taskStatus: string;
  flagged: boolean;
  dueDate: string | null;
  deferDate: string | null;
  effectiveDueDate: string | null;
  effectiveDeferDate: string | null;
  estimatedMinutes: number | null;
  completedByChildren: boolean;
  sequential: boolean;
  tags: string[];
  projectID: string | null;
  parentTaskID: string | null;
  children: string[];
  inInbox: boolean;
}

// Main function to dump the database
export async function dumpDatabase(): Promise<OmnifocusTask[]> {
  
  try {
    // Execute the OmniFocus script - this will trigger a fetch that will update latestOmniFocusData
    const scriptResult = await executeOmniFocusScript('@omnifocusDump.js');
    
    // Wait longer for the HTTP POST to be processed
    let attempts = 0;
    const maxAttempts = 10;
    const waitTime = 1000; // 1 second between attempts
    
    let data = null;
    
    // Try multiple times to get the data
    while (attempts < maxAttempts) {
      attempts++;
      
      // Wait before checking
      // await new Promise(resolve => setTimeout(resolve, waitTime));
      // get the script result
      const scriptResult = await executeOmniFocusScript('@omnifocusDump.js');
      // data = scriptResult;
      // console.log("scriptResult");
      // console.log(data);
      //save the contents of scriptResult to a file in the library/logs/claude folder
      // fs.writeFileSync('~/library/logs/claude/scriptResult.json', scriptResult);
      // Get the latest data from the server module
      data = getLatestOmniFocusData();
      
      if (data && data.tasks && data.tasks.length > 0) {
        break;
      }
    }
    
    if (!data) {
      return [];
    }
    
    // If we have tasks in the data
    if (data.tasks && Array.isArray(data.tasks)) {
      // Convert the tasks to our OmnifocusTask format
      return data.tasks.map((task: OmnifocusDumpTask) => ({
        id: String(task.id),
        name: String(task.name),
        note: String(task.note || ""),
        flagged: Boolean(task.flagged),
        completed: task.taskStatus === "Completed",
        completionDate: null, // Not available in the new format
        dropDate: null, // Not available in the new format
        taskStatus: String(task.taskStatus),
        active: task.taskStatus !== "Completed" && task.taskStatus !== "Dropped",
        dueDate: task.dueDate,
        deferDate: task.deferDate,
        estimatedMinutes: task.estimatedMinutes ? Number(task.estimatedMinutes) : null,
        tags: task.tags || [],
        parentId: task.parentTaskID || null,
        containingProjectId: task.projectID || null,
        projectId: task.projectID || null,
        childIds: task.children || [],
        hasChildren: (task.children && task.children.length > 0) || false,
        sequential: Boolean(task.sequential),
        completedByChildren: Boolean(task.completedByChildren),
        isRepeating: false, // Not available in the new format
        repetitionMethod: null, // Not available in the new format 
        repetitionRule: null, // Not available in the new format
        attachments: [], // Default empty array
        linkedFileURLs: [], // Default empty array
        notifications: [], // Default empty array
        shouldUseFloatingTimeZone: false // Default value
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error in dumpDatabase:", error);
    throw error;
  }
  return [];
}

