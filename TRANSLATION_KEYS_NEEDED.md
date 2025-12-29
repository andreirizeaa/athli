# Translation Keys Required for Save As Feature

The following translation keys need to be added to your i18n translation files for the "Save as Workout" and "Save as Program" features in the training calendar.

## Location
Add these keys to your `en.json` (and other locale files as needed) under the `athletes.trainingCalendar` namespace.

## Required Translation Keys

```json
{
  "athletes": {
    "trainingCalendar": {
      "saveAs": "Save as",
      "saveAsWorkout": {
        "title": "Save as Workout",
        "menuItem": "Save as Workout",
        "selectDate": "Select workout date you wish to use",
        "selectDatePlaceholder": "Select date",
        "selectDateAria": "Select workout date",
        "success": "Workout saved successfully",
        "error": "Failed to save workout",
        "errors": {
          "dateRequired": "Please select a workout date",
          "nameRequired": "Workout name is required",
          "typeRequired": "Workout type is required",
          "difficultyRequired": "Difficulty is required",
          "noWorkoutFound": "No workout found for the selected date",
          "workoutDataUnavailable": "Workout data is not available for the selected date"
        }
      },
      "saveAsProgram": {
        "title": "Save as Program",
        "menuItem": "Save as Program"
      }
    }
  }
}
```

## Files Using These Keys

### Training Calendar Page
- File: `apps/athli-web-app/app/athletes/[clientId]/training-calendar/page.tsx`
- Keys used:
  - `athletes.trainingCalendar.saveAs`
  - `athletes.trainingCalendar.saveAsWorkout.menuItem`
  - `athletes.trainingCalendar.saveAsProgram.menuItem`

### Save as Workout Side Panel
- File: `apps/athli-web-app/app/athletes/[clientId]/training-calendar/save-as-workout-side-panel.tsx`
- Keys used:
  - `athletes.trainingCalendar.saveAsWorkout.title`
  - `athletes.trainingCalendar.saveAsWorkout.selectDate`
  - `athletes.trainingCalendar.saveAsWorkout.selectDatePlaceholder`
  - `athletes.trainingCalendar.saveAsWorkout.selectDateAria`
  - `athletes.trainingCalendar.saveAsWorkout.success`
  - `athletes.trainingCalendar.saveAsWorkout.error`
  - `athletes.trainingCalendar.saveAsWorkout.errors.dateRequired`
  - `athletes.trainingCalendar.saveAsWorkout.errors.nameRequired`
  - `athletes.trainingCalendar.saveAsWorkout.errors.typeRequired`
  - `athletes.trainingCalendar.saveAsWorkout.errors.difficultyRequired`
  - `athletes.trainingCalendar.saveAsWorkout.errors.noWorkoutFound`
  - `athletes.trainingCalendar.saveAsWorkout.errors.workoutDataUnavailable`
  - Plus keys from `workouts.addWorkout.*` and `general.*`

### Save as Program Side Panel
- File: `apps/athli-web-app/app/athletes/[clientId]/training-calendar/save-as-program-side-panel.tsx`
- Keys used:
  - `athletes.trainingCalendar.saveAsProgram.title`
  - Plus keys from `general.*`

## Existing Keys Used

These features also use the following existing translation keys (ensure they exist):

### From `workouts.addWorkout` namespace:
- `workoutName`
- `workoutNamePlaceholder`
- `type`
- `typePlaceholder`
- `difficulty`
- `difficultyPlaceholder`
- `description`
- `descriptionOptional`
- `descriptionPlaceholder`

### From `general` namespace:
- `save`
- `saving`
- `cancel`

## Implementation Notes

1. The application uses `next-intl` for internationalization
2. All user-facing strings have been made i18n compliant
3. No hardcoded strings remain in the components
4. Error messages are properly internationalized for better UX
5. ARIA labels are also internationalized for accessibility

## Next Steps

1. Add these translation keys to your English translation file (typically `messages/en.json` or similar)
2. Add corresponding translations for any other languages your application supports
3. The components will automatically pick up the translations once the keys are added
4. Test the feature in different locales to ensure all translations display correctly
