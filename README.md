# Local MCP Server

A local Model Context Protocol (MCP) server implementation for use with the Claude desktop app. This server provides various resources and tools for local development and file system operations.

## Features

- System information resource
- File contents resource
- Directory listing tool
- Shell command execution tool
- Code review prompt template

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To start the development server with TypeScript watch mode:
```bash
npm run dev
```

In another terminal, build and run the server:
```bash
npm run build
npm start
```

## Available Resources and Tools

### Resources

1. `system://info`
   - Provides system information including platform, Node.js version, and current working directory

2. `file://{path}`
   - Retrieves the contents of a file at the specified path
   - Example: `file:///path/to/your/file.txt`

### Tools

1. `list-directory`
   - Lists contents of a specified directory
   - Parameters:
     - `path`: string (directory path to list)

2. `execute-command`
   - Executes a shell command and returns its output
   - Parameters:
     - `command`: string (shell command to execute)

### Prompts

1. `review-code`
   - Template for code review requests
   - Parameters:
     - `code`: string (code to review)
     - `language`: string (optional, programming language of the code)

## Usage with Claude Desktop App

1. Start the MCP server using the instructions above
2. Configure the Claude desktop app to use this server as an MCP provider
3. The server will communicate with Claude through stdio transport

## Security Considerations

- The server has access to your local file system and can execute shell commands
- Use with caution and only in trusted environments
- Consider implementing additional security measures for production use

## License

MIT 