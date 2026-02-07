import { Request, Response } from 'express';
import { getSupabaseClient } from '../../../services/supabase.service';
import { success, badRequest, internalError } from '../../../utils/http-response';

const ALLOWED_CHECKLIST_FIELDS = ['client_app_demo', 'coach_app_demo'] as const;
type ChecklistField = typeof ALLOWED_CHECKLIST_FIELDS[number];

export const coachChecklistController = {
  /**
   * Get the getting started checklist for the authenticated coach
   */
  getChecklist: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const supabase = getSupabaseClient();

      // Query the checklist data
      const { data: checklist, error } = await supabase
        .from('coach_getting_started_checklist')
        .select('*')
        .eq('coach_id', userId)
        .single();

      if (error) {
        console.error('Error fetching checklist:', error);
        return internalError(res, {
          message: 'Failed to fetch getting started checklist',
        });
      }

      // If no checklist exists, create one (this should not happen due to migration backfill)
      if (!checklist) {
        const { data: newChecklist, error: insertError } = await supabase
          .from('coach_getting_started_checklist')
          .insert({ coach_id: userId })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating checklist:', insertError);
          return internalError(res, {
            message: 'Failed to create getting started checklist',
          });
        }

        return success(res, {
          message: 'Getting started checklist retrieved successfully',
          data: { checklist: newChecklist },
        });
      }

      return success(res, {
        message: 'Getting started checklist retrieved successfully',
        data: { checklist },
      });
    } catch (error) {
      console.error('Error in getChecklist:', error);
      return internalError(res, {
        message: 'An error occurred while fetching the checklist',
      });
    }
  },

  /**
   * Update a checklist field (client_app_demo or coach_app_demo)
   */
  updateChecklist: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { field } = req.body;

      if (!field || !ALLOWED_CHECKLIST_FIELDS.includes(field as ChecklistField)) {
        return badRequest(res, {
          message: `Invalid field. Allowed: ${ALLOWED_CHECKLIST_FIELDS.join(', ')}`,
        });
      }

      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('coach_getting_started_checklist')
        .update({ [field]: true })
        .eq('coach_id', userId);

      if (error) {
        console.error('Error updating checklist:', error);
        return internalError(res, {
          message: 'Failed to update checklist',
        });
      }

      return success(res, {
        message: 'Checklist updated successfully',
      });
    } catch (error) {
      console.error('Error in updateChecklist:', error);
      return internalError(res, {
        message: 'An error occurred while updating the checklist',
      });
    }
  },
};
