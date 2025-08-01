-- Variables (modify these values as needed)
set parentTaskId to "" -- e.g. "iKNpsVubKhG"
set parentTaskName to "" -- e.g. "My Parent Task"
set projectName to "Home" -- e.g. "My Project"
set someName to "Buy eggs"
set someNote to "This is the someNote for a eggs buy" -- e.g. "Additional details"
set dueDate to "2025-08-27T12:20" -- ISO date string, e.g. "2024-01-15"
set deferDate to "" -- ISO date string
set flaggedTag to false -- set to true to flag the task
set estimatedMinutes to 15 -- set to minutes to estimate
set tagsToSet to {"Me", "1"} -- e.g. {"Tag1", "Tag2"}

-- Script to create a task in OmniFocus
try
  tell application "OmniFocus"
    tell front document
      -- Determine the container (parent task, project, or inbox)
      if parentTaskId is not "" then
        -- Use parent task by ID
        try
          set parentTask to first flattened task where id = parentTaskId
          set newTask to make new task with properties {name:someName} at end of tasks of parentTask
        on error
          return "{\"success\":false,\"error\":\"Parent task not found with ID: " & parentTaskId & "\"}"
        end try
      else if parentTaskName is not "" then
        -- Use parent task by name
        try
          set parentTask to first flattened task where name = parentTaskName
          set newTask to make new task with properties {name:someName} at end of tasks of parentTask
        on error
          return "{\"success\":false,\"error\":\"Parent task not found with name: " & parentTaskName & "\"}"
        end try
      else if projectName is "" then
        -- Use inbox of the document
        set newTask to make new inbox task with properties {name:someName}
      else
        -- Use specified project
        try
          set theProject to first flattened project where name = projectName
          -- Create the new task inside the specified project
          tell theProject
            set newTask to make new task at end of tasks with properties {name:someName}
          end tell
        on error
          return "{\"success\":false,\"error\":\"Project not found: " & projectName & "\"}"
        end try
      end if

      -- Set task properties
      if someNote is not "" then
        set note of newTask to someNote
      end if

      if dueDate is not "" then
        -- Parse ISO 8601 string into AppleScript date
        set due date of newTask to my parseISOISO8601(dueDate)
      end if

      if deferDate is not "" then
        -- Parse ISO 8601 string into AppleScript date
        set defer date of newTask to my parseISOISO8601(deferDate)
      end if

      if flaggedTag then
        set flagged of newTask to true
      end if

      if estimatedMinutes is not 0 then
        set estimated minutes of newTask to estimatedMinutes
      end if

      -- Get the task ID
      set taskId to id of newTask as string

      -- Add tags if provided
      repeat with t in tagsToSet
        try
          set theTag to first flattened tag where name = t
          tell newTask to add theTag to tags
        on error errMsg
          -- log "[addOmniFocusTask] failed to add tag: " & tName & " (" & errMsg & ")"
        end try
      end repeat

      -- Return success with task ID
      return "{\"success\":true,\"taskId\":\"" & taskId & "\",\"name\":\"" & someName & "\"}"
    end tell
  end tell
on error errorMessage
  return "{\"success\":false,\"error\":\"" & errorMessage & "\"}"
end try

use framework "Foundation"

on parseISOISO8601(isoString)
    -- create formatter
    set fmt to current application's NSDateFormatter's alloc()'s init()
    fmt's setLocale:(current application's NSLocale's localeWithLocaleIdentifier_("en_US_POSIX"))
    fmt's setDateFormat_("yyyy-MM-dd'T'HH:mm")
    -- parse and return NSDate bridged to AppleScript date
    return (fmt's dateFromString_(isoString)) as date
end parseISOISO8601
