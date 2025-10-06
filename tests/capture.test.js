import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';

const saveDir = './screenshots';

function cleanScreenshots() {
  if (fs.existsSync(saveDir)) {
    fs.rmSync(saveDir, { recursive: true, force: true });
  }
}

describe('capture.js', () => {
  beforeAll(() => cleanScreenshots());
  afterAll(() => cleanScreenshots());

  it('should create screenshots directory if it does not exist', async () => {
    const { execSync } = await import('child_process');
    execSync('node scripts/capture.js https://example.com', { stdio: 'ignore' });
    expect(fs.existsSync(saveDir)).toBe(true);
  });

  it('should produce a file with proper naming pattern', () => {
    const files = fs.readdirSync(saveDir);
    const match = files.some(f => /^screenshot_example_com_\d{4}-\d{2}-\d{2}/.test(f));
    expect(match).toBe(true);
  });

  it('should exit gracefully with invalid URL', async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync('node', ['scripts/capture.js', 'not-a-real-url']);
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Invalid URL');
  });

  it('should exit gracefully with missing URL', async () => {
    const { spawnSync } = await import('child_process');
    const result = spawnSync('node', ['scripts/capture.js']);
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Please provide a URL');
  });
});
