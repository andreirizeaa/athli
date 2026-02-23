# Athli Help Center Documentation

This folder contains all help center articles for the Athli platform, structured for import into Intercom.

## Intercom Structure

Intercom uses **Collections** (top-level groups) and **Sections** (sub-groups within collections).

### Collection: Getting Started
> For new users setting up their account and learning the basics.

- 01-welcome-to-athli.md
- 02-creating-your-account.md
- 03-inviting-your-first-client.md
- 04-plans-and-billing.md

### Collection: Training and Programming
> Everything related to building and managing training for clients.

**Section: Workouts**
- coach-web/04-workout-builder.md
- (future) workout-builder-tips-and-tricks.md
- (future) using-ai-to-generate-workouts.md

**Section: Programs**
- coach-web/03-training-programs.md
- (future) assigning-programs-to-clients.md
- (future) editing-a-clients-program.md

**Section: Exercises**
- coach-web/05-exercise-library.md
- (future) creating-custom-exercises.md
- (future) exercise-videos-and-demos.md

**Section: Training on Mobile (Coach)**
- coach-mobile/04-training.md

**Section: Training on Mobile (Client)**
- client-mobile/03-training.md

### Collection: Client Management
> Managing your coaching roster and client profiles.

**Section: Adding and Managing Clients**
- coach-web/02-client-management.md
- (future) uploading-clients-via-csv.md
- (future) archiving-and-restoring-clients.md

**Section: Client Profiles**
- (future) client-overview-and-bio.md
- (future) goals-and-injuries.md
- coach-web/23-client-notes.md

**Section: Clients on Mobile (Coach)**
- coach-mobile/03-client-management.md

### Collection: Tracking and Progress
> Tools for monitoring client progress over time.

**Section: Check-ins**
- coach-web/06-check-ins.md
- client-mobile/06-check-ins.md
- (future) creating-check-in-templates.md
- (future) reviewing-check-in-submissions.md
- (future) comparing-check-ins.md

**Section: Questionnaires**
- coach-web/07-questionnaires.md
- (future) creating-questionnaire-templates.md

**Section: Habits**
- coach-web/08-habits.md
- client-mobile/07-habits.md
- (future) creating-and-assigning-habits.md

**Section: Metrics**
- coach-web/09-metrics.md
- client-mobile/08-metrics.md
- (future) creating-custom-metrics.md
- (future) understanding-metric-charts.md

**Section: Progress Photos**
- coach-web/10-progress-photos.md
- client-mobile/09-progress-photos.md
- (future) comparing-progress-photos.md

**Section: Exercise History**
- (future) viewing-exercise-history.md
- (future) exercise-progress-charts.md

### Collection: Communication
> Messaging and staying connected with clients.

**Section: Inbox (Coach Web)**
- coach-web/11-messaging.md
- (future) sending-broadcast-messages.md
- (future) sharing-files-in-chat.md
- (future) message-reactions-and-replies.md

**Section: Chat (Coach Mobile)**
- coach-mobile/05-messaging.md

**Section: Chat (Client)**
- client-mobile/05-messaging.md

### Collection: AI Assistant
> Using the AI coaching assistant.

- coach-web/12-ai-assistant.md
- coach-mobile/07-ai-assistant.md
- (future) ai-assistant-example-prompts.md
- (future) ai-action-cards-explained.md
- (future) ai-chat-history.md

### Collection: Automation
> Setting up automated workflows for your coaching business.

**Section: Flows**
- coach-web/13-automations.md

**Section: Onboarding**
- coach-web/14-onboarding-flows.md
- (future) creating-an-onboarding-sequence.md

**Section: Business Sequences**
- coach-web/22-business-sequences.md

### Collection: Business and Payments
> Managing packages, payments, coupons, and your coaching business.

**Section: Packages**
- coach-web/15-business-packages.md
- (future) creating-your-first-package.md
- (future) sharing-packages-with-clients.md

**Section: Coupons**
- coach-web/16-coupons.md

**Section: Stripe**
- (future) connecting-stripe.md
- (future) managing-payouts-and-refunds.md

### Collection: Files and Resources
> Sharing documents and files with clients.

- coach-web/17-files.md
- (future) organizing-files-into-folders.md

### Collection: Productivity
> Task management and staying organized.

- coach-web/18-todo-list.md
- (future) automated-tasks-vs-personal-tasks.md

### Collection: Account and Settings
> Managing your account, profile, and app preferences.

**Section: Coach Settings (Web)**
- coach-web/19-settings.md
- (future) updating-your-profile.md
- (future) notification-preferences.md
- (future) app-customisations.md
- (future) company-branding.md

**Section: Coach Settings (Mobile)**
- coach-mobile/08-settings.md

**Section: Client Settings**
- client-mobile/10-profile-and-settings.md

### Collection: Referrals
> Earning rewards by inviting other coaches.

- coach-web/20-refer-and-earn.md

### Collection: Feature Requests
> Submitting ideas and voting on platform improvements.

- coach-web/24-feature-requests.md

### Collection: Client App Guide
> Help articles specifically for clients using the mobile app.

- client-mobile/01-getting-started.md
- client-mobile/02-home-screen.md
- client-mobile/03-training.md
- client-mobile/04-progress.md
- client-mobile/05-messaging.md
- client-mobile/06-check-ins.md
- client-mobile/07-habits.md
- client-mobile/08-metrics.md
- client-mobile/09-progress-photos.md
- client-mobile/10-profile-and-settings.md

## Writing Guidelines

- No em dashes (use commas, periods, or "and" instead)
- Simple English (avoid jargon, write at a 6th-8th grade level)
- Each doc starts with: What it is, Why it is useful, Use cases
- Step-by-step guides with screenshot placeholders in format: `> [Screenshot: description of what to capture]`
- FAQs section at the bottom of every article
- Common Problems section where relevant
- Features span multiple articles across collections (e.g., check-ins appear in Tracking, Coach Mobile, and Client App)

## Screenshot Naming Convention

When adding screenshots, use this format:
`help-center/screenshots/{collection}/{article-slug}/{step-number}-{description}.png`

Example: `help-center/screenshots/training/workout-builder/03-exercise-search-panel.png`

## Future Articles

Items marked `(future)` are planned expansions. Each feature should eventually have:
1. A main overview article (what, why, use cases)
2. Step-by-step "how to" articles for specific tasks
3. Troubleshooting articles for common problems
4. Tips and tricks articles for power users
