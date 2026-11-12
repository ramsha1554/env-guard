#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { checkEnvironment, generateEnvExample } from './cliCore';
import type { EnvGuardSchema } from './types';

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
  process.stdout.write(`env-guard CLI

Usage:
  env-guard generate --schema <path> [--output <path>]
  env-guard check --schema <path>
  env-guard --help
`);
}

async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [command, ...args] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    return 0;
  }

  if (command === 'generate') {
    const schemaPath = getOption(args, '--schema');
    if (!schemaPath) {
      process.stderr.write('Missing required --schema value for generate\n');
      printUsage();
      return 1;
    }

    const schema = await loadSchemaFromFile(schemaPath);
    const outputPath = getOption(args, '--output');
    const contents = generateEnvExample(schema, { includeDescriptions: true });

    if (outputPath) {
      const resolvedPath = path.resolve(process.cwd(), outputPath);
      fs.writeFileSync(resolvedPath, `${contents}\n`, 'utf8');
      process.stdout.write(`Wrote .env.example to ${resolvedPath}\n`);
      return 0;
    }

    process.stdout.write(`${contents}\n`);
    return 0;
  }

  if (command === 'check') {
    const schemaPath = getOption(args, '--schema');
    if (!schemaPath) {
      process.stderr.write('Missing required --schema value for check\n');
      printUsage();
      return 1;
    }

    const schema = await loadSchemaFromFile(schemaPath);
    try {
      checkEnvironment(schema, process.env);
      process.stdout.write('Environment variables look valid.\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      return 1;
    }
  }

  process.stderr.write(`Unknown command: ${command}\n`);
  printUsage();
  return 1;
}

void runCli().then((code) => {
  process.exit(code);
});
