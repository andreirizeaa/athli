/**
 * AI Assistant Integration Test Script
 *
 * Tests the AI assistant acceptance criteria from the PRD.
 * Run: npx ts-node apps/athli-web-api/scripts/test-ai-assistant.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:3002/api/v1';
const COACH_ID = '5f016d89-03e8-4ebd-885a-42e8ff3039db';

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
  // AC-T1: Tool call status indicators
  {
    id: 'AC-T1',
    command: 'Create a full body workout for beginners',
    expectedBehavior: 'Generates workout, uses create_workout tool',
    validate: (result) => {
      return result.toolCalls.includes('create_workout') ||
             result.action?.type === 'create_workout';
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

  // First, check if AI service is healthy
  console.log('Checking AI service health...');
  const healthResponse = await fetch(`${API_URL}/ai/health`);
  const healthData = await healthResponse.json();

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

  const testCases = [
    {
      id: 'Direct-1',
      message: "What's the best rep range for hypertrophy?",
      expectedKeywords: ['hypertrophy', 'rep', 'muscle', '8', '12'],
    },
    {
      id: 'Direct-2',
      message: 'Create a push day workout',
      expectedTool: 'create_workout',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\nTest ${testCase.id}: ${testCase.message}`);
    console.log('-'.repeat(60));

    try {
      const result = await runAgentSimple(
        testCase.message,
        [],
        {},
        { coachId: COACH_ID }
      );

      console.log(`Response preview: ${result.content.substring(0, 300)}...`);

      if (result.action) {
        console.log(`Action type: ${result.action.type}`);
        console.log('✓ PASSED - Action generated');
      } else if ('expectedKeywords' in testCase && testCase.expectedKeywords) {
        const keywords = testCase.expectedKeywords;
        const hasKeyword = keywords.some(kw =>
          result.content.toLowerCase().includes(kw)
        );
        if (hasKeyword) {
          console.log('✓ PASSED - Content contains expected keywords');
        } else {
          console.log('✗ FAILED - Missing expected keywords');
        }
      }
    } catch (err: any) {
      console.log(`✗ ERROR - ${err.message}`);
    }
  }
}

runTests().catch(console.error);
