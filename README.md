# OmniFocus MCP Server

A Model Context Protocol (MCP) server that integrates with OmniFocus to enable Claude (or other models) to interact with your tasks and projects. 


## Status
> ⚠️ **Warning**: This is a work in progress. It is not yet ready for serious use.

### Roadmap to v1.0

- ✅ Added Tool for dumping the omnifocus database into model context. 
- ✅ Add a tool for adding projects to omnifocus.
- Add a tool for removing tasks 
- Add a tool for marking tasks as complete
- Add a tool for editing any of the task fields
- Add a tool for removing projects
- Add a tool for editing any of the project fields
- Explore the posibiility of interacting with custom perspectives
- Write documentation and examples


## Quick Start

## Overview

## Features

### Tasks
### dumpDatabase

Returns a JSON object with the following properties:

- `success`: Whether the database was dumped successfully.
- `database`: The database object.

#### addTask

Add a new task to OmniFocus.

Accepts a JSON object with the following properties:
```
- `name`: The name of the task.
- `projectName`: The name of the project to add the task to.
- `note`: The note to add to the task.
- `dueDate`: The due date to add to the task.
- `deferDate`: The defer date to add to the task.
- `flagged`: Whether the task should be flagged.
- `estimatedMinutes`: The estimated minutes to add to the task.
- `tags`: The tags to add to the task.

Returns a JSON object with the following properties:

- `success`: Whether the task was added successfully.
- `taskId`: The ID of the task.
```

### Projects

#### addProject

Add a new project to OmniFocus.

Accepts a JSON object with the following properties:
```
- `name`: The name of the project.
- `folderName`: The name of the folder to add the project to.
- `note`: The note to add to the project.
- `dueDate`: The due date to add to the project.
- `deferDate`: The defer date to add to the project.
- `flagged`: Whether the project should be flagged.
- `estimatedMinutes`: The estimated minutes to add to the project.
- `tags`: The tags to add to the project.
- `sequential`: Whether tasks in the project should be sequential (default: false).

Returns a JSON object with the following properties:

- `success`: Whether the project was added successfully.
- `projectId`: The ID of the project.
```

## Installation

Documentation to follow.

