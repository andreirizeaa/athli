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
        ],
      },
      {
        titleKey: 'sections.sectionBuilder',
        articles: [
          { slug: 'section-builder', titleKey: 'articles.sectionBuilder.title', descriptionKey: 'articles.sectionBuilder.description' },
        ],
      },
      {
        titleKey: 'sections.programBuilder',
        articles: [
          { slug: 'training-programs', titleKey: 'articles.trainingPrograms.title', descriptionKey: 'articles.trainingPrograms.description' },
        ],
      },
      {
        titleKey: 'sections.exercises',
        articles: [
          { slug: 'exercise-library', titleKey: 'articles.exerciseLibrary.title', descriptionKey: 'articles.exerciseLibrary.description' },
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
          { slug: 'check-ins-mobile', titleKey: 'articles.checkInsMobile.title', descriptionKey: 'articles.checkInsMobile.description' },
        ],
      },
      {
        titleKey: 'sections.questionnaires',
        articles: [
          { slug: 'questionnaires', titleKey: 'articles.questionnaires.title', descriptionKey: 'articles.questionnaires.description' },
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
          { slug: 'habits-mobile', titleKey: 'articles.habitsMobile.title', descriptionKey: 'articles.habitsMobile.description' },
        ],
      },
      {
        titleKey: 'sections.metrics',
        articles: [
          { slug: 'metrics', titleKey: 'articles.metrics.title', descriptionKey: 'articles.metrics.description' },
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
    articles: [
      { slug: 'ai-assistant', titleKey: 'articles.aiAssistant.title', descriptionKey: 'articles.aiAssistant.description' },
      { slug: 'ai-assistant-mobile', titleKey: 'articles.aiAssistantMobile.title', descriptionKey: 'articles.aiAssistantMobile.description' },
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
          { slug: 'business-packages', titleKey: 'articles.businessPackages.title', descriptionKey: 'articles.businessPackages.description' },
        ],
      },
      {
        titleKey: 'sections.coupons',
        articles: [
          { slug: 'coupons', titleKey: 'articles.coupons.title', descriptionKey: 'articles.coupons.description' },
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
];

// Map article slugs to their markdown file paths (relative to docs/help-center)
export const articleFiles: Record<string, string> = {
  'welcome-to-athli': 'getting-started/01-welcome-to-athli.md',
  'creating-your-account': 'getting-started/02-creating-your-account.md',
  'inviting-your-first-client': 'getting-started/03-inviting-your-first-client.md',
  'plans-and-billing': 'getting-started/04-plans-and-billing.md',
  'understanding-plans': 'getting-started/05-understanding-plans.md',
  'workout-builder': 'coach-web/04-workout-builder.md',
  'section-builder': 'coach-web/25-section-builder.md',
  'training-programs': 'coach-web/03-training-programs.md',
  'exercise-library': 'coach-web/05-exercise-library.md',
  'training-mobile-coach': 'coach-mobile/04-training.md',
  'training-mobile-client': 'client-mobile/03-training.md',
  'client-management': 'coach-web/02-client-management.md',
  'client-notes': 'coach-web/23-client-notes.md',
  'client-management-mobile': 'coach-mobile/03-client-management.md',
  'check-ins': 'coach-web/06-check-ins.md',
  'check-ins-mobile': 'client-mobile/06-check-ins.md',
  'questionnaires': 'coach-web/07-questionnaires.md',
  'habits': 'coach-web/08-habits.md',
  'habits-mobile': 'client-mobile/07-habits.md',
  'metrics': 'coach-web/09-metrics.md',
  'metrics-mobile': 'client-mobile/08-metrics.md',
  'progress-photos': 'coach-web/10-progress-photos.md',
  'progress-photos-mobile': 'client-mobile/09-progress-photos.md',
  'messaging': 'coach-web/11-messaging.md',
  'messaging-mobile-coach': 'coach-mobile/05-messaging.md',
  'messaging-mobile-client': 'client-mobile/05-messaging.md',
  'ai-assistant': 'coach-web/12-ai-assistant.md',
  'ai-assistant-mobile': 'coach-mobile/07-ai-assistant.md',
  'automations': 'coach-web/13-automations.md',
  'onboarding-flows': 'coach-web/14-onboarding-flows.md',
  'business-sequences': 'coach-web/22-business-sequences.md',
  'business-packages': 'coach-web/15-business-packages.md',
  'coupons': 'coach-web/16-coupons.md',
  'managing-subscription': 'coach-web/26-managing-subscription.md',
  'cancelling-reactivating': 'coach-web/27-cancelling-reactivating.md',
  'files': 'coach-web/17-files.md',
  'todo-list': 'coach-web/18-todo-list.md',
  'settings': 'coach-web/19-settings.md',
  'settings-mobile': 'coach-mobile/08-settings.md',
  'profile-and-settings-client': 'client-mobile/10-profile-and-settings.md',
  'refer-and-earn': 'coach-web/20-refer-and-earn.md',
  'feature-requests': 'coach-web/24-feature-requests.md',
  'client-getting-started': 'client-mobile/01-getting-started.md',
  'client-home-screen': 'client-mobile/02-home-screen.md',
  'client-training': 'client-mobile/03-training.md',
  'client-progress': 'client-mobile/04-progress.md',
  'client-messaging': 'client-mobile/05-messaging.md',
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
