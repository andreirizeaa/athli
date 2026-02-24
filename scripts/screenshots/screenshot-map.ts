/**
 * Maps screenshot placeholder text from articles to captured screenshot filenames.
 * 
 * Usage: After running the screenshot capture, use the replace-placeholders script
 * to swap `> [Screenshot: ...]` lines with actual `![...](./screenshots/...)` references.
 */

export const screenshotMap: Record<string, string> = {
  // getting-started/02
  'Sign up page with email and password fields': 'getting-started/02-sign-up-page.png',
  'Profile setup page during onboarding': 'getting-started/02-profile-setup.png',
  'Business settings page': 'getting-started/02-business-settings.png',
  'Home dashboard with summary cards': 'getting-started/02-home-dashboard.png',

  // getting-started/03
  'Add client side panel with form fields': 'getting-started/03-add-client-panel.png',
  'CSV upload side panel with template download': 'getting-started/03-csv-upload.png',
  'Invite link dialog with copy button': 'getting-started/03-invite-link.png',

  // getting-started/04
  'Billing page showing current plan and client count': 'getting-started/04-billing-page.png',
  'Plan selection page with pricing cards': 'getting-started/04-plan-selection.png',

  // getting-started/05
  'pricing page showing client slider with "I want to coach" selector': 'getting-started/05-pricing-page.png',
  'pricing page showing monthly/annual toggle': 'getting-started/05-pricing-page.png',
  'add-ons section on pricing page showing Automations, AI Assistant, and Payments': 'getting-started/05-pricing-page.png',
  'plan comparison table showing features across Starter, Pro, and Max': 'getting-started/05-pricing-page.png',

  // coach-web/01
  "Today's workouts card showing client workout cards with status indicators": 'coach-web/01-dashboard-full.png',
  'At-risk clients card with warning indicators': 'coach-web/01-dashboard-full.png',
  'Completed workouts card with filter dropdown': 'coach-web/01-dashboard-full.png',
  'To-do card with task items and checkboxes': 'coach-web/01-dashboard-full.png',
  'Summary cards row at top of dashboard': 'coach-web/01-dashboard-summary-cards.png',
  'Workout preview dialog with exercise details': 'coach-web/01-dashboard-workout-preview.png',
  'Quick message input on workout card': 'coach-web/01-dashboard-quick-message.png',

  // coach-web/02
  'Athletes page with client list and search bar': 'coach-web/02-athletes-list.png',
  'Add client side panel with form': 'coach-web/02-add-client-panel.png',
  'Client overview page with navigation tabs': 'coach-web/02-client-overview.png',
  'Edit client details side panel': 'coach-web/02-edit-client.png',
  'Client settings page with archive option': 'coach-web/02-client-settings.png',
  'Restore clients side panel': 'coach-web/02-restore-clients.png',
  'CSV upload side panel with preview': 'coach-web/02-csv-upload.png',

  // coach-web/03
  'New program form with name, description, and duration fields': 'coach-web/03-new-program-form.png',
  'Program builder grid showing weeks and days with workout cards': 'coach-web/03-program-builder.png',
  'Week row with copy button highlighted': 'coach-web/03-week-copy.png',
  'Workout card with save to library option': 'coach-web/03-workout-save.png',
  'Assign program side panel with week range selection': 'coach-web/03-assign-program.png',

  // coach-web/04
  'Empty workout builder with name field at top': 'coach-web/04-workout-builder-empty.png',
  'Exercise search panel with filters and results': 'coach-web/04-exercise-search.png',
  'AI workout generation input with generated result': 'coach-web/04-ai-generation.png',
  'Section builder with exercises grouped in a superset': 'coach-web/04-superset.png',
  'Exercise card being dragged to new position': 'coach-web/04-drag-exercise.png',
  'Exercise card with expanded column options': 'coach-web/04-exercise-columns.png',

  // coach-web/05
  'Exercise library page with search bar and filter options': 'coach-web/05-exercise-library.png',
  'Add exercise form with fields': 'coach-web/05-add-exercise.png',
  'Exercise list with checkboxes and duplicate button': 'coach-web/05-exercise-bulk.png',

  // coach-web/06
  'Check-in builder with different question types': 'coach-web/06-check-in-builder.png',
  'Assign check-in dialog with frequency options': 'coach-web/06-assign-check-in.png',
  'Check-in submission detail page with responses': 'coach-web/06-check-in-submission.png',
  'Check-in comparison view with two dates': 'coach-web/06-check-in-comparison.png',
  'Check-ins review page with submissions from multiple clients': 'coach-web/06-check-ins-review.png',

  // coach-web/07
  'Questionnaire builder with question types': 'coach-web/07-questionnaire-builder.png',
  'Assign questionnaire dialog': 'coach-web/07-assign-questionnaire.png',
  'Completed questionnaire with responses': 'coach-web/07-completed-questionnaire.png',

  // coach-web/08
  'Create habit form': 'coach-web/08-create-habit.png',
  'Assign habit dialog with library selection': 'coach-web/08-assign-habit.png',
  'Habit tab showing completion calendar and log entries': 'coach-web/08-client-habits.png',
  'Habit log entry with edit and delete options': 'coach-web/08-habit-log.png',

  // coach-web/09
  'Create metric form with type and unit selection': 'coach-web/09-create-metric.png',
  'Assign metric dialog': 'coach-web/09-assign-metric.png',
  'Log metric form with value input': 'coach-web/09-log-metric.png',
  'Metric detail view with chart and history table': 'coach-web/09-metric-detail.png',
  'Metrics library with folders': 'coach-web/09-metrics-library.png',

  // coach-web/10
  'Photos tab with date-based photo grid': 'coach-web/10-client-photos.png',
  'Add photo dialog with upload area': 'coach-web/10-add-photo.png',
  'Photo comparison view with two dates side by side': 'coach-web/10-photo-comparison.png',

  // coach-web/11
  'Inbox page with conversation list and message thread': 'coach-web/11-inbox.png',
  'Message input with attachment options': 'coach-web/11-message-input.png',
  'Message with emoji reaction selector': 'coach-web/11-reactions.png',
  'Reply preview above message input': 'coach-web/11-reply.png',
  'Broadcast side panel with client selection': 'coach-web/11-broadcast.png',
  'Chat with client profile panel open on the right': 'coach-web/11-inbox-conversation.png',

  // coach-web/12
  'AI finding inactive clients with results showing client names and days since last activity': 'coach-web/12-ai-inactive.png',
  'AI generating a workout with exercise cards showing sets, reps, and rest times': 'coach-web/12-ai-workout.png',
  'AI showing a progress analysis with metrics summary and trend indicators': 'coach-web/12-ai-progress.png',
  'AI showing a draft message card with edit and send options': 'coach-web/12-ai-message.png',
  'AI creating a check-in template with suggested questions': 'coach-web/12-ai-checkin.png',
  'Empty assistant page with capability overview cards': 'coach-web/12-ai-assistant-empty.png',
  'Action card for a generated workout showing exercises with confirm and edit buttons': 'coach-web/12-ai-action-card.png',
  'Chat sidebar showing conversation history with titles and dates': 'coach-web/12-ai-sidebar.png',
  'Side panel assistant open while viewing a client\'s training page': 'coach-web/12-ai-side-panel.png',
  'AI processing with tool call indicators showing data being fetched': 'coach-web/12-ai-processing.png',

  // coach-web/13
  'Flows page with list of automation flows': 'coach-web/13-flows-page.png',
  'Flow card with active toggle': 'coach-web/13-flow-card.png',
  'Flow detail page with trigger and action configuration': 'coach-web/13-flow-detail.png',
  'Request new flow button': 'coach-web/13-request-flow.png',

  // coach-web/14
  'Onboarding builder with step sequence': 'coach-web/14-onboarding-builder.png',
  'Add client form with onboarding flow selection': 'coach-web/14-onboarding-select.png',
  'Onboarding page with active processes and progress indicators': 'coach-web/14-onboarding-page.png',

  // coach-web/15
  'Business page with Connect Stripe button': 'coach-web/15-connect-stripe.png',
  'Create package form with pricing options': 'coach-web/15-create-package.png',
  'Package preview page as seen by clients': 'coach-web/15-package-preview.png',
  'Activity page with transaction list': 'coach-web/15-activity-page.png',

  // coach-web/16
  'Create coupon form with discount options': 'coach-web/16-create-coupon.png',
  'Coupon list with deactivate option': 'coach-web/16-coupons-page.png',

  // coach-web/17
  'Files library page with folders and upload button': 'coach-web/17-files-library.png',
  'Client files tab with assigned files': 'coach-web/17-client-files.png',
  'Folder management with create and move options': 'coach-web/17-folder-management.png',

  // coach-web/18
  'To-do Athli Assistant tab with automated task list': 'coach-web/18-todo-athli-assistant.png',
  'To-do Your List tab with personal tasks and add button': 'coach-web/18-todo-your-list.png',

  // coach-web/19
  'Profile settings page with name and timezone fields': 'coach-web/19-settings-profile.png',
  'Security settings page': 'coach-web/19-settings-security.png',
  'Company information settings page': 'coach-web/19-settings-company.png',
  'App customisations page with column toggles': 'coach-web/19-settings-customisations.png',
  'Notification preferences page': 'coach-web/19-settings-notifications.png',
  'Danger zone settings with delete account option': 'coach-web/19-settings-danger-zone.png',

  // coach-web/20
  'Refer and earn page with referral link and copy button': 'coach-web/20-refer-and-earn.png',
  'Referral code section': 'coach-web/20-refer-and-earn.png',
  'Referral stats showing signups and rewards': 'coach-web/20-refer-and-earn.png',

  // coach-web/22
  'sequences list page showing created sequences': 'coach-web/22-sequences-list.png',
  'add sequence side panel with name and description fields': 'coach-web/22-add-sequence.png',
  'flow editor with a trigger and multiple action nodes connected': 'coach-web/22-flow-editor.png',
  'package edit form with sequence dropdown': 'coach-web/22-package-sequence.png',

  // coach-web/23
  'client profile with Notes tab selected showing list of notes': 'coach-web/23-client-notes.png',
  'create note side panel with title and content fields': 'coach-web/23-create-note.png',
  'note detail view in side panel with edit capability': 'coach-web/23-note-detail.png',
  'notes list with multiple notes selected and delete button visible': 'coach-web/23-notes-bulk-delete.png',

  // coach-web/24
  'feature requests page showing list of requests with vote counts': 'coach-web/24-feature-requests.png',
  'add feature request dialog with title and description fields': 'coach-web/24-add-request.png',
  'feature request card with upvote button and vote count': 'coach-web/24-request-card.png',
  'feature request detail view with replies': 'coach-web/24-request-detail.png',

  // coach-web/25
  'section library page showing list of saved sections': 'coach-web/25-sections-library.png',
  'section builder with exercises added and type selected': 'coach-web/25-section-builder.png',
  'exercise selection panel within the section builder': 'coach-web/25-exercise-select.png',
  'exercise card showing set configuration with linked values': 'coach-web/25-set-config.png',
  'sections list with filters and bulk actions': 'coach-web/25-sections-bulk.png',

  // coach-web/26
  'billing page showing current plan card with plan details and client usage bar': 'coach-web/26-billing-page.png',
  'client usage progress bar on billing page': 'coach-web/26-billing-page.png',
  'pricing page in update mode showing plan cards with current plan highlighted': 'coach-web/26-pricing-update.png',
  'billing page showing "Changes scheduled" badge with current and upcoming plan cards': 'coach-web/26-billing-scheduled.png',
  'billing page showing an add-on with "cancelling" status and reactivate option': 'coach-web/26-addon-cancelling.png',
  'invoices table showing recent billing history': 'coach-web/26-invoices.png',

  // coach-web/27
  'cancel subscription confirmation dialog': 'coach-web/27-cancel-dialog.png',
  'billing page showing reactivate option for a subscription scheduled for cancellation': 'coach-web/27-reactivate.png',
  'danger zone page showing cancel subscription and delete account sections': 'coach-web/27-danger-zone.png',
};
