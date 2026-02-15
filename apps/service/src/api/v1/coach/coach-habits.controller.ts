import { Request, Response } from 'express';
import { success, unauthorized, created } from '../../../utils/http-response';
import { getSupabaseClient } from '../../../services/supabase.service';

export const coachHabitsController = {
    /**
     * Get all habits for a coach
     */
    getHabits: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: habits, error } = await supabase
            .from('coach_habits')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach habits retrieved successfully',
            data: { habits },
        });
    },

    /**
     * Create a new coach habit
     */
    createHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const {
            name,
            description,
            schedule_type,
            days_of_week,
            times_of_day,
            timezone,
            start_date,
            end_date,
            schedule_config,
            reminder_enabled,
            reminder_time,
            reminder_message,
        } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Habit name is required' });
        }

        const supabase = getSupabaseClient();
        const { data: habit, error } = await supabase
            .from('coach_habits')
            .insert({
                coach_id: userId,
                name,
                description,
                schedule_type: schedule_type || 'daily',
                days_of_week,
                times_of_day,
                timezone: timezone || 'UTC',
                start_date,
                end_date,
                schedule_config: schedule_config || {},
                reminder_enabled: reminder_enabled || false,
                reminder_time: reminder_time || null,
                reminder_message: reminder_message || null,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Coach habit created successfully',
            data: { habit },
        });
    },

    /**
     * Update an existing coach habit
     */
    updateHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const updates = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing } = await supabase
            .from('coach_habits')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { data: habit, error } = await supabase
            .from('coach_habits')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach habit updated successfully',
            data: { habit },
        });
    },

    /**
     * Delete a coach habit
     */
    deleteHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('coach_habits')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Coach habit deleted successfully',
        });
    },

    /**
     * Duplicate a coach habit
     */
    duplicateHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Fetch original
        const { data: original, error: fetchError } = await supabase
            .from('coach_habits')
            .select('*')
            .eq('id', id)
            .eq('coach_id', userId)
            .single();

        if (fetchError || !original) {
            return res.status(404).json({ success: false, message: 'Habit not found' });
        }

        // Create copy
        const { data: habit, error: createError } = await supabase
            .from('coach_habits')
            .insert({
                coach_id: userId,
                name: `${original.name} (Copy)`,
                description: original.description,
                schedule_type: original.schedule_type,
                days_of_week: original.days_of_week,
                times_of_day: original.times_of_day,
                timezone: original.timezone,
                start_date: original.start_date,
                end_date: original.end_date,
                schedule_config: original.schedule_config,
                reminder_enabled: original.reminder_enabled,
                reminder_time: original.reminder_time,
                reminder_message: original.reminder_message,
            })
            .select()
            .single();

        if (createError) {
            return res.status(500).json({ success: false, message: createError.message });
        }

        created(res, {
            message: 'Coach habit duplicated successfully',
            data: { habit },
        });
    },

    // =============================================================================
    // Folder Operations
    // =============================================================================

    /**
     * Get all habit folders for a coach
     */
    getFolders: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: folders, error } = await supabase
            .from('coach_habit_folders')
            .select('*')
            .eq('coach_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Habit folders retrieved successfully',
            data: { folders },
        });
    },

    /**
     * Create a new habit folder
     */
    createFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { name } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        if (!name) {
            return res.status(400).json({ success: false, message: 'Folder name is required' });
        }

        const supabase = getSupabaseClient();

        // Check for existing folders with same name and generate unique name
        let finalName = name;
        const { data: existingFolders } = await supabase
            .from('coach_habit_folders')
            .select('name')
            .eq('coach_id', userId)
            .ilike('name', `${name}%`);

        if (existingFolders && existingFolders.length > 0) {
            const existingNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
            if (existingNames.has(name.toLowerCase())) {
                let copyNum = 1;
                let newName = `${name} (Copy)`;
                while (existingNames.has(newName.toLowerCase())) {
                    copyNum++;
                    newName = `${name} (Copy ${copyNum})`;
                }
                finalName = newName;
            }
        }

        const { data: folder, error } = await supabase
            .from('coach_habit_folders')
            .insert({
                coach_id: userId,
                name: finalName,
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        created(res, {
            message: 'Habit folder created successfully',
            data: { folder },
        });
    },

    /**
     * Update a habit folder
     */
    updateFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { name } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure ownership before updating
        const { data: existing } = await supabase
            .from('coach_habit_folders')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Check for existing folders with same name (excluding current folder) and generate unique name
        let finalName = name;
        const { data: existingFolders } = await supabase
            .from('coach_habit_folders')
            .select('name')
            .eq('coach_id', userId)
            .neq('id', id)
            .ilike('name', `${name}%`);

        if (existingFolders && existingFolders.length > 0) {
            const existingNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
            if (existingNames.has(name.toLowerCase())) {
                let copyNum = 1;
                let newName = `${name} (Copy)`;
                while (existingNames.has(newName.toLowerCase())) {
                    copyNum++;
                    newName = `${name} (Copy ${copyNum})`;
                }
                finalName = newName;
            }
        }

        const { data: folder, error } = await supabase
            .from('coach_habit_folders')
            .update({
                name: finalName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Habit folder updated successfully',
            data: { folder },
        });
    },

    /**
     * Delete a habit folder (items inside become unfiled)
     */
    deleteFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // First, unfile all habits in this folder
        await supabase
            .from('coach_habits')
            .update({ folder_id: null })
            .eq('folder_id', id)
            .eq('coach_id', userId);

        // Then delete the folder
        const { error } = await supabase
            .from('coach_habit_folders')
            .delete()
            .eq('id', id)
            .eq('coach_id', userId);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Habit folder deleted successfully',
        });
    },

    /**
     * Move a habit to a folder (or out of folder if folder_id is null)
     */
    moveHabit: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;
        const { folder_id } = req.body;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();

        // Ensure habit ownership
        const { data: existing } = await supabase
            .from('coach_habits')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (!existing || existing.coach_id !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // If folder_id is provided, verify ownership
        if (folder_id) {
            const { data: folder } = await supabase
                .from('coach_habit_folders')
                .select('coach_id')
                .eq('id', folder_id)
                .single();

            if (!folder || folder.coach_id !== userId) {
                return res.status(403).json({ success: false, message: 'Folder not found' });
            }
        }

        const { data: habit, error } = await supabase
            .from('coach_habits')
            .update({
                folder_id: folder_id || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Habit moved successfully',
            data: { habit },
        });
    },

    /**
     * Get habits in a specific folder
     */
    getHabitsInFolder: async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const { id } = req.params;

        if (!userId) {
            unauthorized(res, { message: 'User not authenticated' });
            return;
        }

        const supabase = getSupabaseClient();
        const { data: habits, error } = await supabase
            .from('coach_habits')
            .select('*')
            .eq('coach_id', userId)
            .eq('folder_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        success(res, {
            message: 'Habits in folder retrieved successfully',
            data: { habits },
        });
    },
};
