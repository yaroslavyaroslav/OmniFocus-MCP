# OmniFocus MCP Server Development Notes

## JXA and OmniFocus Integration: Key Lessons

### JavaScript Context Boundaries

The most critical insight when working with OmniFocus via JavaScript for Automation (JXA) in a Node.js server is understanding the strict boundaries between different JavaScript contexts:

1. **Node.js Context**: Where the MCP server runs
2. **JXA Context**: The JavaScript environment provided by macOS scripting
3. **OmniFocus JavaScript Context**: OmniFocus's internal JavaScript environment

These contexts do not freely exchange complex objects. Only primitive values can safely cross the boundary between 2 and 3.

### Data Transmission Pattern

When extracting data from OmniFocus, follow this pattern:

```
Node.js → JXA → OmniFocus → Extract Primitives → JXA → Node.js
```

- **DO** extract primitive values (strings, numbers, booleans) in the JXA/OmniFocus context
- **DO NOT** try to return complex objects with methods or private properties
- **DO** assemble your final complex objects in the Node.js context after receiving primitives

### JXA Syntax Limitations

JXA has stricter JavaScript syntax requirements compared to modern Node.js:

1. **Object Literals**: Avoid complex nested object literals in JXA scripts
2. **Error Sensitivity**: JXA is extremely sensitive to syntax errors and will fail with cryptic messages
3. **Prefer Arrays**: Use arrays of primitives rather than complex objects for data transfer
4. **Use Traditional Syntax**: Stick to `var`, traditional concatenation with `+`, and avoid ES6+ features

### OmniFocus Task Access Pattern

When accessing OmniFocus task properties:

1. **Handle Every Property Separately**: Use individual try/catch blocks for each property
2. **Provide Default Values**: Always have a fallback for when a property access fails
3. **Convert to String**: Explicitly convert non-string values to strings when needed
4. **Convert Dates Carefully**: Pay special attention to date values, using `toISOString()` and thorough error handling



