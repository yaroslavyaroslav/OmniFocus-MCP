export interface OmnifocusTask {
    id: string;
    name: string;
    note: string;
    flagged: boolean;
    
    // Status
    completed: boolean;
    completionDate: string | null;
    dropDate: string | null;
    taskStatus: string; // One of Task.Status values
    active: boolean;
    
    // Dates
    dueDate: string | null;
    deferDate: string | null;
    estimatedMinutes: number | null;
    
    // Organization
    tags: string[]; // Tag IDs
    parentId: string | null;
    containingProjectId: string | null;
    projectId: string | null;
    
    // Task relationships
    childIds: string[];
    hasChildren: boolean;
    sequential: boolean;
    completedByChildren: boolean;
    
    // Recurring task information
    repetitionRule: string | null; // Textual representation of repetition rule
    isRepeating: boolean;
    repetitionMethod: string | null; // Fixed or due-based repetition
    
    // Attachments
    attachments: any[]; // FileWrapper representations
    linkedFileURLs: string[];
    
    // Notifications
    notifications: any[]; // Task.Notification representations
    
    // Settings
    shouldUseFloatingTimeZone: boolean;
  }