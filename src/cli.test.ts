import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runCli } from './cli';
import { checkEnvironment, generateEnvExample } from './cliCore';

describe('CLI helpers', () => {
  it('builds a .env.example preview from a schema', () => {
    const schema = {
      PORT: { type: 'number', default: 5000 },
      NODE_ENV: { type: 'enum', values: ['development', 'production'] as const, default: 'development' },
      JWT_SECRET: { type: 'string', required: true, secret: true, minLength: 32 },
      API_URL: { type: 'url', default: 'https://example.com' },
    } as const;

    const example = generateEnvExample(schema);

    expect(example).toContain('PORT=5000');
    expect(example).toContain('NODE_ENV=development');
    expect(example).toContain('JWT_SECRET=replace_me');
    expect(example).toContain('API_URL=https://example.com');
  });

  it('validates environment values using a schema', () => {
    const schema = {
      PORT: { type: 'number', default: 3000 },
      NODE_ENV: { type: 'enum', values: ['development', 'test'] as const, default: 'development' },
    } as const;

    const env = checkEnvironment(schema, {
      PORT: '8080',
      NODE_ENV: 'test',
    });

    expect(env.PORT).toBe(8080);
    expect(env.NODE_ENV).toBe('test');
  });
});

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
      '# HTTP port\nPORT=3000\nJWT_SECRET=replace_me\n'
    );
    expect(output.join('')).toContain('Generated');
    expect(output.join('')).not.toContain('do-not-print');
  });

  it('checks a named schema export and reports all validation failures', async () => {
    await writeFile(
      join(directory, 'schema.mjs'),
      `export const schema = {
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
    expect(output.join('')).toContain('env-guard: 2 problems found');
    expect(output.join('')).toContain('PORT');
    expect(output.join('')).toContain('MONGO_URI');
  });

  it('accepts a named env export', async () => {
    await writeFile(
      join(directory, 'schema.mjs'),
      `export const env = {
        PORT: { type: 'number', default: 3000 }
      };`
    );

    const output: string[] = [];
    const exitCode = await runCli(['check', '--schema', 'schema.mjs'], {
      cwd: directory,
      env: {},
      stdout: (message) => output.push(message),
      stderr: (message) => output.push(message),
    });

    expect(exitCode).toBe(0);
    expect(output.join('')).toContain('Environment is valid');
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
