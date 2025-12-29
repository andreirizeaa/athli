/**
 * Program schema types
 */

/**
 * Individual day in a program
 */
export type ProgramDay = {
    day: number; // Day number (1-based)
    workouts: string[]; // Array of workout IDs
};

/**
 * Program data structure stored in the program_data JSONB field.
 * Contains only the actual program structure (days array).
 * Metadata (name, description, type, difficulty, weeks) is stored in table columns.
 */
export type ProgramData = {
    schema?: ProgramDay[]; // Array of program days with workout IDs
    days?: ProgramDay[]; // Alternative field name for compatibility
};

/**
 * Program metadata stored in table columns
 */
export type ProgramMetadata = {
    name: string;
    description: string;
    type: string;
    difficulty: string;
    weeks: number;
};

/**
 * Complete program payload including metadata.
 * Used for creating/editing programs in the UI.
 */
export type ProgramPayload = ProgramMetadata & {
    id?: string; // Program ID (assigned after creation)
    schema?: ProgramDay[]; // Program structure
};
