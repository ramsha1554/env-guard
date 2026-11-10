#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { envGuard } from './envGuard';
import type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';

export type CliOptions = {
  schemaPath?: string;
  outputPath?: string;
};

export type CliCommand = 'generate' | 'check' | 'help';

export type EnvExampleOptions = {
  includeDescriptions?: boolean;
};

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return String(value ?? '');
}

function exampleValueFor(field: EnvField): string {
  if ('default' in field && field.default !== undefined) {
    return formatValue(field.default);
  }

  switch (field.type) {
    case 'string':
      return field.secret ? 'replace_me' : 'example';
    case 'number':
      return '3000';
    case 'boolean':
      return 'false';
    case 'enum':
      return String(field.values[0] ?? 'example');
    case 'url':
      return 'https://example.com';
    default:
      return '';
  }
}

export function generateEnvExample<T extends EnvGuardSchema>(schema: T, options: EnvExampleOptions = {}): string {
  const lines: string[] = [];

  for (const [key, field] of Object.entries(schema) as [string, EnvField][]) {
    if (options.includeDescriptions && field.description) {
      lines.push(`# ${field.description}`);
    }

    const sample = exampleValueFor(field);
    const placeholder = field.secret ? 'replace_me' : sample;
    lines.push(`${key}=${placeholder}`);
  }

  return lines.join('\n');
}

export function checkEnvironment<T extends EnvGuardSchema>(schema: T, source: EnvSource | Record<string, unknown> = process.env): InferEnv<T> {
  return envGuard(schema, { source, onError: 'throw' });
}

async function loadSchemaFromFile(schemaPath: string): Promise<EnvGuardSchema> {
  const resolvedPath = path.resolve(process.cwd(), schemaPath);
  const imported = await import(pathToFileURL(resolvedPath).href);
  const schema = imported.default ?? imported.schema ?? imported.env ?? imported;

  if (!schema || typeof schema !== 'object') {
    throw new Error(`Could not load a schema from ${schemaPath}`);
  }

  return schema as EnvGuardSchema;
}

function getOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }

  const longOption = name.includes('--') ? name : `--${name}`;
  const longIndex = args.indexOf(longOption);
  if (longIndex !== -1 && longIndex + 1 < args.length) {
    return args[longIndex + 1];
  }

  const shortOption = name.startsWith('-') ? name : `-${name.replace(/^--?/, '')}`;
  const shortIndex = args.indexOf(shortOption);
  if (shortIndex !== -1 && shortIndex + 1 < args.length) {
    return args[shortIndex + 1];
  }

  return undefined;
}

function printUsage(): void {
  console.log(`env-guard CLI

Usage:
  env-guard generate --schema <path> [--output <path>]
  env-guard check --schema <path>
  env-guard --help
`);
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...args] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    return 0;
  }

  if (command === 'generate') {
    const schemaPath = getOption(args, '--schema');
    if (!schemaPath) {
      console.error('Missing required --schema value for generate');
      printUsage();
      return 1;
    }

    const schema = await loadSchemaFromFile(schemaPath);
    const outputPath = getOption(args, '--output');
    const contents = generateEnvExample(schema, { includeDescriptions: true });

    if (outputPath) {
      const resolvedPath = path.resolve(process.cwd(), outputPath);
      fs.writeFileSync(resolvedPath, `${contents}\n`, 'utf8');
      console.log(`Wrote .env.example to ${resolvedPath}`);
      return 0;
    }

    console.log(contents);
    return 0;
  }

  if (command === 'check') {
    const schemaPath = getOption(args, '--schema');
    if (!schemaPath) {
      console.error('Missing required --schema value for check');
      printUsage();
      return 1;
    }

    const schema = await loadSchemaFromFile(schemaPath);
    try {
      checkEnvironment(schema, process.env);
      console.log('Environment variables look valid.');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      return 1;
    }
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  return 1;
}

export async function cli(argv: string[] = process.argv.slice(2)): Promise<number> {
  return runCli(argv);
}

if (process.argv[1] && /(?:\\|\/)(?:src\\|dist\\)?cli\.(?:js|cjs|mjs)$/.test(process.argv[1])) {
  void cli().then((code) => {
    process.exit(code);
  });
}

export default cli;
