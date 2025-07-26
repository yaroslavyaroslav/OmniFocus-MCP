import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Interface for task creation parameters
export interface AddOmniFocusTaskParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  projectName?: string; // Project name to add task to
  parentTaskId?: string; // Parent task ID for nesting
  parentTaskName?: string; // Parent task name for nesting (alternative to ID)
}

/**
 * Generate pure AppleScript for task creation
 */
export function generateAppleScript(params: AddOmniFocusTaskParams): string {
  const esc = (s: string) => s.replace(/['"\\]/g, '\\\\$&');

  const name = esc(params.name);
  const note = params.note ? esc(params.note) : "";
  const dueISO = params.dueDate ?? "";
  const deferISO = params.deferDate ?? "";
  const flagged = params.flagged === true;
  const estimatedMinutes = Number.isFinite(params.estimatedMinutes as any) ? (params.estimatedMinutes as number) : 0;
  const tags = (params.tags ?? []).map(esc);
  const projectName = params.projectName ? esc(params.projectName) : "";
  const parentTaskId = params.parentTaskId ? esc(params.parentTaskId) : "";
  const parentTaskName = params.parentTaskName ? esc(params.parentTaskName) : "";
  const tagsAS = `{${tags.map(t => `"${t}"`).join(', ')}}`;

  return `
use AppleScript version "2.8"
use framework "Foundation"
use scripting additions

on parseISOISO8601(isoText)
  set s to (isoText as text)
  -- Try NSISO8601DateFormatter first (macOS 10.12+). If unavailable, fall back to NSDateFormatter.
  try
    set fmt to current application's NSISO8601DateFormatter's new()
    set opts to (current application's NSISO8601DateFormatWithInternetDateTime) + (current application's NSISO8601DateFormatWithFractionalSeconds)
    fmt's setFormatOptions:opts
    set nsdate to fmt's dateFromString:s
    if nsdate is not missing value then return (nsdate as date)
  end try
  set df to current application's NSDateFormatter's new()
  df's setLocale:(current application's NSLocale's localeWithLocaleIdentifier:"en_US_POSIX")
  df's setDateFormat:"yyyy-MM-dd HH:mm"
  df's setTimeZone:(current application's NSTimeZone's systemTimeZone())
  set nsdate2 to df's dateFromString:s
  if nsdate2 is missing value then error "Invalid ISO date: " & s
  return (nsdate2 as date)
end parseISOISO8601

-- Variables provided from Node
set parentTaskId to "${parentTaskId}"
set parentTaskName to "${parentTaskName}"
set projectName to "${projectName}"
set someName to "${name}"
set someNote to "${note}"
set dueDate to "${dueISO}"
set deferDate to "${deferISO}"
set flaggedTag to ${flagged ? 'true' : 'false'}
set estimatedMinutes to ${estimatedMinutes}
set tagsToSet to ${tagsAS}

-- Script to create a task in OmniFocus
try
  tell application "OmniFocus"
    tell front document
      -- Determine the container (parent task, project, or inbox)
      if parentTaskId is not "" then
        try
          set parentTask to first flattened task where id = parentTaskId
          set newTask to make new task with properties {name:someName} at end of tasks of parentTask
        on error
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Parent task not found with ID: " & parentTaskId & "\\\"}"
        end try
      else if parentTaskName is not "" then
        try
          set parentTask to first flattened task where name = parentTaskName
          set newTask to make new task with properties {name:someName} at end of tasks of parentTask
        on error
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Parent task not found with name: " & parentTaskName & "\\\"}"
        end try
      else if projectName is "" then
        set newTask to make new inbox task with properties {name:someName}
      else
        try
          set theProject to first flattened project where name = projectName
          tell theProject
            set newTask to make new task at end of tasks with properties {name:someName}
          end tell
        on error
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Project not found: " & projectName & "\\\"}"
        end try
      end if

      if someNote is not "" then set note of newTask to someNote

      if dueDate is not "" then set due date of newTask to my parseISOISO8601(dueDate)
      if deferDate is not "" then set defer date of newTask to my parseISOISO8601(deferDate)

      if flaggedTag then set flagged of newTask to true
      if estimatedMinutes is not 0 then set estimated minutes of newTask to estimatedMinutes

      set taskId to id of newTask as string

      repeat with t in tagsToSet
        try
          set theTag to first flattened tag where name = t
          tell newTask to add theTag to tags
        end try
      end repeat

      return "{\\\"success\\\":true,\\\"taskId\\\":\\\"" & taskId & "\\\",\\\"name\\\":\\\"" & someName & "\\\"}"
    end tell
  end tell
on error errorMessage
  return "{\\\"success\\\":false,\\\"error\\\":\\\"" & errorMessage & "\\\"}"
end try
`.trim();
}

/**
 * Add a task to OmniFocus
 */
export async function addOmniFocusTask(params: AddOmniFocusTaskParams): Promise<{ success: boolean, taskId?: string, error?: string }> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);

    // Execute AppleScript directly (single -e). Escape single quotes for the shell.
    const quoted = script.replace(/'/g, `'\\''`); // end-quote, escaped single quote, reopen
    const { stdout, stderr } = await execAsync(
      `osascript -l AppleScript -e '${quoted}'`
    );

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      // Return the result
      return {
        success: result.success,
        taskId: result.taskId,
        error: result.error
      };
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Unknown error in addOmniFocusTask"
    };
  }
}