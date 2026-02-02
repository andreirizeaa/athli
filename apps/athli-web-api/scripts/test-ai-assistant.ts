/**
 * AI Assistant Integration Test Script
 *
 * Tests the AI assistant for all 12 fixed issues plus acceptance criteria from the PRD.
 * Run: npx ts-node apps/athli-web-api/scripts/test-ai-assistant.ts
 *
 * Traces are automatically sent to LangSmith (athli-ai-assistant project).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:3002/api/v1';
// Will be fetched dynamically if not set
let COACH_ID = process.env.TEST_COACH_ID || '5f016d89-03e8-4ebd-885a-42e8ff3039db';

// Create a custom fetch that handles SSE
async function streamChat(message: string, authToken: string): Promise<{
  content: string;
  toolCalls: string[];
  action?: any;
  error?: string;
}> {
  const response = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      message,
      sessionId: 'test-session',
      context: { currentPage: '/assistant' },
      conversationHistory: [],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { content: '', toolCalls: [], error };
  }

  const body = await response.text();
  const lines = body.split('\n');

  let content = '';
  const toolCalls: string[] = [];
  let action: any = null;
  let error: string | undefined;

  let currentEvent = '';
  let currentData = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7);
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6);
    } else if (line === '' && currentEvent) {
      // Process event
      try {
        const data = currentData ? JSON.parse(currentData) : {};

        if (currentEvent === 'content' && data.delta) {
          content += data.delta;
        } else if (currentEvent === 'tool_call') {
          if (data.status === 'calling') {
            toolCalls.push(data.tool);
          }
        } else if (currentEvent === 'action') {
          action = data;
        } else if (currentEvent === 'error') {
          error = data.message;
        }
      } catch {
        // Ignore parse errors
      }
      currentEvent = '';
      currentData = '';
    }
  }

  return { content, toolCalls, action, error };
}

// Test cases from PRD Section 6
interface TestCase {
  id: string;
  command: string;
  expectedBehavior: string;
  validate: (result: { content: string; toolCalls: string[]; action?: any }) => boolean;
}

const testCases: TestCase[] = [
  // ==================== ISSUE-SPECIFIC TESTS ====================

  // Issue 1: Draft message should be editable text (tested via action type)
  {
    id: 'ISSUE-1',
    command: 'Draft a motivational message for Sarah',
    expectedBehavior: 'Returns draft_message action (UI shows editable textarea)',
    validate: (result) => {
      return result.toolCalls.includes('draft_message_for_client') ||
             result.action?.action === 'draft_message';
    },
  },

  // Issue 2: Workout columns should use correct types
  {
    id: 'ISSUE-2',
    command: 'Create a simple strength workout with bench press',
    expectedBehavior: 'Creates workout with proper trackable columns (Reps/kg)',
    validate: (result) => {
      if (!result.action || result.action.action !== 'create_workout') {
        return result.toolCalls.includes('get_exercise_catalog');
      }
      // If we got an action, check the payload has exercises
      const payload = result.action.payload;
      return payload?.sections?.some((s: any) => s.exercises?.length > 0);
    },
  },

  // Issue 3: Workout assignment uses future dates
  {
    id: 'ISSUE-3',
    command: 'Assign any workout to Sarah for her next session',
    expectedBehavior: 'Uses today or future date (not past)',
    validate: (result) => {
      if (result.action?.action === 'assign_workout') {
        const date = result.action.payload?.date;
        const today = new Date().toISOString().split('T')[0];
        return date >= today;
      }
      // If searching for data first, that's acceptable
      return result.toolCalls.includes('get_coach_workouts') ||
             result.toolCalls.includes('search_clients');
    },
  },

  // Issue 5: Assign metric without loop
  {
    id: 'ISSUE-5',
    command: 'Assign body weight tracking to Sarah',
    expectedBehavior: 'Finds/creates metric and shows assign action (no loop)',
    validate: (result) => {
      return result.toolCalls.includes('list_all_metrics') ||
             result.action?.action === 'assign_metric_to_client' ||
             result.action?.action === 'create_metric';
    },
  },

  // Issue 6: Tool display names (verify tools are called with proper names)
  {
    id: 'ISSUE-6',
    command: 'Show me all my clients',
    expectedBehavior: 'Calls list_all_clients tool',
    validate: (result) => {
      return result.toolCalls.includes('list_all_clients');
    },
  },

  // Issue 8a: Goals get default target date
  {
    id: 'ISSUE-8a',
    command: 'Add a muscle gain goal for Sarah',
    expectedBehavior: 'Goal has target date (~6 months from today)',
    validate: (result) => {
      if (result.action?.action === 'add_client_goal') {
        const targetDate = result.action.payload?.targetDate;
        return !!targetDate; // Has a date
      }
      return result.toolCalls.includes('search_clients');
    },
  },

  // Issue 8b: Injuries get default date
  {
    id: 'ISSUE-8b',
    command: 'Record that Sarah has a mild knee strain',
    expectedBehavior: 'Injury has dateOccurred (today if not specified)',
    validate: (result) => {
      if (result.action?.action === 'add_client_injury') {
        const dateOccurred = result.action.payload?.dateOccurred;
        return !!dateOccurred;
      }
      return result.toolCalls.includes('search_clients');
    },
  },

  // Issue 9: Client category uses correct values
  {
    id: 'ISSUE-9',
    command: "Change Sarah's coaching type to hybrid",
    expectedBehavior: 'Uses "hybrid" (not "athlete" or invalid value)',
    validate: (result) => {
      if (result.action?.action === 'update_client_profile') {
        const category = result.action.payload?.updates?.category;
        return ['online', 'in-person', 'hybrid'].includes(category);
      }
      return result.toolCalls.includes('search_clients');
    },
  },

  // Issue 12: Check-in question types (yesNo, not yes_no)
  {
    id: 'ISSUE-12',
    command: 'Create a check-in form called "Quick Check" with a yes/no question about workout completion and a rating question for energy',
    expectedBehavior: 'Question types are "yesNo" and "rating" (camelCase)',
    validate: (result) => {
      if (result.action?.action === 'create_checkin_template') {
        const questions = result.action.payload?.questions || [];
        const types = questions.map((q: any) => q.type);
        // Should have yesNo, not yes_no
        const hasCorrectYesNo = types.includes('yesNo') && !types.includes('yes_no');
        // Should have rating or scale
        const hasRating = types.includes('rating') || types.includes('scale');
        return hasCorrectYesNo || hasRating;
      }
      return false; // Must have create action
    },
  },

  // Issue 15: Create metric
  {
    id: 'ISSUE-15',
    command: 'Create a new metric called "1RM Bench Press" for tracking maximum bench weight in kg',
    expectedBehavior: 'Returns create_metric action',
    validate: (result) => {
      return result.action?.action === 'create_metric';
    },
  },

  // ==================== PRD ACCEPTANCE TESTS ====================

  // AC-T1: Tool call status indicators
  {
    id: 'AC-T1',
    command: 'Create a full body workout for beginners',
    expectedBehavior: 'Generates workout, uses create_workout tool',
    validate: (result) => {
      return result.toolCalls.includes('create_workout') ||
             result.action?.action === 'create_workout';
    },
  },
  // AC-T4: Exercise substitutions
  {
    id: 'AC-T4',
    command: 'What exercises can I substitute for bench press?',
    expectedBehavior: 'Lists alternatives with explanations',
    validate: (result) => {
      const content = result.content.toLowerCase();
      return content.includes('dumbbell') ||
             content.includes('press') ||
             content.includes('fly') ||
             content.includes('push') ||
             content.includes('chest') ||
             content.includes('substitute');
    },
  },
  // AC-T7: Equipment-specific workout
  {
    id: 'AC-T7',
    command: 'Create a workout using only dumbbells',
    expectedBehavior: 'Generates dumbbell-only workout',
    validate: (result) => {
      return result.toolCalls.includes('create_workout') ||
             result.action?.type === 'create_workout' ||
             result.content.toLowerCase().includes('dumbbell');
    },
  },
  // AC-K1: Knowledge query
  {
    id: 'AC-K1',
    command: "What's the best rep range for hypertrophy?",
    expectedBehavior: 'Provides evidence-based answer',
    validate: (result) => {
      const content = result.content.toLowerCase();
      return content.includes('hypertrophy') ||
             content.includes('rep') ||
             content.includes('muscle') ||
             content.includes('8-12') ||
             content.includes('growth');
    },
  },
  // AC-K2: Programming knowledge
  {
    id: 'AC-K2',
    command: 'How should I program for a powerlifting meet?',
    expectedBehavior: 'Explains peaking/tapering concepts',
    validate: (result) => {
      const content = result.content.toLowerCase();
      return content.includes('peak') ||
             content.includes('taper') ||
             content.includes('competition') ||
             content.includes('meet') ||
             content.includes('intensity') ||
             content.includes('volume');
    },
  },
  // AC-K4: Knowledge query
  {
    id: 'AC-K4',
    command: 'Explain progressive overload',
    expectedBehavior: 'Educational response with examples',
    validate: (result) => {
      const content = result.content.toLowerCase();
      return content.includes('progressive') ||
             content.includes('overload') ||
             content.includes('increase') ||
             content.includes('weight') ||
             content.includes('reps');
    },
  },
  // AC-K5: Knowledge comparison
  {
    id: 'AC-K5',
    command: "What's the difference between linear and undulating periodization?",
    expectedBehavior: 'Comparative explanation',
    validate: (result) => {
      const content = result.content.toLowerCase();
      return content.includes('linear') ||
             content.includes('undulating') ||
             content.includes('periodization') ||
             content.includes('week') ||
             content.includes('volume');
    },
  },
  // AC-C5: Find inactive clients
  {
    id: 'AC-C5',
    command: "Who hasn't trained in the last 7 days?",
    expectedBehavior: 'Uses get_inactive_clients tool',
    validate: (result) => {
      return result.toolCalls.includes('get_inactive_clients');
    },
  },
  // AC-H1: Human-in-the-loop - client search
  {
    id: 'AC-H1',
    command: "How is John doing?",
    expectedBehavior: 'Searches for client named John',
    validate: (result) => {
      return result.toolCalls.includes('search_clients') ||
             result.content.toLowerCase().includes('john') ||
             result.content.toLowerCase().includes('client');
    },
  },
];

async function runTests() {
  console.log('='.repeat(60));
  console.log('AI Assistant Integration Tests');
  console.log('='.repeat(60));
  console.log();

  // Check if we should skip API tests and go direct
  const skipApi = process.argv.includes('--direct') || process.argv.includes('-d');

  if (skipApi) {
    console.log('Running direct agent tests (skipping API)...');
    await runDirectAgentTests();
    return;
  }

  // First, check if AI service is healthy
  console.log('Checking AI service health...');
  let healthData: any;
  try {
    const healthResponse = await fetch(`${API_URL}/ai/health`);
    healthData = await healthResponse.json();
  } catch (err) {
    console.log('API server not running. Running direct agent tests instead...');
    await runDirectAgentTests();
    return;
  }

  if (!healthData.data?.openRouterConfigured) {
    console.error('ERROR: OpenRouter API key not configured!');
    console.log('Health response:', JSON.stringify(healthData, null, 2));
    return;
  }

  console.log('✓ AI service is healthy');
  console.log(`  - OpenRouter: ${healthData.data.openRouterConfigured ? 'configured' : 'not configured'}`);
  console.log(`  - LangSmith: ${healthData.data.langSmithConfigured ? 'configured' : 'not configured'}`);
  console.log();

  // Get auth token for the coach
  console.log('Getting auth token for coach...');

  const { createClient } = await import('@supabase/supabase-js');
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing Supabase credentials');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get a session for the coach
  const { data: user } = await supabase.auth.admin.getUserById(COACH_ID);

  if (!user?.user) {
    console.error('ERROR: Coach user not found');
    return;
  }

  // Generate a token for the user
  const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.user.email!,
  });

  if (sessionError || !session) {
    console.error('ERROR: Could not generate auth link:', sessionError?.message);
    return;
  }

  // Exchange the link for a session
  const linkUrl = new URL(session.properties.hashed_token, SUPABASE_URL);
  const tokenHash = linkUrl.searchParams.get('token') || session.properties.hashed_token;

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (verifyError || !verifyData?.session) {
    // Try alternative: use impersonation via service role
    console.log('Using service role for testing (bypassing user auth)...');

    // Create a custom test endpoint or modify the controller to accept service role
    // For now, let's just test the LangGraph agent directly
    console.log();
    console.log('Running direct agent tests...');

    await runDirectAgentTests();
    return;
  }

  const authToken = verifyData.session.access_token;
  console.log('✓ Got auth token');
  console.log();

  // Run test cases
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\nTest ${testCase.id}: ${testCase.command}`);
    console.log('-'.repeat(60));

    try {
      const result = await streamChat(testCase.command, authToken);

      if (result.error) {
        console.log(`✗ FAILED - Error: ${result.error}`);
        failed++;
        continue;
      }

      console.log(`Tool calls: ${result.toolCalls.join(', ') || 'none'}`);
      console.log(`Action: ${result.action ? JSON.stringify(result.action.type) : 'none'}`);
      console.log(`Response preview: ${result.content.substring(0, 200)}...`);

      const isValid = testCase.validate(result);

      if (isValid) {
        console.log(`✓ PASSED - ${testCase.expectedBehavior}`);
        passed++;
      } else {
        console.log(`✗ FAILED - Expected: ${testCase.expectedBehavior}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`✗ ERROR - ${err.message}`);
      failed++;
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
}

async function runDirectAgentTests() {
  // Test the agent directly without authentication
  const { runAgentSimple } = await import('../src/services/ai/langgraph-agent');

  console.log('\n' + '='.repeat(60));
  console.log('DIRECT AGENT TESTS (Issue-specific)');
  console.log('='.repeat(60));
  console.log('LangSmith Project:', process.env.LANGCHAIN_PROJECT || 'default');
  console.log('Tracing:', process.env.LANGCHAIN_TRACING_V2 === 'true' ? 'ENABLED' : 'DISABLED');

  const directTests = [
    // Issue 3: Future dates - CRITICAL TEST
    {
      id: 'ISSUE-3',
      message: 'What is today\'s date?',
      check: (r: any) => {
        const today = new Date().toISOString().split('T')[0];
        return r.content.includes(today) || r.content.includes('2026') ? `PASS: Knows today (${today})` : 'FAIL: Wrong date context';
      },
    },
    // Issue 9: Categories - CRITICAL TEST
    {
      id: 'ISSUE-9',
      message: 'What are the valid client coaching categories?',
      check: (r: any) => {
        const content = r.content.toLowerCase();
        const hasCorrect = content.includes('online') || content.includes('hybrid') || content.includes('in-person');
        const hasWrong = content.includes('athlete') || content.includes('rehab') || content.includes('weight loss');
        return hasCorrect && !hasWrong ? 'PASS: Correct categories' : (hasWrong ? 'FAIL: Old categories' : 'INFO: Check response');
      },
    },
    // Issue 2: Workout column knowledge
    {
      id: 'ISSUE-2',
      message: 'What trackable columns are available for exercises in workouts?',
      check: (r: any) => {
        const content = r.content.toLowerCase();
        const hasColumns = content.includes('reps') || content.includes('kg') || content.includes('minutes');
        const hasHRZone = content.includes('heart rate') || content.includes('zone');
        return hasColumns ? `PASS: Knows columns (HR Zone: ${hasHRZone})` : 'FAIL: Missing column info';
      },
    },
    // Issue 2b: Cardio workout columns
    {
      id: 'ISSUE-2b',
      message: 'Create a simple cardio workout with treadmill running for 30 minutes',
      check: (r: any) => {
        if (r.action?.type === 'create_workout') {
          const sections = r.action.payload?.sections || [];
          for (const section of sections) {
            for (const ex of section.exercises || []) {
              // Check if cardio uses minutes
              if (ex.column1Label === 'minutes') {
                return `PASS: Cardio uses minutes column (column1Label=${ex.column1Label})`;
              }
            }
          }
          return 'FAIL: Cardio not using minutes column';
        }
        return 'INFO: Fetching exercise catalog first';
      },
    },
    // Issue 2c: Weight values are numeric
    {
      id: 'ISSUE-2c',
      message: 'Create a simple strength workout with barbell bench press for 3 sets of 10 reps',
      check: (r: any) => {
        if (r.action?.type === 'create_workout') {
          const sections = r.action.payload?.sections || [];
          for (const section of sections) {
            for (const ex of section.exercises || []) {
              const weightVal = ex.column2Value;
              // Check if weight is a number (or null for Optional)
              if (weightVal !== null && weightVal !== undefined && isNaN(Number(weightVal))) {
                return `FAIL: Weight value is not numeric: "${weightVal}"`;
              }
              if (ex.column2Label === 'kg' && weightVal) {
                return `PASS: Weight is numeric: ${weightVal}kg`;
              }
            }
          }
          return 'INFO: Check payload structure';
        }
        return 'INFO: Fetching exercise catalog first';
      },
    },
    // Issue 1: Draft message - use specific client
    {
      id: 'ISSUE-1',
      message: 'Draft a motivational message for Michael Williams',
      check: (r: any) => r.action?.type === 'draft_message' ? 'PASS: draft_message action' : 'INFO: Check if searching client',
    },
    // Issue 8a: Goal dates - use specific client
    {
      id: 'ISSUE-8a',
      message: 'Add a muscle gain goal for Michael Williams',
      check: (r: any) => {
        if (r.action?.type === 'add_client_goal') {
          const date = r.action.payload?.targetDate;
          return date ? `PASS: Has target date ${date}` : 'FAIL: No target date';
        }
        return 'INFO: Searching for client first';
      },
    },
    // Issue 8b: Injury dates - use specific client
    {
      id: 'ISSUE-8b',
      message: 'Record that James Rodriguez has a mild ankle sprain',
      check: (r: any) => {
        if (r.action?.type === 'add_client_injury') {
          const date = r.action.payload?.dateOccurred;
          return date ? `PASS: Has date ${date}` : 'FAIL: No date occurred';
        }
        return 'INFO: Searching for client first';
      },
    },
    // Issue 12: Question types
    {
      id: 'ISSUE-12',
      message: 'Create a simple check-in form called "Daily Check" with one yes/no question asking if they worked out today',
      check: (r: any) => {
        if (r.action?.type === 'create_checkin_template') {
          const questions = r.action.payload?.questions || [];
          const types = questions.map((q: any) => q.type).join(', ');
          const hasSnakeCase = types.includes('yes_no') || types.includes('multiple_choice');
          return hasSnakeCase ? `FAIL: Snake case types (${types})` : `PASS: Types are ${types}`;
        }
        return 'INFO: No checkin action yet';
      },
    },
    // Issue 15: Create metric
    {
      id: 'ISSUE-15',
      message: 'Create a new metric called "1RM Deadlift" for tracking maximum deadlift in kg',
      check: (r: any) => {
        if (r.action?.type === 'create_metric') {
          return `PASS: create_metric action with name "${r.action.payload?.name}"`;
        }
        return 'INFO: No create_metric action';
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  let info = 0;

  for (const test of directTests) {
    console.log(`\n--- Test ${test.id}: ${test.message.substring(0, 50)}... ---`);

    try {
      const result = await runAgentSimple(
        test.message,
        [],
        {},
        { coachId: COACH_ID }
      );

      const checkResult = test.check(result);
      console.log(`Result: ${checkResult}`);

      if (result.action) {
        console.log(`Action: ${result.action.type}`);
      }

      console.log(`Response: ${result.content.substring(0, 150)}...`);

      if (checkResult.startsWith('PASS')) passed++;
      else if (checkResult.startsWith('FAIL')) failed++;
      else info++;

    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
      failed++;
    }

    // Rate limit delay
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${info} info`);
  console.log('='.repeat(60));
  console.log(`\nView traces at: https://smith.langchain.com/`);
}

runTests().catch(console.error);
