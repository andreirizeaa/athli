import {
  BookOpen,
  Dumbbell,
  Users,
  FileText,
  BarChart3,
  MessageCircle,
  Bot,
  Zap,
  Package,
  FolderOpen,
  CheckSquare,
  Settings,
  Gift,
  Lightbulb,
  Smartphone,
  CreditCard,
  Shield,
} from 'lucide-react';

export type Article = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
};

export type Section = {
  titleKey: string;
  articles: Article[];
};

export type Collection = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ComponentType<{ className?: string }>;
  sections?: Section[];
  articles?: Article[];
};

export const collections: Collection[] = [
  {
    slug: 'getting-started',
    titleKey: 'collections.gettingStarted.title',
    descriptionKey: 'collections.gettingStarted.description',
    icon: BookOpen,
    articles: [
      { slug: 'welcome-to-athli', titleKey: 'articles.welcomeToAthli.title', descriptionKey: 'articles.welcomeToAthli.description' },
      { slug: 'creating-your-account', titleKey: 'articles.creatingYourAccount.title', descriptionKey: 'articles.creatingYourAccount.description' },
      { slug: 'inviting-your-first-client', titleKey: 'articles.invitingYourFirstClient.title', descriptionKey: 'articles.invitingYourFirstClient.description' },
      { slug: 'plans-and-billing', titleKey: 'articles.plansAndBilling.title', descriptionKey: 'articles.plansAndBilling.description' },
      { slug: 'understanding-plans', titleKey: 'articles.understandingPlans.title', descriptionKey: 'articles.understandingPlans.description' },
    ],
  },
  {
    slug: 'training',
    titleKey: 'collections.training.title',
    descriptionKey: 'collections.training.description',
    icon: Dumbbell,
    sections: [
      {
        titleKey: 'sections.workoutBuilder',
        articles: [
          { slug: 'workout-builder', titleKey: 'articles.workoutBuilder.title', descriptionKey: 'articles.workoutBuilder.description' },
          { slug: 'adding-exercises-to-workout', titleKey: 'articles.addingExercisesToWorkout.title', descriptionKey: 'articles.addingExercisesToWorkout.description' },
          { slug: 'adding-deleting-sets', titleKey: 'articles.addingDeletingSets.title', descriptionKey: 'articles.addingDeletingSets.description' },
          { slug: 'creating-supersets', titleKey: 'articles.creatingSupersets.title', descriptionKey: 'articles.creatingSupersets.description' },
          { slug: 'creating-workout-sections', titleKey: 'articles.creatingWorkoutSections.title', descriptionKey: 'articles.creatingWorkoutSections.description' },
          { slug: 'drag-drop-reorder-exercises', titleKey: 'articles.dragDropReorderExercises.title', descriptionKey: 'articles.dragDropReorderExercises.description' },
          { slug: 'copy-paste-workouts', titleKey: 'articles.copyPasteWorkouts.title', descriptionKey: 'articles.copyPasteWorkouts.description' },
          { slug: 'custom-exercises-demo-videos', titleKey: 'articles.customExercisesDemoVideos.title', descriptionKey: 'articles.customExercisesDemoVideos.description' },
          { slug: 'alternate-exercises', titleKey: 'articles.alternateExercises.title', descriptionKey: 'articles.alternateExercises.description' },
          { slug: 'warm-up-sets', titleKey: 'articles.warmUpSets.title', descriptionKey: 'articles.warmUpSets.description' },
          { slug: 'drop-sets-failure-sets', titleKey: 'articles.dropSetsFailureSets.title', descriptionKey: 'articles.dropSetsFailureSets.description' },
          { slug: 'rep-ranges-weight-ranges', titleKey: 'articles.repRangesWeightRanges.title', descriptionKey: 'articles.repRangesWeightRanges.description' },
          { slug: 'exercise-notes', titleKey: 'articles.exerciseNotes.title', descriptionKey: 'articles.exerciseNotes.description' },
          { slug: 'trackable-fields-reference', titleKey: 'articles.trackableFieldsReference.title', descriptionKey: 'articles.trackableFieldsReference.description' },
          { slug: 'using-tempo', titleKey: 'articles.usingTempo.title', descriptionKey: 'articles.usingTempo.description' },
          { slug: 'using-rpe-rir', titleKey: 'articles.usingRpeRir.title', descriptionKey: 'articles.usingRpeRir.description' },
          { slug: 'ai-workout-generation', titleKey: 'articles.aiWorkoutGeneration.title', descriptionKey: 'articles.aiWorkoutGeneration.description' },
        ],
      },
      {
        titleKey: 'sections.sectionBuilder',
        articles: [
          { slug: 'section-builder', titleKey: 'articles.sectionBuilder.title', descriptionKey: 'articles.sectionBuilder.description' },
          { slug: 'what-are-sections', titleKey: 'articles.whatAreSections.title', descriptionKey: 'articles.whatAreSections.description' },
          { slug: 'regular-sections', titleKey: 'articles.regularSections.title', descriptionKey: 'articles.regularSections.description' },
          { slug: 'amrap-sections', titleKey: 'articles.amrapSections.title', descriptionKey: 'articles.amrapSections.description' },
          { slug: 'emom-sections', titleKey: 'articles.emomSections.title', descriptionKey: 'articles.emomSections.description' },
          { slug: 'tabata-sections', titleKey: 'articles.tabataSections.title', descriptionKey: 'articles.tabataSections.description' },
          { slug: 'hiit-sections', titleKey: 'articles.hiitSections.title', descriptionKey: 'articles.hiitSections.description' },
          { slug: 'circuit-sections', titleKey: 'articles.circuitSections.title', descriptionKey: 'articles.circuitSections.description' },
          { slug: 'saving-sections-to-library', titleKey: 'articles.savingSectionsToLibrary.title', descriptionKey: 'articles.savingSectionsToLibrary.description' },
        ],
      },
      {
        titleKey: 'sections.exercises',
        articles: [
          { slug: 'exercise-library', titleKey: 'articles.exerciseLibrary.title', descriptionKey: 'articles.exerciseLibrary.description' },
          { slug: 'browsing-exercises', titleKey: 'articles.browsingExercises.title', descriptionKey: 'articles.browsingExercises.description' },
          { slug: 'creating-custom-exercises', titleKey: 'articles.creatingCustomExercises.title', descriptionKey: 'articles.creatingCustomExercises.description' },
          { slug: 'filtering-exercises', titleKey: 'articles.filteringExercises.title', descriptionKey: 'articles.filteringExercises.description' },
          { slug: 'musclewiki-integration', titleKey: 'articles.musclewikiIntegration.title', descriptionKey: 'articles.musclewikiIntegration.description' },
        ],
      },
      {
        titleKey: 'sections.programBuilder',
        articles: [
          { slug: 'training-programs', titleKey: 'articles.trainingPrograms.title', descriptionKey: 'articles.trainingPrograms.description' },
          { slug: 'creating-programs', titleKey: 'articles.creatingPrograms.title', descriptionKey: 'articles.creatingPrograms.description' },
          { slug: 'assigning-programs-to-clients', titleKey: 'articles.assigningProgramsToClients.title', descriptionKey: 'articles.assigningProgramsToClients.description' },
          { slug: 'program-structure-scheduling', titleKey: 'articles.programStructureScheduling.title', descriptionKey: 'articles.programStructureScheduling.description' },
        ],
      },
      {
        titleKey: 'sections.trainingMobileCoach',
        articles: [
          { slug: 'training-mobile-coach', titleKey: 'articles.trainingMobileCoach.title', descriptionKey: 'articles.trainingMobileCoach.description' },
        ],
      },
      {
        titleKey: 'sections.trainingMobileClient',
        articles: [
          { slug: 'training-mobile-client', titleKey: 'articles.trainingMobileClient.title', descriptionKey: 'articles.trainingMobileClient.description' },
        ],
      },
    ],
  },
  {
    slug: 'client-management',
    titleKey: 'collections.clientManagement.title',
    descriptionKey: 'collections.clientManagement.description',
    icon: Users,
    sections: [
      {
        titleKey: 'sections.managingClients',
        articles: [
          { slug: 'client-management', titleKey: 'articles.clientManagement.title', descriptionKey: 'articles.clientManagement.description' },
        ],
      },
      {
        titleKey: 'sections.clientProfiles',
        articles: [
          { slug: 'client-notes', titleKey: 'articles.clientNotes.title', descriptionKey: 'articles.clientNotes.description' },
        ],
      },
      {
        titleKey: 'sections.clientsMobileCoach',
        articles: [
          { slug: 'client-management-mobile', titleKey: 'articles.clientManagementMobile.title', descriptionKey: 'articles.clientManagementMobile.description' },
        ],
      },
    ],
  },
  {
    slug: 'forms',
    titleKey: 'collections.forms.title',
    descriptionKey: 'collections.forms.description',
    icon: FileText,
    sections: [
      {
        titleKey: 'sections.checkIns',
        articles: [
          { slug: 'check-ins', titleKey: 'articles.checkIns.title', descriptionKey: 'articles.checkIns.description' },
          { slug: 'check-in-question-types', titleKey: 'articles.checkInQuestionTypes.title', descriptionKey: 'articles.checkInQuestionTypes.description' },
          { slug: 'adding-photo-questions', titleKey: 'articles.addingPhotoQuestions.title', descriptionKey: 'articles.addingPhotoQuestions.description' },
          { slug: 'syncing-check-ins-to-metrics', titleKey: 'articles.syncingCheckInsToMetrics.title', descriptionKey: 'articles.syncingCheckInsToMetrics.description' },
          { slug: 'scheduling-check-ins', titleKey: 'articles.schedulingCheckIns.title', descriptionKey: 'articles.schedulingCheckIns.description' },
          { slug: 'check-ins-mobile', titleKey: 'articles.checkInsMobile.title', descriptionKey: 'articles.checkInsMobile.description' },
        ],
      },
      {
        titleKey: 'sections.questionnaires',
        articles: [
          { slug: 'questionnaires', titleKey: 'articles.questionnaires.title', descriptionKey: 'articles.questionnaires.description' },
        ],
      },
      {
        titleKey: 'sections.formBuilderMobile',
        articles: [
          { slug: 'check-in-builder-mobile', titleKey: 'articles.checkInBuilderMobile.title', descriptionKey: 'articles.checkInBuilderMobile.description' },
          { slug: 'questionnaire-builder-mobile', titleKey: 'articles.questionnaireBuilderMobile.title', descriptionKey: 'articles.questionnaireBuilderMobile.description' },
          { slug: 'assigning-forms-mobile', titleKey: 'articles.assigningFormsMobile.title', descriptionKey: 'articles.assigningFormsMobile.description' },
          { slug: 'reviewing-check-ins-mobile', titleKey: 'articles.reviewingCheckInsMobile.title', descriptionKey: 'articles.reviewingCheckInsMobile.description' },
        ],
      },
    ],
  },
  {
    slug: 'tracking-and-progress',
    titleKey: 'collections.trackingAndProgress.title',
    descriptionKey: 'collections.trackingAndProgress.description',
    icon: BarChart3,
    sections: [
      {
        titleKey: 'sections.habits',
        articles: [
          { slug: 'habits', titleKey: 'articles.habits.title', descriptionKey: 'articles.habits.description' },
          { slug: 'creating-habits', titleKey: 'articles.creatingHabits.title', descriptionKey: 'articles.creatingHabits.description' },
          { slug: 'habit-units-periods', titleKey: 'articles.habitUnitsPeriods.title', descriptionKey: 'articles.habitUnitsPeriods.description' },
          { slug: 'habit-notifications-reminders', titleKey: 'articles.habitNotificationsReminders.title', descriptionKey: 'articles.habitNotificationsReminders.description' },
          { slug: 'habit-tracking-streaks', titleKey: 'articles.habitTrackingStreaks.title', descriptionKey: 'articles.habitTrackingStreaks.description' },
          { slug: 'habits-mobile', titleKey: 'articles.habitsMobile.title', descriptionKey: 'articles.habitsMobile.description' },
        ],
      },
      {
        titleKey: 'sections.metrics',
        articles: [
          { slug: 'metrics', titleKey: 'articles.metrics.title', descriptionKey: 'articles.metrics.description' },
          { slug: 'creating-metrics', titleKey: 'articles.creatingMetrics.title', descriptionKey: 'articles.creatingMetrics.description' },
          { slug: 'logging-metrics-viewing-charts', titleKey: 'articles.loggingMetricsViewingCharts.title', descriptionKey: 'articles.loggingMetricsViewingCharts.description' },
          { slug: 'syncing-metrics-from-check-ins', titleKey: 'articles.syncingMetricsFromCheckIns.title', descriptionKey: 'articles.syncingMetricsFromCheckIns.description' },
          { slug: 'progress-tracking-metrics', titleKey: 'articles.progressTrackingMetrics.title', descriptionKey: 'articles.progressTrackingMetrics.description' },
          { slug: 'metrics-mobile', titleKey: 'articles.metricsMobile.title', descriptionKey: 'articles.metricsMobile.description' },
        ],
      },
      {
        titleKey: 'sections.progressPhotos',
        articles: [
          { slug: 'progress-photos', titleKey: 'articles.progressPhotos.title', descriptionKey: 'articles.progressPhotos.description' },
          { slug: 'progress-photos-mobile', titleKey: 'articles.progressPhotosMobile.title', descriptionKey: 'articles.progressPhotosMobile.description' },
        ],
      },
    ],
  },
  {
    slug: 'communication',
    titleKey: 'collections.communication.title',
    descriptionKey: 'collections.communication.description',
    icon: MessageCircle,
    sections: [
      {
        titleKey: 'sections.inboxCoachWeb',
        articles: [
          { slug: 'messaging', titleKey: 'articles.messaging.title', descriptionKey: 'articles.messaging.description' },
        ],
      },
      {
        titleKey: 'sections.chatCoachMobile',
        articles: [
          { slug: 'messaging-mobile-coach', titleKey: 'articles.messagingMobileCoach.title', descriptionKey: 'articles.messagingMobileCoach.description' },
        ],
      },
      {
        titleKey: 'sections.chatClient',
        articles: [
          { slug: 'messaging-mobile-client', titleKey: 'articles.messagingMobileClient.title', descriptionKey: 'articles.messagingMobileClient.description' },
        ],
      },
    ],
  },
  {
    slug: 'ai-assistant',
    titleKey: 'collections.aiAssistant.title',
    descriptionKey: 'collections.aiAssistant.description',
    icon: Bot,
    sections: [
      {
        titleKey: 'sections.aiAssistantWeb',
        articles: [
          { slug: 'ai-assistant', titleKey: 'articles.aiAssistant.title', descriptionKey: 'articles.aiAssistant.description' },
          { slug: 'ai-client-management', titleKey: 'articles.aiClientManagement.title', descriptionKey: 'articles.aiClientManagement.description' },
          { slug: 'ai-training-capabilities', titleKey: 'articles.aiTrainingCapabilities.title', descriptionKey: 'articles.aiTrainingCapabilities.description' },
          { slug: 'ai-progress-capabilities', titleKey: 'articles.aiProgressCapabilities.title', descriptionKey: 'articles.aiProgressCapabilities.description' },
          { slug: 'ai-communication-capabilities', titleKey: 'articles.aiCommunicationCapabilities.title', descriptionKey: 'articles.aiCommunicationCapabilities.description' },
          { slug: 'ai-action-cards-chat-history', titleKey: 'articles.aiActionCardsChatHistory.title', descriptionKey: 'articles.aiActionCardsChatHistory.description' },
        ],
      },
      {
        titleKey: 'sections.aiAssistantMobile',
        articles: [
          { slug: 'ai-assistant-mobile', titleKey: 'articles.aiAssistantMobile.title', descriptionKey: 'articles.aiAssistantMobile.description' },
        ],
      },
    ],
  },
  {
    slug: 'automation',
    titleKey: 'collections.automation.title',
    descriptionKey: 'collections.automation.description',
    icon: Zap,
    sections: [
      {
        titleKey: 'sections.flows',
        articles: [
          { slug: 'automations', titleKey: 'articles.automations.title', descriptionKey: 'articles.automations.description' },
        ],
      },
      {
        titleKey: 'sections.onboarding',
        articles: [
          { slug: 'onboarding-flows', titleKey: 'articles.onboardingFlows.title', descriptionKey: 'articles.onboardingFlows.description' },
        ],
      },
      {
        titleKey: 'sections.businessSequences',
        articles: [
          { slug: 'business-sequences', titleKey: 'articles.businessSequences.title', descriptionKey: 'articles.businessSequences.description' },
        ],
      },
    ],
  },
  {
    slug: 'business-and-payments',
    titleKey: 'collections.businessAndPayments.title',
    descriptionKey: 'collections.businessAndPayments.description',
    icon: Package,
    sections: [
      {
        titleKey: 'sections.packages',
        articles: [
          { slug: 'connecting-stripe', titleKey: 'articles.connectingStripe.title', descriptionKey: 'articles.connectingStripe.description' },
          { slug: 'creating-packages', titleKey: 'articles.creatingPackages.title', descriptionKey: 'articles.creatingPackages.description' },
          { slug: 'business-packages', titleKey: 'articles.businessPackages.title', descriptionKey: 'articles.businessPackages.description' },
          { slug: 'client-purchase-flow', titleKey: 'articles.clientPurchaseFlow.title', descriptionKey: 'articles.clientPurchaseFlow.description' },
        ],
      },
      {
        titleKey: 'sections.coupons',
        articles: [
          { slug: 'coupons', titleKey: 'articles.coupons.title', descriptionKey: 'articles.coupons.description' },
        ],
      },
      {
        titleKey: 'sections.paymentActivity',
        articles: [
          { slug: 'payment-activity-summary', titleKey: 'articles.paymentActivitySummary.title', descriptionKey: 'articles.paymentActivitySummary.description' },
        ],
      },
      {
        titleKey: 'sections.businessSequences',
        articles: [
          { slug: 'business-sequences', titleKey: 'articles.businessSequences.title', descriptionKey: 'articles.businessSequences.description' },
        ],
      },
      {
        titleKey: 'sections.subscriptionManagement',
        articles: [
          { slug: 'managing-subscription', titleKey: 'articles.managingSubscription.title', descriptionKey: 'articles.managingSubscription.description' },
          { slug: 'cancelling-reactivating', titleKey: 'articles.cancellingReactivating.title', descriptionKey: 'articles.cancellingReactivating.description' },
        ],
      },
    ],
  },
  {
    slug: 'files-and-resources',
    titleKey: 'collections.filesAndResources.title',
    descriptionKey: 'collections.filesAndResources.description',
    icon: FolderOpen,
    articles: [
      { slug: 'files', titleKey: 'articles.files.title', descriptionKey: 'articles.files.description' },
      { slug: 'sharing-files-with-clients', titleKey: 'articles.sharingFilesWithClients.title', descriptionKey: 'articles.sharingFilesWithClients.description' },
    ],
  },
  {
    slug: 'productivity',
    titleKey: 'collections.productivity.title',
    descriptionKey: 'collections.productivity.description',
    icon: CheckSquare,
    articles: [
      { slug: 'todo-list', titleKey: 'articles.todoList.title', descriptionKey: 'articles.todoList.description' },
    ],
  },
  {
    slug: 'account-and-settings',
    titleKey: 'collections.accountAndSettings.title',
    descriptionKey: 'collections.accountAndSettings.description',
    icon: Settings,
    sections: [
      {
        titleKey: 'sections.coachSettingsWeb',
        articles: [
          { slug: 'settings', titleKey: 'articles.settings.title', descriptionKey: 'articles.settings.description' },
        ],
      },
      {
        titleKey: 'sections.coachSettingsMobile',
        articles: [
          { slug: 'settings-mobile', titleKey: 'articles.settingsMobile.title', descriptionKey: 'articles.settingsMobile.description' },
        ],
      },
      {
        titleKey: 'sections.clientSettings',
        articles: [
          { slug: 'profile-and-settings-client', titleKey: 'articles.profileAndSettingsClient.title', descriptionKey: 'articles.profileAndSettingsClient.description' },
        ],
      },
    ],
  },
  {
    slug: 'referrals',
    titleKey: 'collections.referrals.title',
    descriptionKey: 'collections.referrals.description',
    icon: Gift,
    articles: [
      { slug: 'refer-and-earn', titleKey: 'articles.referAndEarn.title', descriptionKey: 'articles.referAndEarn.description' },
    ],
  },
  {
    slug: 'feature-requests',
    titleKey: 'collections.featureRequests.title',
    descriptionKey: 'collections.featureRequests.description',
    icon: Lightbulb,
    articles: [
      { slug: 'feature-requests', titleKey: 'articles.featureRequests.title', descriptionKey: 'articles.featureRequests.description' },
    ],
  },
  {
    slug: 'client-app-guide',
    titleKey: 'collections.clientAppGuide.title',
    descriptionKey: 'collections.clientAppGuide.description',
    icon: Smartphone,
    articles: [
      { slug: 'client-getting-started', titleKey: 'articles.clientGettingStarted.title', descriptionKey: 'articles.clientGettingStarted.description' },
      { slug: 'client-home-screen', titleKey: 'articles.clientHomeScreen.title', descriptionKey: 'articles.clientHomeScreen.description' },
      { slug: 'client-training', titleKey: 'articles.clientTraining.title', descriptionKey: 'articles.clientTraining.description' },
      { slug: 'client-progress', titleKey: 'articles.clientProgress.title', descriptionKey: 'articles.clientProgress.description' },
      { slug: 'client-messaging', titleKey: 'articles.clientMessaging.title', descriptionKey: 'articles.clientMessaging.description' },
    ],
  },
  {
    slug: 'data-and-privacy',
    titleKey: 'collections.dataAndPrivacy.title',
    descriptionKey: 'collections.dataAndPrivacy.description',
    icon: Shield,
    articles: [
      { slug: 'third-party-integrations', titleKey: 'articles.thirdPartyIntegrations.title', descriptionKey: 'articles.thirdPartyIntegrations.description' },
    ],
  },
];

