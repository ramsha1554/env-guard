import { parseFieldValue } from './parsers';
import { EnvValidationError, type EnvValidationIssue } from './errors';
import type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';

export type EnvGuardOptions = {
  source?: EnvSource | Record<string, unknown>;
};

export function envGuard<T extends EnvGuardSchema>(schema: T, options: EnvGuardOptions = {}): InferEnv<T> {
  const source = options.source ?? process.env;
  const result = {} as Record<string, unknown>;
  const issues: EnvValidationIssue[] = [];

  for (const [key, field] of Object.entries(schema) as [string, EnvField][]) {
    const rawValue = source[key];
    const hasExplicitValue = rawValue !== undefined && rawValue !== null;

    let value: unknown;
    if (hasExplicitValue) {
      value = rawValue;
    } else if ('default' in field && field.default !== undefined) {
      value = field.default;
    } else {
      if (field.required === true) {
        issues.push({ key, code: 'ENV_REQUIRED', message: 'is required but missing' });
        continue;
      }

      result[key] = undefined;
      continue;
    }

    try {
      result[key] = parseFieldValue(key, field, value);
    } catch (error) {
      if (error instanceof EnvValidationError) {
        issues.push(...error.issues);
      } else {
        throw error;
      }
    }
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return Object.freeze(result) as InferEnv<T>;
}

export function defineSchema<T extends EnvGuardSchema>(schema: T): T {
  return schema;
}

export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
