# AI Assistant Testing Guide

This document contains all test cases for manually testing the AI assistant functionality.

---

## Issue-Specific Test Cases

These tests verify the fixes for the 12 reported issues.

| # | Issue | Test Prompt | Expected Result | Pass/Fail |
|---|-------|-------------|-----------------|-----------|
| 1 | Draft message should be editable text box | "Draft a motivational message for John" | Shows editable textarea with message, Copy button below. NOT email format with subject line. User can edit text before copying. | |
| 2a | Workout columns should use correct types | "Create a strength workout with squats and bench press" | Exercise trackable columns should be "Reps" and "kg" (or lbs). NOT free text. | |
| 2b | Cardio exercises use time columns | "Create a cardio workout with running and cycling" | Cardio exercises should use "minutes" column. NOT free text. | |
| 2c | Reps can have ranges, weight should not | "Create a hypertrophy workout" | Reps may show ranges like "8-12", but weight should be single values like "60" not "60-80" | |
| 3a | Workout assignment uses future dates | "Assign Push Day to John" (no date specified) | Should use today's date or a future date (NOT February 2024 or past dates) | |
| 3b | Explicit future date works | "Assign Push Day to John next Monday" | Should correctly calculate next Monday's date | |
| 4 | Create metric cache invalidation | "Create a body fat percentage metric" | After clicking Create, navigate to /metrics - new metric should appear WITHOUT page refresh | |
| 5 | Assign metric without loop | "Assign body weight tracking to Emma" | Should either find existing metric and assign, OR create and assign. Should NOT loop asking user to create metric first. | |
| 6a | Tool names formatted nicely | "Create a workout for beginners" | While loading, should show "Creating workout..." NOT "create_workout" | |
| 6b | All tools show friendly names | "Search for chest exercises" | Should show "Searching exercises..." NOT "search_exercises" | |
| 7 | Client navigation uses /athletes | "Show me John's profile" or add a goal/injury | After confirmation, should navigate to `/athletes/{id}` NOT `/clients/{id}` | |
| 8a | Goals get default target date | "Add a muscle gain goal for Sarah" | Goal should have a target date ~6 months from today (visible in confirmation card) | |
| 8b | Injuries get default date | "Record that Mike has a shoulder strain" | Injury should have today's date as "date occurred" (visible in confirmation card) | |
| 9 | Client category uses correct values | "Change Emma's coaching type to in-person" | Should use values: "online", "in-person", or "hybrid". NOT "athlete", "general", "rehab" | |
| 10 | No status field in profile update | "Update John's profile" | Should NOT offer to change "status" field. Only category, notes, and other valid fields. | |
| 11 | Check-in navigation correct | "Create a weekly check-in form" | After creation, should navigate to `/forms/check-ins` NOT `/checkins` | |
| 12a | Question type yesNo correct | "Create a check-in with a yes/no question about completing workouts" | Question type should be "yesNo" (camelCase) in the payload | |
| 12b | Question type multipleChoice correct | "Create a check-in with multiple choice questions" | Question type should be "multipleChoice" (camelCase) NOT "multiple_choice" | |
| 12c | Scale questions work | "Create a check-in with a 1-10 energy rating question" | Question type should be "scale" with scaleFrom and scaleTo values | |

---

## Full Tool Test Matrix

### Tools WITH Confirmation Cards

These tools return action payloads that show confirmation cards in the UI.

| Tool | Action Type | Test Prompts | What to Verify |
|------|-------------|--------------|----------------|
| **create_workout** | create_workout | "Create a push day workout" | Card shows exercise count, sections, difficulty. Confirm adds to library. |
| | | "Make me a full body routine for beginners" | |
| | | "Create a 30-minute HIIT workout" | |
| | | "Design a leg day with squats, lunges, and leg press" | |
| **create_section** | create_section | "Create a warm-up section" | Card shows section name, exercise count. |
| | | "Make a superset section for chest and triceps" | |
| | | "Create an AMRAP section with burpees and box jumps" | |
| **assign_workout** | assign_workout | "Assign Push Day A to John for Monday" | Card shows client name, workout name, date. Date should be in future. |
| | | "Schedule the leg workout for Sarah tomorrow" | |
| | | "Give John the beginner workout for next week" | |
| | | "Assign a workout to Emma" (no date - should use today/future) | |
| **assign_metric_to_client** | assign_metric_to_client | "Add body weight tracking to Emma" | Should find or create metric, then show assignment card. |
| | | "Assign the waist measurement metric to John" | |
| | | "Track Sarah's body fat percentage" | |
| **add_client_goal** | add_client_goal | "Add a weight loss goal for Sarah" | Card shows goal type, target date (~6 months out). |
| | | "Set a goal for John to squat 100kg" | |
| | | "Emma wants to lose 5kg by summer" | |
| | | "Add a muscle building goal for Mike" | |
| **add_client_injury** | add_client_injury | "Record that Emma has a lower back strain" | Card shows injury type, body part, severity, date (today if not specified). |
| | | "Add a knee injury for Mike" | |
| | | "John hurt his shoulder last week" | |
| | | "Sarah has mild tendinitis in her elbow" | |
| **draft_message_for_client** | draft_message | "Draft a check-in message for Sarah" | Shows EDITABLE textarea. User can modify text. Copy button works. |
| | | "Write a motivational message for John" | |
| | | "Send Emma a reminder about her workout" | |
| | | "Draft a progress update for Mike" | |
| **update_client_profile** | update_client_profile | "Change Emma's coaching type to online" | Only valid fields: category (online/in-person/hybrid), notes. NO status field. |
| | | "Update John to hybrid coaching" | |
| | | "Add a note to Sarah's profile about her vacation" | |
| **create_checkin_template** | create_checkin_template | "Create a weekly check-in form" | Card shows name, question count. After confirm, navigates to /forms/check-ins. |
| | | "Make a check-in with questions about sleep and energy" | |
| | | "Create a daily wellness check-in" | |
| | | "Build a progress check-in with rating questions" | |
| **create_metric** | create_metric | "Create a body weight metric" | After confirm, metric appears in /metrics WITHOUT refresh. |
| | | "Add a new metric for tracking 1RM squat" | |
| | | "Create a waist circumference metric in cm" | |

