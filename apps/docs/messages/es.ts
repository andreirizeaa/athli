const messages = {
  home: {
    title: '\u00BFEn qu\u00E9 podemos ayudarte?',
    subtitle: 'Busca en nuestros art\u00EDculos de ayuda o navega por tema.',
    article: 'art\u00EDculo',
    articles: 'art\u00EDculos',
    authorCount: '{count} autor',
  },
  search: {
    placeholder: 'Buscar art\u00EDculos...',
  },
  nav: {
    helpCenter: 'Centro de Ayuda',
    allCollections: 'Todas las colecciones',
    backToCollection: 'Volver',
  },
  author: {
    by: 'Por',
    writtenBy: 'Escrito por',
    name: 'Andrei',
  },
  collections: {
    gettingStarted: {
      title: 'Primeros Pasos',
      description: 'Configura tu cuenta y aprende lo b\u00E1sico.',
    },
    training: {
      title: 'Entrenamiento',
      description: 'Crea entrenamientos, secciones, programas y ejercicios.',
    },
    clientManagement: {
      title: 'Gesti\u00F3n de Clientes',
      description: 'A\u00F1ade, organiza y gestiona tus clientes.',
    },
    forms: {
      title: 'Formularios',
      description: 'Check-ins, cuestionarios y recogida de datos.',
    },
    trackingAndProgress: {
      title: 'Seguimiento y Progreso',
      description: 'H\u00E1bitos, m\u00E9tricas, fotos de progreso e historial.',
    },
    communication: {
      title: 'Comunicaci\u00F3n',
      description: 'Mensajer\u00EDa y conexi\u00F3n con clientes.',
    },
    aiAssistant: {
      title: 'Asistente IA',
      description: 'Tu asistente de coaching con inteligencia artificial.',
    },
    automation: {
      title: 'Automatizaci\u00F3n',
      description: 'Flujos, secuencias de onboarding y automatizaci\u00F3n.',
    },
    businessAndPayments: {
      title: 'Negocio y Pagos',
      description: 'Paquetes, cupones, Stripe y gesti\u00F3n de suscripciones.',
    },
    filesAndResources: {
      title: 'Archivos y Recursos',
      description: 'Comparte documentos y archivos con clientes.',
    },
    productivity: {
      title: 'Productividad',
      description: 'Gesti\u00F3n de tareas y organizaci\u00F3n.',
    },
    accountAndSettings: {
      title: 'Cuenta y Configuraci\u00F3n',
      description: 'Gestiona tu cuenta, perfil y preferencias.',
    },
    referrals: {
      title: 'Referidos',
      description: 'Gana recompensas invitando a otros entrenadores.',
    },
    featureRequests: {
      title: 'Solicitudes de Funciones',
      description: 'Env\u00EDa ideas y vota por mejoras.',
    },
    clientAppGuide: {
      title: 'Gu\u00EDa de la App del Cliente',
      description: 'Art\u00EDculos de ayuda para clientes.',
    },
    dataAndPrivacy: {
      title: 'Datos y Privacidad',
      description: 'C\u00F3mo se procesan y protegen tus datos.',
    },
  },
  sections: {
    workoutBuilder: 'Constructor de Entrenamientos',
    sectionBuilder: 'Constructor de Secciones',
    programBuilder: 'Constructor de Programas',
    exercises: 'Ejercicios',
    trainingMobileCoach: 'Entrenamiento (Coach M\u00F3vil)',
    trainingMobileClient: 'Entrenamiento (Cliente M\u00F3vil)',
    managingClients: 'A\u00F1adir y Gestionar Clientes',
    clientProfiles: 'Perfiles de Clientes',
    clientsMobileCoach: 'Clientes (Coach M\u00F3vil)',
    checkIns: 'Check-ins',
    questionnaires: 'Cuestionarios',
    formBuilderMobile: 'Constructor de Formularios (M\u00F3vil)',
    habits: 'H\u00E1bitos',
    metrics: 'M\u00E9tricas',
    progressPhotos: 'Fotos de Progreso',
    inboxCoachWeb: 'Bandeja (Coach Web)',
    chatCoachMobile: 'Chat (Coach M\u00F3vil)',
    chatClient: 'Chat (Cliente)',
    aiAssistantWeb: 'Asistente IA (Web)',
    aiAssistantMobile: 'Asistente IA (M\u00F3vil)',
    flows: 'Flujos',
    onboarding: 'Onboarding',
    businessSequences: 'Secuencias de Negocio',
    packages: 'Paquetes',
    coupons: 'Cupones',
    paymentActivity: 'Actividad de Pagos',
    subscriptionManagement: 'Gesti\u00F3n de Suscripci\u00F3n',
    coachSettingsWeb: 'Configuraci\u00F3n Coach (Web)',
    coachSettingsMobile: 'Configuraci\u00F3n Coach (M\u00F3vil)',
    clientSettings: 'Configuraci\u00F3n Cliente',
  },
  articles: {
    // Getting Started
    welcomeToAthli: { title: 'Bienvenido a Athli', description: 'Introducci\u00F3n a la plataforma Athli.' },
    creatingYourAccount: { title: 'Crear tu Cuenta', description: 'C\u00F3mo registrarte y configurar tu perfil.' },
    invitingYourFirstClient: { title: 'Invitar a tu Primer Cliente', description: 'Env\u00EDa tu primera invitaci\u00F3n.' },
    plansAndBilling: { title: 'Planes y Facturaci\u00F3n', description: 'Resumen de planes y facturaci\u00F3n.' },
    understandingPlans: { title: 'Entender los Planes de Athli', description: 'Desglose de Starter, Pro y Max.' },

    // Training > Workout Builder
    workoutBuilder: { title: 'Constructor de Entrenamientos', description: 'Vista general del constructor de entrenamientos.' },
    addingExercisesToWorkout: { title: 'A\u00F1adir Ejercicios a un Entrenamiento', description: 'Busca y a\u00F1ade ejercicios a tus entrenamientos.' },
    addingDeletingSets: { title: 'A\u00F1adir y Eliminar Series', description: 'Gestiona series y vincula o desvincula valores.' },
    creatingSupersets: { title: 'Crear Superseries, Triseries y Series Gigantes', description: 'Agrupa ejercicios en superseries y m\u00E1s.' },
    creatingWorkoutSections: { title: 'Crear Secciones en un Entrenamiento', description: 'A\u00F1ade secciones estructuradas como AMRAP y circuitos.' },
    dragDropReorderExercises: { title: 'Arrastrar y Soltar para Reordenar', description: 'Reorganiza ejercicios con arrastrar y soltar.' },
    copyPasteWorkouts: { title: 'Copiar y Pegar Entrenamientos', description: 'Duplica y reutiliza entrenamientos entre clientes.' },
    customExercisesDemoVideos: { title: 'Ejercicios Personalizados y V\u00EDdeos Demo', description: 'Crea ejercicios con v\u00EDdeos demostrativos.' },
    alternateExercises: { title: 'Ejercicios Alternativos', description: 'Proporciona opciones de ejercicios de respaldo.' },
    warmUpSets: { title: 'Series de Calentamiento', description: 'Marca series como calentamiento en entrenamientos.' },
    dropSetsFailureSets: { title: 'Drop Sets y Series al Fallo', description: 'Configura drop sets y entrenamiento al fallo.' },
    repRangesWeightRanges: { title: 'Rangos de Repeticiones y Peso', description: 'Usa rangos en lugar de valores fijos.' },
    exerciseNotes: { title: 'Notas de Ejercicio', description: 'A\u00F1ade notas de coaching a ejercicios individuales.' },
    trackableFieldsReference: { title: 'Referencia de Campos Rastreables', description: 'Lista completa de campos y unidades rastreables.' },
    usingTempo: { title: 'C\u00F3mo Usar el Tempo', description: 'A\u00F1ade prescripciones de tempo a ejercicios.' },
    usingRpeRir: { title: 'C\u00F3mo Usar RPE y RIR', description: 'Prescribe intensidad con RPE y RIR.' },
    aiWorkoutGeneration: { title: 'Generaci\u00F3n de Entrenamientos con IA', description: 'Genera entrenamientos con IA desde texto.' },

    // Training > Section Builder
    sectionBuilder: { title: 'Constructor de Secciones', description: 'Crea secciones reutilizables para tu biblioteca.' },
    whatAreSections: { title: 'Qu\u00E9 Son las Secciones', description: 'Entiende las secciones como bloques de entrenamiento.' },
    regularSections: { title: 'Secciones Regulares', description: 'Secciones est\u00E1ndar de fuerza con series y repeticiones.' },
    amrapSections: { title: 'Secciones AMRAP', description: 'Secciones cronometradas de m\u00E1ximas rondas posibles.' },
    emomSections: { title: 'Secciones EMOM', description: 'Secciones de intervalos cada minuto.' },
    tabataSections: { title: 'Secciones Tabata', description: 'Secciones de intervalos Tabata de alta intensidad.' },
    hiitSections: { title: 'Secciones HIIT', description: 'Secciones de entrenamiento por intervalos de alta intensidad.' },
    circuitSections: { title: 'Secciones de Circuito', description: 'Entrenamiento en circuito con m\u00FAltiples rondas.' },
    savingSectionsToLibrary: { title: 'Guardar Secciones en la Biblioteca', description: 'Guarda y reutiliza secciones entre entrenamientos.' },

    // Training > Exercises
    exerciseLibrary: { title: 'Biblioteca de Ejercicios', description: 'Busca, explora y crea ejercicios.' },
    browsingExercises: { title: 'Explorar Ejercicios', description: 'Busca y explora la base de datos de ejercicios.' },
    creatingCustomExercises: { title: 'Crear Ejercicios Personalizados con V\u00EDdeos', description: 'Crea tus propios ejercicios con v\u00EDdeos demo.' },
    filteringExercises: { title: 'Filtrar por M\u00FAsculo, Equipo y Categor\u00EDa', description: 'Filtra ejercicios por grupo muscular y equipo.' },
    musclewikiIntegration: { title: 'Integraci\u00F3n con MuscleWiki', description: 'V\u00EDdeos de ejercicios integrados de MuscleWiki.' },

    // Training > Programs
    trainingPrograms: { title: 'Programas de Entrenamiento', description: 'Crea programas estructurados de varias semanas.' },
    creatingPrograms: { title: 'Crear un Programa de Entrenamiento', description: 'Construye programas con el calendario semanal.' },
    assigningProgramsToClients: { title: 'Asignar Programas a Clientes', description: 'Asigna programas al calendario de entrenamiento.' },
    programStructureScheduling: { title: 'Estructura y Programaci\u00F3n', description: 'Estructura semanas, descansos y programaci\u00F3n.' },

    // Training > Mobile
    trainingMobileCoach: { title: 'Entrenamiento (Coach M\u00F3vil)', description: 'Gestiona el entrenamiento desde el m\u00F3vil.' },
    trainingMobileClient: { title: 'Entrenamiento (Cliente M\u00F3vil)', description: 'C\u00F3mo los clientes ven su entrenamiento.' },

    // Client Management
    clientManagement: { title: 'Gesti\u00F3n de Clientes', description: 'A\u00F1ade y organiza tus clientes.' },
    clientNotes: { title: 'Notas de Cliente', description: 'Notas privadas sobre cada cliente.' },
    clientManagementMobile: { title: 'Gesti\u00F3n de Clientes (M\u00F3vil)', description: 'Gestiona clientes desde el m\u00F3vil.' },

    // Forms > Check-ins
    checkIns: { title: 'Check-ins', description: 'Crea formularios de check-in recurrentes.' },
    checkInQuestionTypes: { title: 'Tipos de Preguntas de Check-in', description: 'Texto, n\u00FAmero, valoraci\u00F3n, s\u00ED/no y m\u00E1s.' },
    addingPhotoQuestions: { title: 'A\u00F1adir Preguntas con Foto', description: 'Permite a los clientes subir fotos en check-ins.' },
    syncingCheckInsToMetrics: { title: 'Sincronizar Check-ins con M\u00E9tricas', description: 'Registra autom\u00E1ticamente valores de check-in en m\u00E9tricas.' },
    schedulingCheckIns: { title: 'Programar Check-ins', description: 'Configura la frecuencia y horario de check-ins.' },
    checkInsMobile: { title: 'Check-ins (Cliente M\u00F3vil)', description: 'C\u00F3mo los clientes completan check-ins.' },

    // Forms > Questionnaires
    questionnaires: { title: 'Cuestionarios', description: 'Crea cuestionarios \u00FAnicos para clientes.' },

    // Forms > Form Builder (Mobile)
    checkInBuilderMobile: { title: 'Crear Check-ins en el M\u00F3vil', description: 'Crea formularios de check-in recurrentes desde tu tel\u00E9fono.' },
    questionnaireBuilderMobile: { title: 'Crear Cuestionarios en el M\u00F3vil', description: 'Crea formularios de cuestionario desde tu tel\u00E9fono.' },
    assigningFormsMobile: { title: 'Asignar Formularios a Clientes en el M\u00F3vil', description: 'Asigna check-ins y cuestionarios a clientes desde tu tel\u00E9fono.' },
    reviewingCheckInsMobile: { title: 'Revisar Check-ins en el M\u00F3vil', description: 'Revisa los env\u00EDos de check-in de clientes y deja comentarios desde tu tel\u00E9fono.' },


    // Tracking > Habits
    habits: { title: 'H\u00E1bitos', description: 'Asigna y rastrea h\u00E1bitos diarios.' },
    creatingHabits: { title: 'Crear H\u00E1bitos', description: 'Crea h\u00E1bitos y as\u00EDgnalos a clientes.' },
    habitUnitsPeriods: { title: 'Unidades y Per\u00EDodos de H\u00E1bitos', description: 'Unidades disponibles y per\u00EDodos de seguimiento.' },
    habitNotificationsReminders: { title: 'Notificaciones y Recordatorios de H\u00E1bitos', description: 'Configura recordatorios de h\u00E1bitos.' },
    habitTrackingStreaks: { title: 'Seguimiento de H\u00E1bitos y Rachas', description: 'Ve el historial de completado y tasas de adherencia.' },
    habitsMobile: { title: 'H\u00E1bitos (Cliente M\u00F3vil)', description: 'C\u00F3mo los clientes rastrean h\u00E1bitos.' },

    // Tracking > Metrics
    metrics: { title: 'M\u00E9tricas', description: 'Rastrea peso, medidas y m\u00E9tricas personalizadas.' },
    creatingMetrics: { title: 'Crear M\u00E9tricas', description: 'Crea m\u00E9tricas con tipos y unidades.' },
    loggingMetricsViewingCharts: { title: 'Registrar Valores y Ver Gr\u00E1ficos', description: 'Registra valores de m\u00E9tricas y ve gr\u00E1ficos.' },
    syncingMetricsFromCheckIns: { title: 'Sincronizar M\u00E9tricas desde Check-ins', description: 'Sincroniza respuestas de check-in con m\u00E9tricas.' },
    progressTrackingMetrics: { title: 'Seguimiento de Progreso con M\u00E9tricas', description: 'Usa m\u00E9tricas para rastrear el progreso del cliente.' },
    metricsMobile: { title: 'M\u00E9tricas (Cliente M\u00F3vil)', description: 'C\u00F3mo los clientes registran m\u00E9tricas.' },

    // Tracking > Progress Photos
    progressPhotos: { title: 'Fotos de Progreso', description: 'Captura y compara fotos de progreso.' },
    progressPhotosMobile: { title: 'Fotos de Progreso (Cliente M\u00F3vil)', description: 'C\u00F3mo los clientes toman fotos.' },

    // Communication
    messaging: { title: 'Mensajer\u00EDa', description: 'Chatea con clientes desde la bandeja.' },
    messagingMobileCoach: { title: 'Mensajer\u00EDa (Coach M\u00F3vil)', description: 'Mensajea desde la app m\u00F3vil.' },
    messagingMobileClient: { title: 'Mensajer\u00EDa (Cliente M\u00F3vil)', description: 'C\u00F3mo los clientes mensajean.' },

    // AI Assistant
    aiAssistant: { title: 'Asistente IA', description: 'Tu asistente de coaching con IA en web.' },
    aiClientManagement: { title: 'IA para Gesti\u00F3n de Clientes', description: 'Busca clientes, a\u00F1ade objetivos y rastrea actividad con IA.' },
    aiTrainingCapabilities: { title: 'IA para Entrenamiento', description: 'Genera entrenamientos y gestiona el entrenamiento con IA.' },
    aiProgressCapabilities: { title: 'IA para Progreso y An\u00E1lisis', description: 'Analiza el progreso y m\u00E9tricas del cliente con IA.' },
    aiCommunicationCapabilities: { title: 'IA para Comunicaci\u00F3n', description: 'Redacta mensajes y recordatorios con IA.' },
    aiActionCardsChatHistory: { title: 'Tarjetas de Acci\u00F3n e Historial de Chat', description: 'Confirma acciones de IA y gestiona el historial.' },
    aiAssistantMobile: { title: 'Asistente IA (M\u00F3vil)', description: 'Usa el asistente IA desde el m\u00F3vil.' },

    // Automation
    automations: { title: 'Automatizaciones', description: 'Configura flujos y triggers.' },
    onboardingFlows: { title: 'Flujos de Onboarding', description: 'Automatiza el onboarding.' },
    businessSequences: { title: 'Secuencias Post-Compra', description: 'Automatizaciones despu\u00E9s de la compra.' },

    // Business & Payments
    connectingStripe: { title: 'Conectar Stripe', description: 'Conecta tu cuenta de Stripe para aceptar pagos.' },
    creatingPackages: { title: 'Crear Paquetes', description: 'Crea paquetes de coaching con precios y facturaci\u00F3n.' },
    businessPackages: { title: 'Qu\u00E9 Puedes Vender con Paquetes', description: 'Tipos de paquetes, modelos de precio y qu\u00E9 incluir.' },
    clientPurchaseFlow: { title: 'Flujo de Compra del Cliente', description: 'C\u00F3mo los clientes ven y compran tus paquetes.' },
    coupons: { title: 'C\u00F3digos Promocionales y Cupones', description: 'Crea cupones de descuento para paquetes.' },
    paymentActivitySummary: { title: 'Actividad y Resumen de Pagos', description: 'Ve transacciones, suscripciones y eventos de pago.' },
    managingSubscription: { title: 'Gestionar tu Suscripci\u00F3n', description: 'Cambia planes y gestiona add-ons.' },
    cancellingReactivating: { title: 'Cancelar y Reactivar', description: 'Cancela o reactiva tu cuenta.' },

    // Files & Resources
    files: { title: 'Subir Archivos', description: 'Sube y organiza archivos en tu biblioteca.' },
    sharingFilesWithClients: { title: 'Compartir Archivos con Clientes', description: 'Comparte documentos y archivos con clientes individuales.' },

    // Productivity
    todoList: { title: 'Lista de Tareas', description: 'Gestiona tareas y organiza.' },

    // Account & Settings
    settings: { title: 'Configuraci\u00F3n', description: 'Configura tu cuenta y preferencias.' },
    settingsMobile: { title: 'Configuraci\u00F3n (M\u00F3vil)', description: 'Configuraci\u00F3n desde el m\u00F3vil.' },
    profileAndSettingsClient: { title: 'Perfil y Configuraci\u00F3n (Cliente)', description: 'Perfil y ajustes del cliente.' },

    // Referrals
    referAndEarn: { title: 'Referir y Ganar', description: 'Gana recompensas refiriendo coaches.' },

    // Feature Requests
    featureRequests: { title: 'Solicitudes de Funciones', description: 'Env\u00EDa ideas y vota mejoras.' },

    // Client App Guide
    clientGettingStarted: { title: 'Primeros Pasos', description: 'C\u00F3mo empezar como cliente.' },
    clientHomeScreen: { title: 'Pantalla de Inicio', description: 'Resumen de la pantalla de inicio.' },
    clientTraining: { title: 'Entrenamiento', description: 'C\u00F3mo los clientes ven el entrenamiento.' },
    clientProgress: { title: 'Progreso', description: 'C\u00F3mo los clientes rastrean progreso.' },
    clientMessaging: { title: 'Mensajer\u00EDa', description: 'C\u00F3mo los clientes chatean.' },

    // Data & Privacy
    thirdPartyIntegrations: { title: 'Integraciones de Terceros y Procesamiento de Datos', description: 'C\u00F3mo se procesan tus datos por servicios de terceros.' },
  },
  footer: {
    features: 'Funciones',
    mobileApp: 'App M\u00F3vil',
    company: 'Empresa',
    legal: 'Legal',
    faqs: 'Preguntas Frecuentes',
    pricing: 'Precios',
    howWeCompare: 'Comparativa',
    affiliate: 'Programa de Afiliados',
    contact: 'Contacto',
    privacy: 'Privacidad',
    terms: 'T\u00E9rminos',
    copyright: 'Athli, Todos los derechos reservados',
    coach: 'Entrenador',
    client: 'Cliente',
  },
  features: {
    automations: { label: 'Automatizaciones' },
    forms: { label: 'Formularios' },
    inbox: { label: 'Bandeja de entrada' },
    metrics: { label: 'M\u00E9tricas' },
    habits: { label: 'H\u00E1bitos' },
    'exercise-history': { label: 'Historial de Ejercicios' },
    'progress-photos': { label: 'Fotos de Progreso' },
    'client-training': { label: 'Entrenamiento de Clientes' },
    workouts: { label: 'Entrenamientos' },
    packages: { label: 'Paquetes' },
  },
};

export default messages;
