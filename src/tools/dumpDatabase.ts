import { OmnifocusTask } from '../types.js';
import { executeOmniFocusScript } from '../utils/scriptExecution.js';

// Script that runs in OmniFocus to dump the database
const generateDumpScript = () => `
  function run(argv) {
    try {
      var app = Application('OmniFocus');
      var doc = app.defaultDocument;
      
      // Get all tasks from the database
      var allTasks = doc.flattenedTasks();
      var taskArrays = []; // Will hold arrays of primitive values
      var taskLimit = 5000; 
      var taskCount = 0;
      
      console.log("Dump Script: Starting processing... (" + allTasks.length + " total tasks)");

      for (var i = 0; i < allTasks.length && taskCount < taskLimit; i++) {
        try {
          // Get the task
          var task = allTasks[i];
          if (!task) continue;
          
          // Create an array to hold primitive values for this task
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
          
          // Completion Date
          try { 
            var completionDate = task.completionDate();
            taskValues.push(completionDate ? completionDate.toISOString() : ""); 
          } 
          catch (e) { taskValues.push(""); }
          
          // Drop Date
          try { 
            var dropDate = task.dropDate();
            taskValues.push(dropDate ? dropDate.toISOString() : ""); 
          } 
          catch (e) { taskValues.push(""); }
          
          // Task Status
          try { taskValues.push(task.taskStatus || "active"); } 
          catch (e) { taskValues.push("active"); }
          
          // Active
          try { taskValues.push(task.active() ? "true" : "false"); } 
          catch (e) { taskValues.push("true"); }
          
          // Due Date
          try { 
            var dueDate = task.dueDate();
            taskValues.push(dueDate ? dueDate.toISOString() : ""); 
          } 
          catch (e) { taskValues.push(""); }
          
          // Defer Date
          try { 
            var deferDate = task.deferDate();
            taskValues.push(deferDate ? deferDate.toISOString() : ""); 
          } 
          catch (e) { taskValues.push(""); }
          
          // Estimated Minutes
          try { 
            var mins = task.estimatedMinutes();
            taskValues.push(mins !== null && mins !== undefined ? String(mins) : ""); 
          } 
          catch (e) { taskValues.push(""); }
          
          // Tags (as array of IDs)
          try {
            var tags = task.tags();
            var tagIds = [];
            if (tags) {
              for (var t = 0; t < tags.length; t++) {
                try { tagIds.push(tags[t].id()); } catch(e) {}
              }
            }
            taskValues.push(JSON.stringify(tagIds));
          } catch (e) { taskValues.push("[]"); }
          
          // Parent ID
          try {
            var parent = task.parent();
            taskValues.push(parent ? parent.id() : "");
          } catch (e) { taskValues.push(""); }
          
          // Containing Project ID
          try {
            var project = task.containingProject();
            taskValues.push(project ? project.id() : "");
          } catch (e) { taskValues.push(""); }
          
          // Project ID (same as containing project for now)
          try {
            var project = task.containingProject();
            taskValues.push(project ? project.id() : "");
          } catch (e) { taskValues.push(""); }
          
          // Child IDs
          try {
            var children = task.children();
            var childIds = [];
            if (children) {
              for (var c = 0; c < children.length; c++) {
                try { childIds.push(children[c].id()); } catch(e) {}
              }
            }
            taskValues.push(JSON.stringify(childIds));
          } catch (e) { taskValues.push("[]"); }
          
          // Has Children
          try { taskValues.push(task.children().length > 0 ? "true" : "false"); } 
          catch (e) { taskValues.push("false"); }
          
          // Sequential
          try { taskValues.push(task.sequential() ? "true" : "false"); } 
          catch (e) { taskValues.push("false"); }
          
          // Completed By Children
          try { taskValues.push(task.completedByChildren() ? "true" : "false"); } 
          catch (e) { taskValues.push("false"); }
          
          // Repetition Rule information
          try { 
            var repetitionRule = task.repetitionRule();
            if (repetitionRule) {
              // Is Repeating
              taskValues.push("true");
              
              // Get repetition method
              try {
                var method = repetitionRule.method();
                taskValues.push(method || ""); 
              } catch (e) { taskValues.push(""); }
              
              // Format repetition as human-readable string
              try {
                var ruleString = "";
                
                // Check for interval
                try {
                  var interval = repetitionRule.interval();
                  if (interval) {
                    ruleString += "Every ";
                    if (interval.days) ruleString += interval.days + " days ";
                    if (interval.weeks) ruleString += interval.weeks + " weeks ";
                    if (interval.months) ruleString += interval.months + " months ";
                    if (interval.years) ruleString += interval.years + " years ";
                  }
                } catch (e) {}
                
                // Check for fixed schedule
                try {
                  var weekDays = repetitionRule.weekDays();
                  if (weekDays && weekDays.length > 0) {
                    ruleString += "on ";
                    for (var d = 0; d < weekDays.length; d++) {
                      ruleString += weekDays[d] + (d < weekDays.length - 1 ? ", " : " ");
                    }
                  }
                } catch (e) {}
                
                taskValues.push(ruleString.trim());
              } catch (e) { taskValues.push(""); }
              
            } else {
              // Not repeating
              taskValues.push("false");
              taskValues.push(""); // No method
              taskValues.push(""); // No rule string
            }
          } catch (e) { 
            // No repetition
            taskValues.push("false");
            taskValues.push(""); // No method
            taskValues.push(""); // No rule string
          }
          
          // Add this task's values to our array
          taskArrays.push(taskValues);
          taskCount++;
        } 
        catch (taskError) {
          console.log("Dump Script: Error processing task at index " + i + ": " + taskError);
        }
      }
      
      console.log("Dump Script: Successfully processed " + taskCount + " tasks");
      
      // Return the array structure as a JSON string
      return JSON.stringify(taskArrays);
    } 
    catch (error) {
      console.log("Dump Script: Fatal script error: " + error);
      return "[]";
    }
  }
`;

