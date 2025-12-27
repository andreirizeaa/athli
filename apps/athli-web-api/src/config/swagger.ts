import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation for the backend service',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'name', 'role', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['email', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              default: 'user',
              description: 'User role',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                details: {
                  type: 'object',
                  description: 'Additional error details',
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        Todo: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            title: { type: 'string' },
            information: { type: 'string' },
            type: { type: 'string', enum: ['client', 'general'] },
            client_id: { type: 'string', nullable: true },
            due_date: { type: 'string', format: 'date-time' },
            completed: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            clientName: { type: 'string', nullable: true },
            clientAvatar: { type: 'string', nullable: true },
          },
        },
        CreateTodoRequest: {
          type: 'object',
          required: ['title', 'type', 'due_date'],
          properties: {
            title: { type: 'string' },
            information: { type: 'string' },
            type: { type: 'string', enum: ['client', 'general'] },
            client_id: { type: 'string' },
            due_date: { type: 'string', format: 'date-time' },
          },
        },
        AutoTodo: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            title: { type: 'string' },
            type: { type: 'string', enum: ['client', 'general'] },
            client_id: { type: 'string', nullable: true },
            completed: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            clientName: { type: 'string', nullable: true },
            clientAvatar: { type: 'string', nullable: true },
          },
        },
        CoachHabit: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            schedule_type: { type: 'string', enum: ['daily', 'weekly', 'custom'] },
            days_of_week: { type: 'array', items: { type: 'integer' } },
            times_of_day: { type: 'array', items: { type: 'string' } },
            timezone: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            schedule_config: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachHabitInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            schedule_type: { type: 'string' },
            days_of_week: { type: 'array', items: { type: 'integer' } },
            times_of_day: { type: 'array', items: { type: 'string' } },
            timezone: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            schedule_config: { type: 'object' },
          },
        },
        UpdateCoachHabitInput: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            schedule_type: { type: 'string' },
            days_of_week: { type: 'array', items: { type: 'integer' } },
            times_of_day: { type: 'array', items: { type: 'string' } },
            timezone: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            schedule_config: { type: 'object' },
          },
        },
        CoachMetric: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            unit: { type: 'string' },
            type: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachMetricInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            unit: { type: 'string' },
            type: { type: 'string' },
          },
        },
        UpdateCoachMetricInput: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            unit: { type: 'string' },
            type: { type: 'string' },
          },
        },
        CoachWorkout: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
            equipment: { type: 'string' },
            difficulty: { type: 'string' },
            workout_data: { type: 'object' },
            total_exercises: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachWorkoutInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
            equipment: { type: 'string' },
            difficulty: { type: 'string' },
            workout_data: { type: 'object' },
            total_exercises: { type: 'integer' },
          },
        },
        CoachProgram: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            program_data: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachProgramInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            program_data: { type: 'object' },
          },
        },
        CoachExercise: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            muscle_group: { type: 'string' },
            equipment: { type: 'string' },
            modality: { type: 'string' },
            video_link: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachExerciseInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            muscle_group: { type: 'string' },
            equipment: { type: 'string' },
            modality: { type: 'string' },
            video_link: { type: 'string' },
          },
        },
        CoachFile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            filename: { type: 'string' },
            storage_path: { type: 'string' },
            file_size: { type: 'integer' },
            mime_type: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CoachClient: {
          type: 'object',
          properties: {
            client_id: { type: 'string' },
            user_profiles: {
              type: 'object',
              properties: {
                full_name: { type: 'string' },
                avatar_url: { type: 'string' },
                email: { type: 'string' },
              },
            },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CoachCheckIn: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            questions: { type: 'array', items: { type: 'object' } },
            schedule_config: { type: 'object' },
            cron_expression: { type: 'string' },
            num_of_questions: { type: 'integer' },
            is_template: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachCheckInInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            questions: { type: 'array', items: { type: 'object' } },
            schedule_config: { type: 'object' },
            cron_expression: { type: 'string' },
            num_of_questions: { type: 'integer' },
            is_template: { type: 'boolean' },
          },
        },
        UpdateCoachCheckInInput: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            questions: { type: 'array', items: { type: 'object' } },
            schedule_config: { type: 'object' },
            cron_expression: { type: 'string' },
            num_of_questions: { type: 'integer' },
            is_template: { type: 'boolean' },
          },
        },
        CoachQuestionnaire: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            questions: { type: 'array', items: { type: 'object' } },
            num_of_questions: { type: 'integer' },
            is_template: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachQuestionnaireInput: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            questions: { type: 'array', items: { type: 'object' } },
            num_of_questions: { type: 'integer' },
            is_template: { type: 'boolean' },
          },
        },
        UpdateCoachQuestionnaireInput: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            questions: { type: 'array', items: { type: 'object' } },
            num_of_questions: { type: 'integer' },
            is_template: { type: 'boolean' },
          },
        },
        CoachFlow: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            coach_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            flow_data: { type: 'object' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateCoachFlowInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            flow_data: { type: 'object' },
            is_active: { type: 'boolean' },
          },
        },
        UpdateCoachFlowInput: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            flow_data: { type: 'object' },
            is_active: { type: 'boolean' },
          },
        },
        CoachCode: {
          type: 'object',
          properties: {
            coach: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                profilePictureUrl: { type: 'string' },
                companyName: { type: 'string' },
                companyLogoUrl: { type: 'string' },
              },
            },
          },
        },
        ClientProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            full_name: { type: 'string' },
            avatar_url: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ClientHabit: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            habit_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            completed_at: { type: 'string', format: 'date-time' },
          },
        },
        ClientMetric: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            metric_id: { type: 'string' },
            name: { type: 'string' },
            value: { type: 'string' },
            unit: { type: 'string' },
            recorded_at: { type: 'string', format: 'date-time' },
          },
        },
        ClientWorkout: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            workout_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            scheduled_at: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
          },
        },
        ClientCheckIn: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            check_in_id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            due_at: { type: 'string', format: 'date-time' },
          },
        },
        ClientQuestionnaire: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            questionnaire_id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            due_at: { type: 'string', format: 'date-time' },
          },
        },
        SubmitFormInput: {
          type: 'object',
          required: ['formId', 'responses'],
          properties: {
            formId: { type: 'string' },
            responses: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: ['./src/api/**/*.ts', './src/loaders/**/*.ts'], // Paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);

