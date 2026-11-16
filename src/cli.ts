import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { envGuard } from './envGuard';
import type { EnvField, EnvGuardSchema, EnvSource } from './types';

const usage = `Usage:
  env-guard generate --schema <file> [--output <file>]
  env-guard check --schema <file>

The schema file must export a default EnvGuardSchema or a named "schema" export.
`;

export type CliOptions = {
  cwd?: string;
  env?: EnvSource;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
};

type ParsedArguments = {
  command: 'generate' | 'check' | 'help';
  schemaPath: string | undefined;
  outputPath: string | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEnvField(value: unknown): value is EnvField {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.type === 'string' ||
    value.type === 'number' ||
    value.type === 'boolean' ||
    value.type === 'url' ||
    (value.type === 'enum' && Array.isArray(value.values))
  );
}

function isEnvGuardSchema(value: unknown): value is EnvGuardSchema {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, field]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && isEnvField(field)
  );
}

function parseArguments(args: string[]): ParsedArguments {
  const command = args[0];
  if (command === '--help' || command === '-h') {
    return { command: 'help', schemaPath: undefined, outputPath: undefined };
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
      return { command: 'help', schemaPath: undefined, outputPath: undefined };
    } else {
      throw new Error(`Unknown or incomplete option: ${option}\n${usage}`);
    }
  }

  if (!schemaPath) {
    throw new Error(`--schema is required\n${usage}`);
  }
  if (command === 'check' && outputPath) {
    throw new Error('--output can only be used with the generate command');
  }

  return { command, schemaPath, outputPath };
}

async function loadSchema(schemaPath: string): Promise<EnvGuardSchema> {
  const loaded: unknown = await import(pathToFileURL(schemaPath).href);
  if (!isRecord(loaded)) {
    throw new Error(`Could not load a schema object from ${schemaPath}`);
  }

  const schema = 'default' in loaded ? loaded.default : loaded.schema;
  if (!isEnvGuardSchema(schema)) {
    throw new Error(
      `Schema in ${schemaPath} must be an object with valid environment variable fields`
    );
  }

  return schema;
}

function encodeValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`;
}

function createEnvExample(schema: EnvGuardSchema): string {
  const lines: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    if (field.description) {
      lines.push(...field.description.split(/\r?\n/).map((line) => `# ${line}`));
    }

    const defaultValue = 'default' in field && !field.secret ? field.default : undefined;
    lines.push(`${key}=${defaultValue === undefined ? '' : encodeValue(String(defaultValue))}`);
  }

  return `${lines.join('\n')}\n`;
}

function writeOutput(message: string): void {
  process.stdout.write(message);
}

function writeError(message: string): void {
  process.stderr.write(message);
}

/** Runs the env-guard CLI and returns its process exit code. */
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

    const schema = await loadSchema(resolve(cwd, parsed.schemaPath as string));
    if (parsed.command === 'generate') {
      const outputPath = resolve(cwd, parsed.outputPath ?? '.env.example');
      await writeFile(outputPath, createEnvExample(schema), 'utf8');
      stdout(`Generated ${outputPath}\n`);
      return 0;
    }

    envGuard(schema, { source: env });
    stdout('Environment is valid.\n');
    return 0;
  } catch (error) {
    stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
