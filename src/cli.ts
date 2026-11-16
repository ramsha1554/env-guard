import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { checkEnvironment, generateEnvExample } from './cliCore';
import type { EnvGuardSchema, EnvSource } from './types';

const usage = `Usage:
  envguard-config generate --schema <file> [--output <file>]
  envguard-config check --schema <file>

The schema file must export a default object or a named "schema" or "env" export.
`;

export type CliOptions = {
  cwd?: string;
  env?: EnvSource;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
};

type ParsedArguments =
  | { command: 'help' }
  | { command: 'check'; schemaPath: string }
  | { command: 'generate'; schemaPath: string; outputPath: string | undefined };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEnvGuardSchema(value: unknown): value is EnvGuardSchema {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([key, field]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || !isRecord(field)) {
      return false;
    }

    return (
      field.type === 'string' ||
      field.type === 'number' ||
      field.type === 'boolean' ||
      field.type === 'url' ||
      (field.type === 'enum' && Array.isArray(field.values))
    );
  });
}

function parseArguments(args: string[]): ParsedArguments {
  const command = args[0];
  if (command === '--help' || command === '-h') {
    return { command: 'help' };
  }
  if (command !== 'generate' && command !== 'check') {
    throw new Error(usage);
  }

  let schemaPath: string | undefined;
  let outputPath: string | undefined;

  for (let index = 1; index < args.length; index += 1) {
    const option = args[index];
    const value = args[index + 1];

    if (option === '--schema' && value) {
      schemaPath = value;
      index += 1;
    } else if (option === '--output' && value) {
      outputPath = value;
      index += 1;
    } else if (option === '--help' || option === '-h') {
      return { command: 'help' };
    } else {
      throw new Error(`Unknown or incomplete option: ${option}\n${usage}`);
    }
  }

  if (!schemaPath) {
    throw new Error(`--schema is required\n${usage}`);
  }
  if (command === 'check') {
    if (outputPath) {
      throw new Error('--output can only be used with the generate command');
    }
    return { command, schemaPath };
  }

  return { command, schemaPath, outputPath };
}

async function loadSchema(schemaPath: string): Promise<EnvGuardSchema> {
  const loaded: unknown = await import(pathToFileURL(schemaPath).href);
  if (!isRecord(loaded)) {
    throw new Error(`Could not load a schema object from ${schemaPath}`);
  }

  const schema = loaded.default ?? loaded.schema ?? loaded.env;
  if (!isEnvGuardSchema(schema)) {
    throw new Error(
      `Schema in ${schemaPath} must be an object with valid environment variable fields`
    );
  }

  return schema;
}

function writeOutput(message: string): void {
  process.stdout.write(message);
}

function writeError(message: string): void {
  process.stderr.write(message);
}

/** Runs the envguard-config CLI and returns its process exit code. */
export async function runCli(
  args: string[] = process.argv.slice(2),
  options: CliOptions = {}
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const stdout = options.stdout ?? writeOutput;
  const stderr = options.stderr ?? writeError;

  try {
    const parsed = parseArguments(args);
    if (parsed.command === 'help') {
      stdout(usage);
      return 0;
    }

    const schema = await loadSchema(resolve(cwd, parsed.schemaPath));
    if (parsed.command === 'generate') {
      const outputPath = resolve(cwd, parsed.outputPath ?? '.env.example');
      const contents = generateEnvExample(schema, { includeDescriptions: true });
      await writeFile(outputPath, `${contents}\n`, 'utf8');
      stdout(`Generated ${outputPath}\n`);
      return 0;
    }

    checkEnvironment(schema, env);
    stdout('Environment is valid.\n');
    return 0;
  } catch (error) {
    stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