// Convert raw task data into structured OmnifocusTask objects
const processRawTaskData = (rawTaskData: any[]): OmnifocusTask[] => {
  return rawTaskData.map(taskValues => ({
    id: String(taskValues[0]),
    name: String(taskValues[1]),
    note: String(taskValues[2]),
    flagged: taskValues[3] === "true",
    completed: taskValues[4] === "true",
    completionDate: taskValues[5] || null,
    dropDate: taskValues[6] || null,
    taskStatus: String(taskValues[7]),
    active: taskValues[8] === "true",
    dueDate: taskValues[9] || null,
    deferDate: taskValues[10] || null,
    estimatedMinutes: taskValues[11] ? Number(taskValues[11]) : null,
    tags: JSON.parse(taskValues[12] || "[]"),
    parentId: taskValues[13] || null,
    containingProjectId: taskValues[14] || null,
    projectId: taskValues[15] || null,
    childIds: JSON.parse(taskValues[16] || "[]"),
    hasChildren: taskValues[17] === "true",
    sequential: taskValues[18] === "true",
    completedByChildren: taskValues[19] === "true",
    isRepeating: taskValues[20] === "true",
    repetitionMethod: taskValues[21] || null,
    repetitionRule: taskValues[22] || null,
    attachments: [], // Default empty array
    linkedFileURLs: [], // Default empty array
    notifications: [], // Default empty array
    shouldUseFloatingTimeZone: false // Default value
  }));
};

// Main function to dump the database
export async function dumpDatabase(): Promise<OmnifocusTask[]> {
  try {
    const script = generateDumpScript();
    const rawTaskData = await executeOmniFocusScript(script);
    return processRawTaskData(rawTaskData);
  } catch (error) {
    console.error("Error in dumpDatabase:", error);
    throw error;
  }
}
