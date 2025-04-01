function run(argv) {
  try {
    // Get the OmniFocus application and document
    const app = Application('OmniFocus');
    const doc = app.defaultDocument;
    
    // Define an interface for task output that matches our expected structure
    const taskSchema = {
      id: null,
      name: '',
      note: '',
      flagged: false,
      dueDate: null,
      deferDate: null,
      estimatedMinutes: null,
      containingProjectName: null,
      containingProjectId: null
    };
    
    // Get all tasks from the database
    const allTasks = doc.flattenedTasks();
    const tasks = [];
    
    // Limit to 50 tasks for debugging
    const taskLimit = 50;
    let taskCount = 0;
    
    console.log("Starting to process tasks...");
    
    // Iterate through tasks
    for (let i = 0; i < allTasks.length && taskCount < taskLimit; i++) {
      try {
        const task = allTasks[i];
        
        // Skip completed tasks
        if (task.completed()) continue;
        
        // Create a new task object with our schema
        const taskObj = Object.assign({}, taskSchema);
        
        // Basic properties (direct method calls)
        taskObj.id = task.id();
        taskObj.name = task.name();
        taskObj.note = task.note() || '';
        taskObj.flagged = task.flagged();
        
        // Handle dates carefully
        if (task.dueDate()) {
          try {
            taskObj.dueDate = task.dueDate().toISOString();
          } catch (e) {
            console.log(`Error converting dueDate: ${e}`);
          }
        }
        
        if (task.deferDate()) {
          try {
            taskObj.deferDate = task.deferDate().toISOString();
          } catch (e) {
            console.log(`Error converting deferDate: ${e}`);
          }
        }
        
        // Basic numeric property
        taskObj.estimatedMinutes = task.estimatedMinutes();
        
        // Try to get containing project carefully
        try {
          const project = task.containingProject();
          if (project) {
            taskObj.containingProjectName = project.name();
            taskObj.containingProjectId = project.id();
          }
        } catch (e) {
          console.log(`Error getting containingProject: ${e}`);
        }
        
        console.log(`Successfully processed task: ${taskObj.name}`);
        tasks.push(taskObj);
        taskCount++;
      } catch(err) {
        let taskName = 'Unknown';
        try {
          taskName = allTasks[i].name();
        } catch(e) {
          // Cannot get name, continue
        }
        console.log(`Error processing task "${taskName}": ${err}`);
      }
    }
    
    console.log(`Total tasks processed: ${tasks.length}`);
    
    // Return the tasks directly
    return JSON.stringify(tasks);
  } catch(error) {
    console.log("Script error: " + error);
    return JSON.stringify([]);
  }
}