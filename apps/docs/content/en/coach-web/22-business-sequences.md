# Business Sequences

Sequences let you automate a series of actions that run after a client purchases a package. Think of them as post-purchase workflows: when a client buys a package linked to a sequence, Athli automatically executes the steps you defined.

## What It Is

A sequence is a visual workflow built with a flow editor. You define a trigger (like a payment event) and then chain together actions such as sending a message, assigning a questionnaire, adding habits, or waiting a set amount of time before the next step.

## Why It Is Useful

- Automate client onboarding after purchase
- Ensure every new client gets the same welcome experience
- Save time by eliminating repetitive manual setup
- Create multi-step workflows with delays between actions

## Where to Find It

1. Go to **Business** in the sidebar.
2. Select **Sequences**.

> [Screenshot 1: sequences list page showing created sequences]

## Creating a Sequence

1. Click **Add Sequence**.
2. Enter a name and optional description.
3. Click **Save** to create the sequence.
4. You will be taken to the flow editor.

> [Screenshot 2: add sequence side panel with name and description fields]

## Using the Flow Editor

The flow editor is a visual canvas where you build your automation step by step.

### Triggers

Every sequence starts with a trigger. Available triggers include:

| Trigger | Description |
|---------|-------------|
| Check-in completed | Fires when a client completes a check-in |
| Missed workout | Fires when a client misses a scheduled workout |
| Missed check-in | Fires when a client misses a check-in |
| Missed habit log | Fires when a client misses a habit log |
| Missed metric log | Fires when a client misses a metric log |
| Inactive for 7 days | Fires when a client has been inactive for 7 days |

### Actions

After the trigger, you add actions that execute in order:

| Action | Description |
|--------|-------------|
| Send message | Automatically send a chat message to the client |
| Assign questionnaire | Assign a questionnaire from your library |
| Assign check-in | Assign a check-in form |
| Add file | Share a file with the client |
| Add habit | Assign a habit for tracking |
| Add metric | Assign a metric for tracking |
| Wait | Pause the sequence for a specified duration before continuing |
| Is check-in completed | Conditional check that branches based on completion |

### Building a Flow

1. Click the **trigger node** to select your trigger type.
2. Click the **+** button below to add an action.
3. Select an action type from the panel that appears.
4. Configure the action (e.g., select which questionnaire to assign).
5. Add more actions as needed, including **Wait** steps for delays.
6. Your changes save automatically.

> [Screenshot 3: flow editor with a trigger and multiple action nodes connected]

## Linking a Sequence to a Package

Once you create a sequence, you can link it to a business package so it runs automatically when a client purchases that package.

1. Go to **Business > Packages**.
2. Edit a package.
3. In the sequence field, select your sequence.
4. Save.

> [Screenshot 4: package edit form with sequence dropdown]

## Managing Sequences

From the sequences list, you can:

- **Search** sequences by name
- **Edit** a sequence by clicking on it
- **Delete** a sequence using the menu (note: sequences linked to packages cannot be deleted)

## FAQs

### Can I have multiple triggers in one sequence?

Each sequence has one trigger. Create separate sequences for different triggers.

### What happens if I delete a sequence that is linked to a package?

Athli will prevent deletion and show an error. Unlink the sequence from the package first.

### Can I test a sequence without a real purchase?

Currently, sequences run when the trigger condition is met. You can test by simulating the trigger action (e.g., completing a check-in for a test client).

### Do actions run immediately or in order?

Actions run in order from top to bottom. Use **Wait** actions to add delays between steps.