---

### Read-Only Tools (No Confirmation Card)

These tools retrieve information and don't require user confirmation.

| Tool | Test Prompts | What to Verify |
|------|--------------|----------------|
| **list_all_clients** | "Show me all my clients" | Returns list of clients |
| | "Who are my athletes?" | |
| **search_clients** | "Find clients named John" | Returns matching clients |
| | "Search for Sarah" | |
| **get_client_profile** | "Show me Emma's profile" | Returns detailed client info |
| | "What are John's details?" | |
| **get_client_workouts** | "What workouts has Sarah done?" | Returns workout history |
| | "Show John's training history" | |
| **get_client_metrics** | "What metrics is Emma tracking?" | Returns assigned metrics and entries |
| | "Show me Mike's body weight progress" | |
| **get_client_checkins** | "Show Sarah's check-in responses" | Returns check-in submissions |
| | "How did John rate his energy this week?" | |
| **get_inactive_clients** | "Who hasn't trained in 7 days?" | Returns inactive clients |
| | "Find clients who haven't worked out recently" | |
| **search_exercises** | "Find chest exercises" | Returns matching exercises |
| | "Search for exercises with dumbbells" | |
| **get_exercise_catalog** | "Show me all quad exercises" | Returns exercise catalog |
| | "What exercises target biceps?" | |
| **get_coach_workouts** | "Show my workout templates" | Returns coach's workouts |
| | "List all my workouts" | |
| **get_coach_programs** | "Show my training programs" | Returns coach's programs |
| | "What programs do I have?" | |
| **get_coach_sections** | "List my section templates" | Returns coach's sections |
| | "Show my reusable sections" | |
| **list_all_checkin_templates** | "Show my check-in forms" | Returns check-in templates |
| | "What check-ins do I have?" | |
| **list_all_metrics** | "What metrics can I track?" | Returns available metrics |
| | "Show all my metrics" | |
| **analyze_client_progress** | "How is John progressing?" | Returns progress analysis |
| | "Analyze Sarah's training this month" | |

---

## Quick Smoke Test Checklist

Run these 10 prompts to quickly verify core functionality:

| # | Prompt | Key Verification |
|---|--------|------------------|
| 1 | "Create a push day workout" | Workout card appears, columns are Reps/kg |
| 2 | "Assign it to John tomorrow" | Future date used, navigates to /athletes after confirm |
| 3 | "Add a weight loss goal for Sarah" | Target date ~6 months from today |
| 4 | "Record that Mike has knee pain" | Date is today, severity shown |
| 5 | "Draft a message for Emma about her progress" | Editable textarea, NOT email format |
| 6 | "Change John's coaching type to hybrid" | Uses "hybrid" not "athlete" |
| 7 | "Create a weekly check-in with yes/no and rating questions" | Navigates to /forms/check-ins after confirm |
| 8 | "Create a 1RM bench press metric" | Appears in /metrics without refresh |
| 9 | "Assign body weight metric to Sarah" | No loop, finds or creates metric |
| 10 | "Show me all my clients" | Tool shows "Loading your clients..." not raw name |

---

## Test Results Log

| Date | Tester | Issues Found | Notes |
|------|--------|--------------|-------|
| | | | |
| | | | |
| | | | |

---

## Known Limitations

1. **Reps ranges only**: The AI will only use ranges for reps (e.g., "8-12"), not for weight or other columns
2. **No image/video questions**: AI can't create progress photo or video type questions yet
3. **Metrics format**: AI creates basic metrics (number, percent, duration) - custom formats need manual setup
4. **Chat history**: Chat sessions are not persisted between page refreshes yet
