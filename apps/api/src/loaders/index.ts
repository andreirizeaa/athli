import { createExpressApp } from './express';

export async function createApp() {
  // In future: connect DB, cache, message bus here.
  const app = createExpressApp();
  return app;
}

