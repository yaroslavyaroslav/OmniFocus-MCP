import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// The primitive internally calls `child_process.exec` wrapped with `util.promisify`.
// We stub that promisified function so no real AppleScript is executed during the test.
const mockExecAsync = jest.fn<any>();
const childExecMock = jest.fn<any>();

// Mock the `util` module **before** the module under test is imported.
jest.unstable_mockModule('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

jest.unstable_mockModule('node:util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Ensure `child_process.exec` itself is mocked so that the promisified version
// created inside the module under test calls our stub instead of spawning a
// real process.
jest.unstable_mockModule('child_process', () => ({
  exec: childExecMock
}));

jest.unstable_mockModule('node:child_process', () => ({
  exec: childExecMock
}));


let addOmniFocusTask: typeof import('../../../tools/primitives/addOmniFocusTask.js').addOmniFocusTask;
let generateAppleScript: typeof import('../../../tools/primitives/addOmniFocusTask.js').generateAppleScript;

beforeAll(async () => {
  // Dynamically import after the mock is in place so the primitive picks it up.
  ({ addOmniFocusTask, generateAppleScript } = await import('../../../tools/primitives/addOmniFocusTask.js'));
});

describe('addOmniFocusTask – static parameter set', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create the task with the exact static values provided', async () => {
    const mockStdout = '{"success":true,"taskId":"testEggs123","name":"Buy eggs"}';
    mockExecAsync.mockResolvedValue({ stdout: mockStdout, stderr: '' });

    const params: any = {
      name: 'Buy eggs',
      note: 'This is the someNote for a eggs buy',
      dueDate: '2025-08-27T12:00',
      deferDate: '',
      flagged: false,
      estimatedMinutes: 15,
      tags: ['Me', '1'],
      projectName: 'Home',
      parentTaskId: '',
      parentTaskName: ''
    };

    const result = await addOmniFocusTask(params);

    // Only assert success; other fields (like taskId) are variable per run
    expect(result).toMatchObject({ success: true });

    // Ensure the generated AppleScript contains the critical pieces of data.
    const appleScript = generateAppleScript(params as any);
    expect(appleScript).toContain('set projectName to "Home"');
    expect(appleScript).toContain('set someName to "Buy eggs"');
    expect(appleScript).toContain('set someNote to "This is the someNote for a eggs buy"');
    expect(appleScript).toContain('set dueDate to "2025-08-27T12:00"');
    expect(appleScript).toContain('set flaggedTag to false');
    expect(appleScript).toContain('set estimatedMinutes to 15');
    // Tags are converted to AppleScript list {"Me", "1"}
    expect(appleScript).toContain('{"Me", "1"}');
  });
});
