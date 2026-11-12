import { envGuard } from './index';
import type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';

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

export function checkEnvironment<T extends EnvGuardSchema>(
  schema: T,
  source: EnvSource | Record<string, unknown> = process.env
): InferEnv<T> {
  return envGuard(schema, { source, onError: 'throw' });
}
