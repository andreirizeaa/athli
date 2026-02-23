# Trackable Fields Reference

## What is this?

Each exercise in a workout has configurable columns that determine what data is tracked for each set. The Workout Builder supports a wide range of trackable fields beyond the standard Sets, Reps, and Weight. You can choose which fields to display for each exercise, tailoring the tracking to the specific demands of the movement.

## Why is it useful?

Different exercises require different metrics. A barbell squat needs reps and weight in kilograms. A treadmill run needs minutes and speed. A plank needs seconds. By configuring the right fields for each exercise, you ensure clients log meaningful data and you get accurate analytics for programming decisions.

## Field Reference Table

| Category | Field | Description |
|----------|-------|-------------|
| Reps | Reps | Number of repetitions |
| Weight | Kg | Weight in kilograms |
| Weight | Lbs | Weight in pounds |
| Distance | Km | Distance in kilometres |
| Distance | M | Distance in metres |
| Distance | Yards | Distance in yards |
| Distance | Miles | Distance in miles |
| Distance | Feet | Distance in feet |
| Duration | Minutes | Duration in minutes |
| Duration | Seconds | Duration in seconds |
| Intensity | Tempo | Eccentric/pause/concentric/pause timing (e.g., 3-1-2-0) |
| Intensity | RIR | Reps In Reserve (how many reps left before failure) |
| Intensity | RPE | Rate of Perceived Exertion (1-10 scale) |
| Cardio | HR Zone | Heart rate zone (Zone 1-5) |
| Cardio | Calories | Calories burned |
| Cardio | Watts | Power output in watts |
| Cardio | Pace | Speed measured in time per distance unit |
| Cardio | Speed | Speed measurement |
| Cardio | Incline | Incline or grade percentage |
| Cardio | Height | Height measurement |
| Cardio | RPM | Revolutions per minute (e.g., cycling cadence) |
| Other | None | Disables the column entirely |
| Other | (Optional) | Makes the column optional for client input |

## Step-by-Step Guide

### Changing Fields for an Exercise

1. Open the Workout Builder and locate the exercise you want to configure.
2. Click on a column header (e.g., "Reps" or "Weight") to open the field selector.
3. A dropdown appears showing all available field options.
4. Select the desired field. The column updates immediately.
5. Repeat for additional columns as needed.

> [Screenshot: Column header dropdown showing available trackable fields]

### Customising Default Columns

You can set your preferred default columns so every new exercise starts with the fields you use most:

1. Navigate to **Settings > App > Customisations**.
2. Locate the default column configuration.
3. Select the fields you want as defaults (e.g., Reps, Kg, RPE).
4. Save your settings. All newly added exercises will use these defaults.

> [Screenshot: Settings page showing default column customisation]

## Things to Note

- You can display multiple columns simultaneously (e.g., Reps + Kg + RPE + Tempo).
- The "(Optional)" modifier makes a field available but does not require the client to fill it in.
- Setting a column to "None" hides it entirely for that exercise.
- Different exercises in the same workout can have different column configurations.
- Changes to default columns in Settings only affect newly added exercises, not existing ones.

## FAQs

**Can I have different units for different exercises?**
Yes. One exercise can track weight in Kg while another uses Lbs. Each exercise's columns are independent.

**What is the difference between Pace and Speed?**
Pace is measured as time per distance unit (e.g., minutes per kilometre), while Speed is measured as distance per time unit (e.g., km/h). Use whichever convention your client prefers.

**Can clients change the column configuration?**
Clients see the columns you configure. They cannot change which fields are displayed, ensuring data consistency.

**How do I add the RPE column to all exercises at once?**
Set RPE as a default column in Settings > App > Customisations. For existing exercises, you need to update each one individually.