// Map article slugs to their markdown file paths (relative to docs/help-center)
export const articleFiles: Record<string, string> = {
  // Getting Started
  'welcome-to-athli': 'getting-started/01-welcome-to-athli.md',
  'creating-your-account': 'getting-started/02-creating-your-account.md',
  'inviting-your-first-client': 'getting-started/03-inviting-your-first-client.md',
  'plans-and-billing': 'getting-started/04-plans-and-billing.md',
  'understanding-plans': 'getting-started/05-understanding-plans.md',

  // Training > Workout Builder
  'workout-builder': 'coach-web/04-workout-builder.md',
  'adding-exercises-to-workout': 'coach-web/28-adding-exercises-to-workout.md',
  'adding-deleting-sets': 'coach-web/29-adding-deleting-sets.md',
  'creating-supersets': 'coach-web/30-creating-supersets.md',
  'creating-workout-sections': 'coach-web/31-creating-workout-sections.md',
  'drag-drop-reorder-exercises': 'coach-web/32-drag-drop-reorder-exercises.md',
  'copy-paste-workouts': 'coach-web/33-copy-paste-workouts.md',
  'custom-exercises-demo-videos': 'coach-web/34-custom-exercises-demo-videos.md',
  'alternate-exercises': 'coach-web/35-alternate-exercises.md',
  'warm-up-sets': 'coach-web/36-warm-up-sets.md',
  'drop-sets-failure-sets': 'coach-web/37-drop-sets-failure-sets.md',
  'rep-ranges-weight-ranges': 'coach-web/38-rep-ranges-weight-ranges.md',
  'exercise-notes': 'coach-web/39-exercise-notes.md',
  'trackable-fields-reference': 'coach-web/40-trackable-fields-reference.md',
  'using-tempo': 'coach-web/41-using-tempo.md',
  'using-rpe-rir': 'coach-web/42-using-rpe-rir.md',
  'ai-workout-generation': 'coach-web/43-ai-workout-generation.md',

  // Training > Section Builder
  'section-builder': 'coach-web/25-section-builder.md',
  'what-are-sections': 'coach-web/44-what-are-sections.md',
  'regular-sections': 'coach-web/45-regular-sections.md',
  'amrap-sections': 'coach-web/46-amrap-sections.md',
  'emom-sections': 'coach-web/47-emom-sections.md',
  'tabata-sections': 'coach-web/48-tabata-sections.md',
  'hiit-sections': 'coach-web/49-hiit-sections.md',
  'circuit-sections': 'coach-web/50-circuit-sections.md',
  'saving-sections-to-library': 'coach-web/51-saving-sections-to-library.md',

  // Training > Exercises
  'exercise-library': 'coach-web/05-exercise-library.md',
  'browsing-exercises': 'coach-web/52-browsing-exercises.md',
  'creating-custom-exercises': 'coach-web/53-creating-custom-exercises.md',
  'filtering-exercises': 'coach-web/54-filtering-exercises.md',
  'musclewiki-integration': 'coach-web/55-musclewiki-integration.md',

  // Training > Programs
  'training-programs': 'coach-web/03-training-programs.md',
  'creating-programs': 'coach-web/56-creating-programs.md',
  'assigning-programs-to-clients': 'coach-web/57-assigning-programs-to-clients.md',
  'program-structure-scheduling': 'coach-web/58-program-structure-scheduling.md',

  // Training > Mobile
  'training-mobile-coach': 'coach-mobile/04-training.md',
  'training-mobile-client': 'client-mobile/03-training.md',

  // Client Management
  'client-management': 'coach-web/02-client-management.md',
  'client-notes': 'coach-web/23-client-notes.md',
  'client-management-mobile': 'coach-mobile/03-client-management.md',

  // Forms > Check-ins
  'check-ins': 'coach-web/06-check-ins.md',
  'check-in-question-types': 'coach-web/59-check-in-question-types.md',
  'adding-photo-questions': 'coach-web/60-adding-photo-questions.md',
  'syncing-check-ins-to-metrics': 'coach-web/61-syncing-check-ins-to-metrics.md',
  'scheduling-check-ins': 'coach-web/62-scheduling-check-ins.md',
  'check-ins-mobile': 'client-mobile/06-check-ins.md',

  // Forms > Questionnaires
  'questionnaires': 'coach-web/07-questionnaires.md',

  // Forms > Form Builder (Mobile)
  'check-in-builder-mobile': 'coach-mobile/01-check-in-builder-mobile.md',
  'questionnaire-builder-mobile': 'coach-mobile/02-questionnaire-builder-mobile.md',
  'assigning-forms-mobile': 'coach-mobile/03-assigning-forms-mobile.md',
  'reviewing-check-ins-mobile': 'coach-mobile/04-reviewing-check-ins-mobile.md',

  // Tracking > Habits
  'habits': 'coach-web/08-habits.md',
  'creating-habits': 'coach-web/64-creating-habits.md',
  'habit-units-periods': 'coach-web/65-habit-units-periods.md',
  'habit-notifications-reminders': 'coach-web/66-habit-notifications-reminders.md',
  'habit-tracking-streaks': 'coach-web/67-habit-tracking-streaks.md',
  'habits-mobile': 'client-mobile/07-habits.md',

  // Tracking > Metrics
  'metrics': 'coach-web/09-metrics.md',
  'creating-metrics': 'coach-web/68-creating-metrics.md',
  'logging-metrics-viewing-charts': 'coach-web/69-logging-metrics-viewing-charts.md',
  'syncing-metrics-from-check-ins': 'coach-web/70-syncing-metrics-from-check-ins.md',
  'progress-tracking-metrics': 'coach-web/71-progress-tracking-metrics.md',
  'metrics-mobile': 'client-mobile/08-metrics.md',

  // Tracking > Progress Photos
  'progress-photos': 'coach-web/10-progress-photos.md',
  'progress-photos-mobile': 'client-mobile/09-progress-photos.md',

  // Communication
  'messaging': 'coach-web/11-messaging.md',
  'messaging-mobile-coach': 'coach-mobile/05-messaging.md',
  'messaging-mobile-client': 'client-mobile/05-messaging.md',

  // AI Assistant
  'ai-assistant': 'coach-web/12-ai-assistant.md',
  'ai-client-management': 'coach-web/76-ai-client-management.md',
  'ai-training-capabilities': 'coach-web/77-ai-training-capabilities.md',
  'ai-progress-capabilities': 'coach-web/78-ai-progress-capabilities.md',
  'ai-communication-capabilities': 'coach-web/79-ai-communication-capabilities.md',
  'ai-action-cards-chat-history': 'coach-web/80-ai-action-cards-chat-history.md',
  'ai-assistant-mobile': 'coach-mobile/07-ai-assistant.md',

  // Automation
  'automations': 'coach-web/13-automations.md',
  'onboarding-flows': 'coach-web/14-onboarding-flows.md',
  'business-sequences': 'coach-web/22-business-sequences.md',

  // Business & Payments
  'connecting-stripe': 'coach-web/72-connecting-stripe.md',
  'creating-packages': 'coach-web/73-creating-packages.md',
  'business-packages': 'coach-web/15-business-packages.md',
  'client-purchase-flow': 'coach-web/74-client-purchase-flow.md',
  'coupons': 'coach-web/16-coupons.md',
  'payment-activity-summary': 'coach-web/75-payment-activity-summary.md',
  'managing-subscription': 'coach-web/26-managing-subscription.md',
  'cancelling-reactivating': 'coach-web/27-cancelling-reactivating.md',

  // Files & Resources
  'files': 'coach-web/17-files.md',
  'sharing-files-with-clients': 'coach-web/81-sharing-files-with-clients.md',

  // Productivity
  'todo-list': 'coach-web/18-todo-list.md',

  // Account & Settings
  'settings': 'coach-web/19-settings.md',
  'settings-mobile': 'coach-mobile/08-settings.md',
  'profile-and-settings-client': 'client-mobile/10-profile-and-settings.md',

  // Referrals
  'refer-and-earn': 'coach-web/20-refer-and-earn.md',

  // Feature Requests
  'feature-requests': 'coach-web/24-feature-requests.md',

  // Client App Guide
  'client-getting-started': 'client-mobile/01-getting-started.md',
  'client-home-screen': 'client-mobile/02-home-screen.md',
  'client-training': 'client-mobile/03-training.md',
  'client-progress': 'client-mobile/04-progress.md',
  'client-messaging': 'client-mobile/05-messaging.md',

  // Data & Privacy
  'third-party-integrations': 'coach-web/82-third-party-integrations.md',

  // Legacy (unused but kept for reference)
  'dashboard': 'coach-web/01-dashboard.md',
  'mobile-overview': 'coach-mobile/01-mobile-overview.md',
  'home-and-dashboard': 'coach-mobile/02-home-and-dashboard.md',
  'library-mobile': 'coach-mobile/06-library.md',
};

