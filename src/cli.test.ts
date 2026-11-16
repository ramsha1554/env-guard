import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runCli } from './cli';

describe('env-guard CLI', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'env-guard-cli-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('generates an example file without exposing secret defaults', async () => {
    await writeFile(
      join(directory, 'schema.mjs'),
      `export default {
        PORT: { type: 'number', default: 3000, description: 'HTTP port' },
        JWT_SECRET: { type: 'string', default: 'do-not-print', secret: true }
      };`
    );

    const output: string[] = [];
    const exitCode = await runCli(
      ['generate', '--schema', 'schema.mjs', '--output', 'generated.env'],
      { cwd: directory, stdout: (message) => output.push(message), stderr: (message) => output.push(message) }
    );

    expect(exitCode).toBe(0);
    expect(await readFile(join(directory, 'generated.env'), 'utf8')).toBe(
      '# HTTP port\nPORT="3000"\nJWT_SECRET=\n'
    );
    expect(output.join('')).toContain('Generated');
    expect(output.join('')).not.toContain('do-not-print');
  });

  it('checks the provided environment and reports all validation failures', async () => {
    await writeFile(
      join(directory, 'schema.mjs'),
      `export default {
        PORT: { type: 'number', required: true },
        MONGO_URI: { type: 'string', required: true }
      };`
    );

    const output: string[] = [];
    const exitCode = await runCli(['check', '--schema', 'schema.mjs'], {
      cwd: directory,
      env: { PORT: 'invalid' },
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message),
    });

    expect(exitCode).toBe(1);
    expect(output.join('')).toContain('Environment validation failed with 2 issues');
    expect(output.join('')).toContain('PORT');
    expect(output.join('')).toContain('MONGO_URI');
  });

  it('prints usage for help', async () => {
    const output: string[] = [];
    const exitCode = await runCli(['--help'], {
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message),
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('env-guard generate');
    expect(output.join('')).toContain('env-guard check');
  });
});
