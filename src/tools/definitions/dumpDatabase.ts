import { z } from 'zod';
import { dumpDatabase } from '../dumpDatabase.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({});

export async function handler(args: {}, extra: RequestHandlerExtra) {
  try {
    const database = await dumpDatabase();
    
    // Option to return a human-readable summary instead of raw JSON
    const exampleTask = database.tasks[0];
    let summary = '';
    
    if (exampleTask) {
      summary = `Database contains ${database.tasks.length} tasks, ${Object.keys(database.projects).length} projects, ` +
                `${Object.keys(database.folders).length} folders, and ${Object.keys(database.tags).length} tags.\n\n` +
                `Example task "${exampleTask.name}" has tags: ${exampleTask.tagNames.join(', ')}`;
    } else {
      summary = "Database is empty or OmniFocus is not running.";
    }
    
    // Return the complete database as JSON
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(database, null, 2) + "\n\n" + summary
      }]
    };
  } catch (err: unknown) {
    return {
      content: [{
        type: "text" as const,
        text: `Error dumping database. Please ensure OmniFocus is running and try again.`
      }],
      isError: true
    };
  }
} 