// Helper to get all articles flat
export function getAllArticles(): { slug: string; titleKey: string; descriptionKey: string; collectionSlug: string }[] {
  const result: { slug: string; titleKey: string; descriptionKey: string; collectionSlug: string }[] = [];
  for (const collection of collections) {
    if (collection.articles) {
      for (const article of collection.articles) {
        result.push({ ...article, collectionSlug: collection.slug });
      }
    }
    if (collection.sections) {
      for (const section of collection.sections) {
        for (const article of section.articles) {
          result.push({ ...article, collectionSlug: collection.slug });
        }
      }
    }
  }
  return result;
}

// Helper to find collection by slug
export function getCollectionBySlug(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}

// Helper to find the next article in the same collection
export function findNextArticle(articleSlug: string): Article | undefined {
  for (const collection of collections) {
    const allArticles: Article[] = [
      ...(collection.articles ?? []),
      ...(collection.sections?.flatMap((s) => s.articles) ?? []),
    ];
    const index = allArticles.findIndex((a) => a.slug === articleSlug);
    if (index !== -1 && index < allArticles.length - 1) {
      return allArticles[index + 1];
    }
  }
  return undefined;
}

// Helper to find article and its collection
export function findArticle(articleSlug: string): { article: Article; collection: Collection; section?: Section } | undefined {
  for (const collection of collections) {
    if (collection.articles) {
      const article = collection.articles.find((a) => a.slug === articleSlug);
      if (article) return { article, collection };
    }
    if (collection.sections) {
      for (const section of collection.sections) {
        const article = section.articles.find((a) => a.slug === articleSlug);
        if (article) return { article, collection, section };
      }
    }
  }
  return undefined;
}
