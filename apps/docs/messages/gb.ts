const messages = {
  home: {
    title: 'How can we help?',
    subtitle: 'Search our help articles or browse by topic below.',
    article: 'article',
    articles: 'articles',
    authorCount: '{count} author',
  },
  search: {
    placeholder: 'Search articles...',
  },
  nav: {
    helpCenter: 'Help Center',
    allCollections: 'All collections',
    backToCollection: 'Back',
  },
  author: {
    by: 'By',
    writtenBy: 'Written by',
    name: 'Andrei',
  },
  collections: {
    gettingStarted: {
      title: 'Getting Started',
      description: 'Set up your account and learn the basics.',
    },
    training: {
      title: 'Training',
      description: 'Build workouts, sections, programs, and manage exercises.',
    },
    clientManagement: {
      title: 'Client Management',
      description: 'Add, organise, and manage your coaching roster.',
    },
    forms: {
      title: 'Forms',
      description: 'Check-ins, questionnaires, and data collection.',
    },
    trackingAndProgress: {
      title: 'Tracking and Progress',
      description: 'Habits, metrics, progress photos, and exercise history.',
    },
    communication: {
      title: 'Communication',
      description: 'Messaging and staying connected with clients.',
    },
    aiAssistant: {
      title: 'AI Assistant',
      description: 'Your AI-powered coaching assistant.',
    },
    automation: {
      title: 'Automation',
      description: 'Flows, onboarding sequences, and business automation.',
    },
    businessAndPayments: {
      title: 'Business and Payments',
      description: 'Packages, coupons, Stripe, and subscription management.',
    },
    filesAndResources: {
      title: 'Files and Resources',
      description: 'Share documents and files with clients.',
    },
    productivity: {
      title: 'Productivity',
      description: 'Task management and staying organised.',
    },
    accountAndSettings: {
      title: 'Account and Settings',
      description: 'Manage your account, profile, and preferences.',
    },
    referrals: {
      title: 'Referrals',
      description: 'Earn rewards by inviting other coaches.',
    },
    featureRequests: {
      title: 'Feature Requests',
      description: 'Submit ideas and vote on improvements.',
    },
    clientAppGuide: {
      title: 'Client App Guide',
      description: 'Help articles for clients using the mobile app.',
    },
    dataAndPrivacy: {
      title: 'Data and Privacy',
      description: 'How your data is processed and protected.',
    },
  },
  sections: {
    workoutBuilder: 'Workout Builder',
    sectionBuilder: 'Section Builder',
    programBuilder: 'Program Builder',
    exercises: 'Exercises',
    trainingMobileCoach: 'Training (Coach Mobile)',
    trainingMobileClient: 'Training (Client Mobile)',
    managingClients: 'Adding and Managing Clients',
    clientProfiles: 'Client Profiles',
    clientsMobileCoach: 'Clients (Coach Mobile)',
    checkIns: 'Check-ins',
    questionnaires: 'Questionnaires',
    habits: 'Habits',
    metrics: 'Metrics',
    progressPhotos: 'Progress Photos',
    inboxCoachWeb: 'Inbox (Coach Web)',
    chatCoachMobile: 'Chat (Coach Mobile)',
    chatClient: 'Chat (Client)',
    aiAssistantWeb: 'AI Assistant (Web)',
    aiAssistantMobile: 'AI Assistant (Mobile)',
    flows: 'Flows',
    onboarding: 'Onboarding',
    businessSequences: 'Business Sequences',
    packages: 'Packages',
    coupons: 'Coupons',
    paymentActivity: 'Payment Activity',
    subscriptionManagement: 'Subscription Management',
    coachSettingsWeb: 'Coach Settings (Web)',
    coachSettingsMobile: 'Coach Settings (Mobile)',
    clientSettings: 'Client Settings',
  },
  articles: {
    // Getting Started
    welcomeToAthli: { title: 'Welcome to Athli', description: 'An introduction to the Athli coaching platform.' },
    creatingYourAccount: { title: 'Creating Your Account', description: 'How to sign up and set up your coach profile.' },
    invitingYourFirstClient: { title: 'Inviting Your First Client', description: 'Send your first client invitation.' },
    plansAndBilling: { title: 'Plans and Billing', description: 'Overview of subscription plans and billing.' },
    understandingPlans: { title: 'Understanding Athli Plans', description: 'Detailed breakdown of Starter, Pro, and Max plans.' },

    // Training > Workout Builder
    workoutBuilder: { title: 'Workout Builder Overview', description: 'Overview of the drag-and-drop workout builder.' },
    addingExercisesToWorkout: { title: 'Adding Exercises to a Workout', description: 'Search and add exercises to your workouts.' },
    addingDeletingSets: { title: 'Adding and Deleting Sets', description: 'Manage sets and link or unlink values.' },
    creatingSupersets: { title: 'Creating Supersets, Trisets, and Giant Sets', description: 'Group exercises into supersets and more.' },
    creatingWorkoutSections: { title: 'Creating Sections in a Workout', description: 'Add structured sections like AMRAP and circuits.' },
    dragDropReorderExercises: { title: 'Drag and Drop to Reorder Exercises', description: 'Rearrange exercises with drag and drop.' },
    copyPasteWorkouts: { title: 'Copying and Pasting Workouts', description: 'Duplicate and reuse workouts across clients.' },
    customExercisesDemoVideos: { title: 'Custom Exercises and Demo Videos', description: 'Create exercises with custom video demos.' },
    alternateExercises: { title: 'Alternate Exercises', description: 'Provide backup exercise options for clients.' },
    warmUpSets: { title: 'Warm-Up Sets', description: 'Mark sets as warm-up sets in workouts.' },
    dropSetsFailureSets: { title: 'Drop Sets and Failure Sets', description: 'Configure drop sets and training to failure.' },
    repRangesWeightRanges: { title: 'Rep Ranges and Weight Ranges', description: 'Use ranges instead of fixed rep and weight values.' },
    exerciseNotes: { title: 'Exercise Notes', description: 'Add coaching notes to individual exercises.' },
    trackableFieldsReference: { title: 'Trackable Fields Reference', description: 'Full list of trackable exercise fields and units.' },
    usingTempo: { title: 'How to Use Tempo', description: 'Add tempo prescriptions to exercises.' },
    usingRpeRir: { title: 'How to Use RPE and RIR', description: 'Prescribe intensity with RPE and RIR.' },
    aiWorkoutGeneration: { title: 'AI Workout Generation', description: 'Generate workouts using AI from a text prompt.' },

    // Training > Section Builder
    sectionBuilder: { title: 'Section Builder Overview', description: 'Build reusable workout sections for your library.' },
    whatAreSections: { title: 'What Are Sections', description: 'Understand sections as workout building blocks.' },
    regularSections: { title: 'Regular Sections', description: 'Standard strength training sections with sets and reps.' },
    amrapSections: { title: 'AMRAP Sections', description: 'As Many Rounds As Possible timed sections.' },
    emomSections: { title: 'EMOM Sections', description: 'Every Minute On the Minute interval sections.' },
    tabataSections: { title: 'Tabata Sections', description: 'High-intensity Tabata interval sections.' },
    hiitSections: { title: 'HIIT Sections', description: 'High-Intensity Interval Training sections.' },
    circuitSections: { title: 'Circuit Sections', description: 'Circuit training with multiple rounds.' },
    savingSectionsToLibrary: { title: 'Saving Sections to Library', description: 'Save and reuse sections across workouts.' },

    // Training > Exercises
    exerciseLibrary: { title: 'Exercise Library Overview', description: 'Browse, search, and create exercises.' },
    browsingExercises: { title: 'Browsing Exercises', description: 'Search and browse the exercise database.' },
    creatingCustomExercises: { title: 'Creating Custom Exercises with Videos', description: 'Create your own exercises with video demos.' },
    filteringExercises: { title: 'Filtering by Muscle, Equipment, and Category', description: 'Filter exercises by muscle group and equipment.' },
    musclewikiIntegration: { title: 'MuscleWiki Integration', description: 'Built-in exercise videos from MuscleWiki.' },

    // Training > Programs
    trainingPrograms: { title: 'Training Programs Overview', description: 'Create multi-week structured training programs.' },
    creatingPrograms: { title: 'Creating a Training Program', description: 'Build programs with the weekly calendar grid.' },
    assigningProgramsToClients: { title: 'Assigning Programs to Clients', description: 'Assign programs to client training calendars.' },
    programStructureScheduling: { title: 'Program Structure and Scheduling', description: 'Structure weeks, rest days, and scheduling.' },

    // Training > Mobile
    trainingMobileCoach: { title: 'Training (Coach Mobile)', description: 'Manage training from the coach mobile app.' },
    trainingMobileClient: { title: 'Training (Client Mobile)', description: 'How clients view and log their training.' },

    // Client Management
    clientManagement: { title: 'Client Management', description: 'Add, edit, and organise your clients.' },
    clientNotes: { title: 'Client Notes', description: 'Keep private notes about each client.' },
    clientManagementMobile: { title: 'Client Management (Mobile)', description: 'Manage clients from the coach mobile app.' },

    // Forms > Check-ins
    checkIns: { title: 'Check-ins Overview', description: 'Create and manage recurring check-in forms.' },
    checkInQuestionTypes: { title: 'Check-in Question Types', description: 'Text, number, rating, yes/no, and more.' },
    addingPhotoQuestions: { title: 'Adding Photo Questions', description: 'Let clients submit photos in check-ins.' },
    syncingCheckInsToMetrics: { title: 'Syncing Check-in Answers to Metrics', description: 'Auto-log check-in values to metrics.' },
    schedulingCheckIns: { title: 'Scheduling Check-ins', description: 'Set frequency and timing for check-ins.' },
    checkInsMobile: { title: 'Check-ins (Client Mobile)', description: 'How clients complete check-ins.' },

    // Forms > Questionnaires
    questionnaires: { title: 'Questionnaires Overview', description: 'Create one-time questionnaires for clients.' },
    questionnairesForOnboarding: { title: 'Questionnaires for Onboarding', description: 'Use questionnaires in client onboarding flows.' },

    // Tracking > Habits
    habits: { title: 'Habits Overview', description: 'Assign and track daily habits.' },
    creatingHabits: { title: 'Creating Habits', description: 'Create habits and assign them to clients.' },
    habitUnitsPeriods: { title: 'Habit Units and Periods', description: 'Available units and tracking periods for habits.' },
    habitNotificationsReminders: { title: 'Habit Notifications and Reminders', description: 'Set up habit reminders and notifications.' },
    habitTrackingStreaks: { title: 'Tracking Habits and Streaks', description: 'View completion history and adherence rates.' },
    habitsMobile: { title: 'Habits (Client Mobile)', description: 'How clients track their habits.' },

    // Tracking > Metrics
    metrics: { title: 'Metrics Overview', description: 'Track weight, measurements, and custom metrics.' },
    creatingMetrics: { title: 'Creating Metrics', description: 'Create custom metrics with types and units.' },
    loggingMetricsViewingCharts: { title: 'Logging Values and Viewing Charts', description: 'Log metric values and view trend charts.' },
    syncingMetricsFromCheckIns: { title: 'Syncing Metrics from Check-ins', description: 'Auto-sync check-in answers to metrics.' },
    progressTrackingMetrics: { title: 'Progress Tracking with Metrics', description: 'Use metrics to track client progress over time.' },
    metricsMobile: { title: 'Metrics (Client Mobile)', description: 'How clients log their metrics.' },

    // Tracking > Progress Photos
    progressPhotos: { title: 'Progress Photos', description: 'Capture and compare client progress photos.' },
    progressPhotosMobile: { title: 'Progress Photos (Client Mobile)', description: 'How clients take progress photos.' },

    // Communication
    messaging: { title: 'Messaging', description: 'Chat with clients from the inbox.' },
    messagingMobileCoach: { title: 'Messaging (Coach Mobile)', description: 'Message clients from the mobile app.' },
    messagingMobileClient: { title: 'Messaging (Client Mobile)', description: 'How clients message their coach.' },

    // AI Assistant
    aiAssistant: { title: 'AI Assistant Overview', description: 'Your AI-powered coaching assistant on web.' },
    aiClientManagement: { title: 'AI for Client Management', description: 'Search clients, add goals, and track activity with AI.' },
    aiTrainingCapabilities: { title: 'AI for Training and Workouts', description: 'Generate workouts and manage training with AI.' },
    aiProgressCapabilities: { title: 'AI for Progress and Analytics', description: 'Analyze client progress and metrics with AI.' },
    aiCommunicationCapabilities: { title: 'AI for Communication', description: 'Draft messages and reminders with AI.' },
    aiActionCardsChatHistory: { title: 'Action Cards and Chat History', description: 'Confirm AI actions and manage chat history.' },
    aiAssistantMobile: { title: 'AI Assistant (Mobile)', description: 'Use the AI assistant from the mobile app.' },

    // Automation
    automations: { title: 'Automations', description: 'Set up automated flows and triggers.' },
    onboardingFlows: { title: 'Onboarding Flows', description: 'Automate client onboarding.' },
    businessSequences: { title: 'Sequences After Purchase', description: 'Build post-purchase automation workflows.' },

    // Business & Payments
    connectingStripe: { title: 'Connecting Stripe', description: 'Connect your Stripe account to accept payments.' },
    creatingPackages: { title: 'Creating Packages', description: 'Create coaching packages with pricing and billing.' },
    businessPackages: { title: 'What You Can Sell with Packages', description: 'Package types, pricing models, and what to include.' },
    clientPurchaseFlow: { title: 'Client Purchase Flow', description: 'How clients view and purchase your packages.' },
    coupons: { title: 'Promo Codes and Coupons', description: 'Create discount coupons for packages.' },
    paymentActivitySummary: { title: 'Payment Activity and Summary', description: 'View transactions, subscriptions, and payment events.' },
    managingSubscription: { title: 'Managing Your Subscription', description: 'Change plans, add-ons, and view invoices.' },
    cancellingReactivating: { title: 'Cancelling and Reactivating', description: 'Cancel, reactivate, or delete your account.' },

    // Files & Resources
    files: { title: 'Uploading Files', description: 'Upload and organise files in your library.' },
    sharingFilesWithClients: { title: 'Sharing Files with Clients', description: 'Share documents and files with individual clients.' },

    // Productivity
    todoList: { title: 'Todo List', description: 'Manage tasks and stay organised.' },

    // Account & Settings
    settings: { title: 'Settings', description: 'Configure your account and app preferences.' },
    settingsMobile: { title: 'Settings (Mobile)', description: 'Manage settings from the mobile app.' },
    profileAndSettingsClient: { title: 'Profile and Settings (Client)', description: 'Client profile and app settings.' },

    // Referrals
    referAndEarn: { title: 'Refer and Earn', description: 'Earn rewards by referring other coaches.' },

    // Feature Requests
    featureRequests: { title: 'Feature Requests', description: 'Submit ideas and vote on platform improvements.' },

    // Client App Guide
    clientGettingStarted: { title: 'Getting Started (Client)', description: 'How clients get started with Athli.' },
    clientHomeScreen: { title: 'Home Screen (Client)', description: 'Overview of the client home screen.' },
    clientTraining: { title: 'Training (Client)', description: 'How clients view and complete training.' },
    clientProgress: { title: 'Progress (Client)', description: 'How clients track their progress.' },
    clientMessaging: { title: 'Messaging (Client)', description: 'How clients chat with their coach.' },

    // Data & Privacy
    thirdPartyIntegrations: { title: 'Third-Party Integrations and Data Processing', description: 'How your data is processed by third-party services.' },
  },
  footer: {
    features: 'Features',
    mobileApp: 'Mobile App',
    company: 'Company',
    legal: 'Legal',
    faqs: 'FAQs',
    pricing: 'Pricing',
    howWeCompare: 'How We Compare',
    affiliate: 'Affiliate Program',
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms',
    copyright: 'Athli, All rights reserved',
    coach: 'Coach',
    client: 'Client',
  },
  features: {
    automations: { label: 'Automations' },
    forms: { label: 'Forms' },
    inbox: { label: 'Inbox' },
    metrics: { label: 'Metrics' },
    habits: { label: 'Habits' },
    'exercise-history': { label: 'Exercise History' },
    'progress-photos': { label: 'Progress Photos' },
    'client-training': { label: 'Client Training' },
    workouts: { label: 'Workouts' },
    packages: { label: 'Packages' },
  },
};

export default messages;
