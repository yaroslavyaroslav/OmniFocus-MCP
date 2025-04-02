import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// Helper function to execute OmniFocus scripts
export async function executeOmniFocusScript(script: string): Promise<any[]> {
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