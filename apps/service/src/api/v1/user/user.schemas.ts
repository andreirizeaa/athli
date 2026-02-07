import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    profilePictureUrl: z.string().url('Invalid URL').nullable().optional(),
  }),
});

export const ensureClientProfileSchema = z.object({
  body: z.object({
    coachId: z.string().uuid('Invalid coach ID'),
  }),
});

export const newClientSchema = z.object({
  body: z.object({
    coachId: z.string().uuid('Invalid coach ID'),
    invitationToken: z.string().optional(),
    onboardingId: z.string().uuid('Invalid onboarding ID').optional(),
  }),
});
