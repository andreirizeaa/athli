import { Request, Response } from 'express';
import { getSupabaseClient } from '../../../services/supabase.service';
import { success, internalError } from '../../../utils/http-response';

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
};
