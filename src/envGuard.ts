import { parseFieldValue } from './parsers';
import type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';

export type EnvGuardIssueCode =
  | 'MISSING'
  | 'INVALID_TYPE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'PATTERN_MISMATCH'
  | 'OUT_OF_RANGE'
  | 'NOT_INTEGER'
  | 'NOT_IN_ENUM'
  | 'INVALID_URL';

export type EnvGuardIssue = {
  key: string;
  code: EnvGuardIssueCode;
  message: string;
  received?: unknown;
};

export type OnErrorHandler = (error: EnvGuardError) => unknown;

export type EnvGuardOptions = {
  source?: EnvSource | Record<string, unknown>;
  onError?: 'throw' | 'exit' | OnErrorHandler;
};

function formatIssueMessage(issue: EnvGuardIssue): string {
  return `  x ${issue.message}`;
}

function formatErrorMessage(issues: EnvGuardIssue[]): string {
  return `env-guard: ${issues.length} problem${issues.length === 1 ? '' : 's'} found\n${issues
    .map((issue) => formatIssueMessage(issue))
    .join('\n')}`;
}

function toIssueCode(field: EnvField, error: unknown, value: unknown): EnvGuardIssueCode {
  const text = error instanceof Error ? error.message : String(error);

  if (field.type === 'string') {
    if (text.includes('at least')) return 'TOO_SHORT';
    if (text.includes('at most')) return 'TOO_LONG';
    if (text.includes('pattern')) return 'PATTERN_MISMATCH';
  }

  if (field.type === 'number') {
    if (text.includes('integer')) return 'NOT_INTEGER';
    if (text.includes('must be >=') || text.includes('must be <=') || text.includes('must be a number')) {
      if (text.includes('a number')) return 'INVALID_TYPE';
      return 'OUT_OF_RANGE';
    }
  }

  if (field.type === 'boolean' || field.type === 'enum') {
    if (field.type === 'enum') return 'NOT_IN_ENUM';
    return 'INVALID_TYPE';
  }

  if (field.type === 'url') return 'INVALID_URL';

  if (typeof value === 'undefined' || value === null) return 'MISSING';
  return 'INVALID_TYPE';
}

export class EnvGuardError extends Error {
  issues: EnvGuardIssue[];

  constructor(issues: EnvGuardIssue[]) {
    super(formatErrorMessage(issues));
    this.name = 'EnvGuardError';
    this.issues = issues;
  }
}

function createIssueFromError(key: string, field: EnvField, value: unknown, error: unknown): EnvGuardIssue {
  const rawText = error instanceof Error ? error.message : String(error);
  const fallback = rawText.includes('required') ? 'is required but missing' : `${field.type === 'number' ? 'must be a number' : 'is invalid'}`;
  const code = toIssueCode(field, error, value);

  if (code === 'MISSING') {
    return { key, code, message: `${key} is required but missing` };
  }

  if (field.secret) {
    const message = `${key} ${fallback}`;
    return { key, code, message };
  }

  const withReceived = rawText.includes('got') ? rawText : `${rawText} (got ${JSON.stringify(value)})`;
  return {
    key,
    code,
    message: `${key} ${withReceived.replace(/^.*?\b(.*)$/, '$1')}`,
    received: value,
  };
}

export function envGuard<T extends EnvGuardSchema>(schema: T, options: EnvGuardOptions = {}): InferEnv<T> {
  const source = options.source ?? process.env;
  const result = {} as Record<string, unknown>;
  const issues: EnvGuardIssue[] = [];

  for (const [key, field] of Object.entries(schema) as [string, EnvField][]) {
    const rawValue = source[key];
    const hasExplicitValue = rawValue !== undefined && rawValue !== null;
    const hasDefault = 'default' in field && field.default !== undefined;

    if (!hasExplicitValue && !hasDefault && field.required !== true) {
      result[key] = undefined;
      continue;
    }

    if (!hasExplicitValue && !hasDefault && field.required === true) {
      issues.push({ key, code: 'MISSING', message: `${key} is required but missing` });
      continue;
    }

    const valueToValidate = hasExplicitValue ? rawValue : field.default;

    try {
      result[key] = parseFieldValue(key, field, valueToValidate);
    } catch (error) {
      const issue = createIssueFromError(key, field, valueToValidate, error);
      issues.push(issue);
    }
  }

  if (issues.length > 0) {
    const error = new EnvGuardError(issues);

    if (options.onError === 'exit') {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
      return undefined as unknown as InferEnv<T>;
    }

    if (typeof options.onError === 'function') {
      options.onError(error);
      return undefined as unknown as InferEnv<T>;
    }

    throw error;
  }

  return Object.freeze(result) as InferEnv<T>;
}

export function defineSchema<T extends EnvGuardSchema>(schema: T): T {
  return schema;
}

export type { EnvField, EnvGuardSchema, EnvSource, InferEnv } from './types';
