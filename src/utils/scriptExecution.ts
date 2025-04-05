import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<any[]> {
  try {
    // Write the script to a temporary file in the system temp directory
    const tempFile = join(tmpdir(), `jxa_script_${Date.now()}.js`);
    
    // Write the script to the temporary file
    writeFileSync(tempFile, script);
    
    // Execute the script using osascript
    const { stdout, stderr } = await execAsync(`osascript -l JavaScript ${tempFile}`);
    
    if (stderr) {
      console.error("Script stderr output:", stderr);
    }
    
    // Clean up the temporary file
    unlinkSync(tempFile);
    
    // Parse the output as JSON
    try {
      const result = JSON.parse(stdout);
      return result;
    } catch (e) {
      console.error("Failed to parse script output as JSON:", e);
      
      // If this contains a "Found X tasks" message, treat it as a successful non-JSON response
      if (stdout.includes("Found") && stdout.includes("tasks")) {
        return [];
      }
      
      return [];
    }
  } catch (error) {
    console.error("Failed to execute JXA script:", error);
    throw error;
  }
}

// Function to execute scripts in OmniFocus using the URL scheme
export async function executeOmniFocusScript(scriptPath: string, args?: any): Promise<any> {
  try {
    // Handle file path with @ prefix - use relative path from current executing code
    let actualPath;
    if (scriptPath.startsWith('@')) {
      // Remove the @ and calculate path to script relative to current module
      const scriptName = scriptPath.substring(1);
      // For ESM, we need to derive __dirname equivalent
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      
      // Try to find the script in the correct location based on whether we're in dist or src
      const distPath = join(__dirname, '..', 'utils', 'omnifocusScripts', scriptName);
      const srcPath = join(__dirname, '..', '..', 'src', 'utils', 'omnifocusScripts', scriptName);
      
      // Check if the script exists in the dist path
      if (existsSync(distPath)) {
        actualPath = distPath;
      } else if (existsSync(srcPath)) {
        actualPath = srcPath;
      } else {
        // Try the old path as a fallback
        actualPath = join(__dirname, '..', 'omnifocusScripts', scriptName);
      }
    } else {
      actualPath = scriptPath;
    }
    
    // Read the script file
    const scriptContent = readFileSync(actualPath, 'utf8');
    
    // Encode the script and arguments
    const encodedScript = encodeURIComponent(scriptContent);
    const encodedArgs = args ? `&arg=${encodeURIComponent(JSON.stringify(args))}` : '';
    
    // Construct the URL
    const url = `omnifocus://localhost/omnijs-run?script=${encodedScript}${encodedArgs}`;
    
    // Open the URL using the 'open' command on macOS
    const { stdout, stderr } = await execAsync(`open "${url}"`);
    
    if (stderr) {
      console.error("Error opening OmniFocus URL:", stderr);
    }
    
  
    return stdout;
  } catch (error) {
    console.error("Failed to execute OmniFocus script:", error);
    throw error;
  }
} 