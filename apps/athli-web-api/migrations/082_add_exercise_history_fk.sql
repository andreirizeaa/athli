-- ================================================
-- Add FK from client_training_exercise_history to client_training_history
-- ================================================
-- This enables cascade deletes: when a training history record is deleted,
-- all associated exercise history records are automatically deleted.

ALTER TABLE public.client_training_exercise_history
  ADD CONSTRAINT fk_cteh_training_history
    FOREIGN KEY (client_id, coach_id, date, workout_id)
    REFERENCES public.client_training_history (client_id, coach_id, date, workout_id)
    ON DELETE CASCADE;
