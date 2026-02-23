# Syncing Check-in Answers to Metrics

## What is this?

When you add a Number-type question to a check-in, you can link it to a metric. When the client submits their check-in, the number value they enter is automatically logged to the linked metric. This creates a seamless data flow between check-in responses and your metric tracking charts.

## Why is it useful?

Without syncing, clients would need to submit a check-in and then separately log the same value to a metric. That means double-entry, which is tedious and error-prone. By linking a check-in question directly to a metric, the data flows automatically. The client fills out the check-in once, and the metric chart updates on its own.

## Step-by-Step Guide

### Setting Up the Sync

1. Go to **Library > Forms > Check-ins**
2. Open the check-in you want to edit
3. Find the **Number** question you want to link (or create a new Number question)
4. Click on the question to edit it
5. Look for the **Link to Metric** option
6. Select the metric you want to sync to from the dropdown
7. Click **Save**

> [Screenshot: Number question with Link to Metric dropdown showing available metrics]

### How the Sync Works

1. The client opens their check-in on the mobile app
2. They enter a number value for the linked question (e.g., body weight: 82.5)
3. They submit the check-in
4. The value is automatically logged to the linked metric with the submission date
5. The metric chart updates to include the new data point

> [Screenshot: Metric chart showing data points synced from check-in submissions]

### Requirements for Syncing

- The check-in question must be a **Number** type. Text, Rating, Yes/No, Multiple Choice, and Scale questions cannot be synced to metrics.
- The metric must already exist in your library and be assigned to the client.
- One question can be linked to one metric at a time.

### Verifying the Sync

1. After a client submits a check-in with a linked question, go to their **Metrics** tab
2. Open the linked metric
3. You should see the new data point in the chart and history
4. The log entry will show it was synced from a check-in

> [Screenshot: Metric history entry showing source as check-in sync]

### Common Sync Scenarios

- **Body weight check-in**: Add a Number question "What is your weight today?" and link it to the client's weight metric
- **Sleep tracking**: Add a Number question "How many hours did you sleep?" and link it to a sleep hours metric
- **Measurements**: Add Number questions for waist, chest, or arm measurements and link each to the corresponding metric

## Things to Note

- Only Number-type questions support metric syncing
- If the client skips the question (and it is optional), no value is logged to the metric
- Editing a check-in response does not automatically update the synced metric value
- You can link multiple Number questions in the same check-in to different metrics

---

## FAQs

### Can I link one question to multiple metrics?

No. Each Number question can be linked to one metric at a time.

### What happens if I unlink a question from a metric?

Previously synced data points remain in the metric history. Only future submissions stop syncing.

### Can I manually edit a value that was synced from a check-in?

Yes. You can edit or delete any metric log entry from the client's Metrics tab, regardless of how it was created.

### Does the sync work retroactively?

No. Only check-in submissions made after the link is configured will sync to the metric.
