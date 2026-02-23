# Habit Notifications and Reminders

## What is this?

Clients receive push notifications to remind them about their assigned habits. Notifications help clients stay on track by prompting them to log their habits at the right time. You can also set up automated reminder sequences through automation flows to follow up when habits are missed.

## Why is it useful?

Consistency is the key to habit formation, and timely reminders significantly improve adherence. Without notifications, clients may forget to log their habits, leading to gaps in tracking and lost momentum. Push notifications and automated follow-ups keep habits front of mind without you having to manually check in.

## Step-by-Step Guide

### How Default Notifications Work

1. When a habit is assigned, the client's mobile app schedules push notifications
2. Clients receive a reminder when a habit is due (daily or weekly, depending on the tracking period)
3. Tapping the notification opens the app directly to the habit for quick logging
4. Notifications continue for the duration of the habit assignment

> [Screenshot: Push notification on a client's phone reminding them to log a habit]

### Setting Up Automated Reminders

For more control over reminder timing and follow-ups, use automation flows:

1. Go to **Automations** from the sidebar
2. Create a new automation or edit an existing one
3. Set the trigger to **Habit Missed** or a time-based schedule
4. Add an action such as **Send Notification** or **Send Message**
5. Customize the message content to encourage the client
6. Save and activate the automation

> [Screenshot: Automation flow with a missed habit trigger and notification action]

### Missed Habit Follow-ups

Automation flows can trigger actions when a client misses a habit log:

- Send a gentle push notification reminder
- Send a direct message checking in on them
- Add a task to your to-do list to follow up personally
- Trigger a sequence of escalating reminders over multiple days

> [Screenshot: Automation sequence showing escalating reminders for missed habits]

### Ensuring Clients Have Notifications Enabled

For push notifications to work, clients must have them enabled on their device:

1. Ask clients to open their phone's **Settings**
2. Find the Athli app in the app list
3. Make sure **Notifications** are turned on
4. Also ensure **Do Not Disturb** is not blocking app notifications
5. If a client reports not receiving notifications, this is the first thing to check

### Best Practices for Reminder Timing

- **Morning habits** (water, supplements): set reminders for early morning
- **Activity habits** (stretching, walking): set reminders for the client's preferred workout time
- **Evening habits** (sleep logging, reflection): set reminders for early evening
- Avoid sending too many notifications. One per habit per day is usually sufficient.
- Personalize reminder messages to feel supportive, not nagging

## Things to Note

- Push notifications require the client to have the Athli app installed and notifications enabled
- Automation reminders are separate from default habit notifications
- You cannot control the exact time of default push notifications from the coach dashboard
- Clients can manage their notification preferences in the mobile app settings

---

## FAQs

### Can I customize the notification message?

Default habit notifications use standard messaging. For custom messages, use automation flows to send personalized reminders.

### What if a client turns off notifications?

They will not receive push reminders but can still log habits manually by opening the app. Encourage clients to keep notifications enabled.

### Can I set different reminder times for different habits?

Default notifications follow a system schedule. For specific timing, set up separate automation flows for each habit with time-based triggers.

### Do notifications work on both iOS and Android?

Yes. Push notifications are supported on both platforms as long as they are enabled in the device settings.
