import os from 'os';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Tests exercise the real schema and seeding, so they must never touch the
// developer/production database at cwd/speakup.db. Each run gets a throwaway file.
const testDatabasePath = path.join(os.tmpdir(), `speakup-test-${process.pid}-${Date.now()}.db`);

export default defineConfig({
  test: {
    fileParallelism: false,
    env: {
      DATABASE_PATH: testDatabasePath,
      NODE_ENV: 'test'
    }
  }
});
