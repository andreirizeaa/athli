# Syncing Metrics from Check-ins

## What is this?

Number-type questions in check-in forms can be linked to metrics so that when a client submits a check-in, the numerical value they enter is automatically logged to the corresponding metric. This creates a direct data pipeline from check-in responses to metric charts without any extra effort from the client.

## Why is it useful?

Many coaches track values like body weight or sleep hours through both check-ins and metrics. Without syncing, the client would need to enter the same number twice: once in the check-in and once in the metric. Linking the two eliminates double-entry, reduces friction for the client, and ensures your metric charts always stay up to date with the latest check-in data.

## Step-by-Step Guide

### Setting Up the Sync in the Check-in Builder

1. Go to **Library > Forms > Check-ins**
2. Open the check-in you want to configure
3. Find the **Number** question you want to link to a metric
4. Click on the question to open its settings
5. Look for the **Link to Metric** option
6. Select the target metric from the dropdown
7. Click **Save**

> [Screenshot 1: Check-in builder with Link to Metric option on a Number question]

### How the Data Flows

1. The check-in is assigned to a client with the linked question
2. The client opens the check-in on their mobile app
3. They enter a value for the linked Number question (e.g., 81.2 kg)
4. They submit the check-in
5. The value is automatically logged to the linked metric with the check-in submission date
6. The metric chart updates to include the new data point

### Viewing Synced Data

1. Go to the client's **Metrics** tab
2. Open the linked metric
3. The chart includes data points from both manual logs and check-in syncs
4. The history table shows each entry with its source
5. Synced entries are logged with the check-in submission date

> [Screenshot 2: Metric chart with data points sourced from check-in submissions]

### Common Sync Configurations

| Check-in Question | Linked Metric | Use Case |
|-------------------|---------------|----------|
| "What is your weight today?" | Body Weight | Weekly weigh-in tracking |
| "How many hours did you sleep?" | Sleep Hours | Daily sleep monitoring |
| "What is your waist measurement?" | Waist Circumference | Monthly measurement tracking |
| "How many steps did you take?" | Daily Steps | Daily activity tracking |
| "Rate your stress (1-10)" | Stress Level | Wellness monitoring |

### Requirements

- The check-in question must be a **Number** type
- The metric must exist in your library and be assigned to the client
- Each Number question can link to one metric
- Multiple questions in the same check-in can link to different metrics

## Things to Note

- Only Number-type questions support metric syncing. Other question types (Text, Rating, Yes/No, Multiple Choice, Scale) cannot be linked.
- If the client skips an optional linked question, no value is synced to the metric.
- Editing a check-in response after submission does not automatically update the synced metric value. You would need to edit the metric entry manually.
- The sync is one-directional: check-in to metric. Logging a metric value manually does not affect check-in responses.

---

## FAQs

### Can I link the same metric to questions in different check-ins?

Yes. If you have multiple check-ins with Number questions, each can link to the same metric. All synced values appear in one chart.

### What happens if I remove the link?

Previously synced data points remain in the metric history. Only future check-in submissions stop syncing.

### Can I sync Rating or Scale questions to metrics?

No. Only Number-type questions support metric syncing. For rating data, you would need to log it manually.

### Is there a way to tell which metric entries came from check-ins?

Yes. The metric history table indicates the source of each entry, so you can distinguish between manual logs and check-in syncs.
