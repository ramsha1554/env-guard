import type { BooleanField, EnvField, NumberField, StringField, UrlField } from './types';
import { EnvValidationError, type EnvValidationIssueCode } from './errors';

function fail(key: string, code: EnvValidationIssueCode, message: string): never {
  throw new EnvValidationError([{ key, code, message }]);
}

function received(value: unknown, secret: boolean): string {
  return secret ? ' (value redacted)' : ` (got ${JSON.stringify(value)})`;
}

export function parseStringValue(key: string, value: unknown, field: StringField): string {
  const text = typeof value === 'string' ? value : String(value ?? '');

  if (field.minLength !== undefined && text.length < field.minLength) {
    fail(
      key,
      'ENV_STRING_TOO_SHORT',
      `must be at least ${field.minLength} characters long${received(text, field.secret === true)}`
    );
  }

  if (field.maxLength !== undefined && text.length > field.maxLength) {
    fail(
      key,
      'ENV_STRING_TOO_LONG',
      `must be at most ${field.maxLength} characters long${received(text, field.secret === true)}`
    );
  }

  if (field.pattern !== undefined) {
    const pattern = typeof field.pattern === 'string' ? new RegExp(field.pattern) : field.pattern;
    if (!pattern.test(text)) {
      fail(key, 'ENV_STRING_PATTERN', 'does not match the required pattern');
    }
  }

  return text;
}

export function parseNumberValue(key: string, value: unknown, field: NumberField): number {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '');

  if (raw === '' || raw === 'null' || raw === 'undefined') {
    fail(key, 'ENV_INVALID_NUMBER', `must be a number${received(value, field.secret === true)}`);
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    fail(key, 'ENV_INVALID_NUMBER', `must be a number${received(value, field.secret === true)}`);
  }

  if (field.integer && !Number.isInteger(parsed)) {
    fail(key, 'ENV_NUMBER_NOT_INTEGER', `must be an integer${received(value, field.secret === true)}`);
  }

  if (field.min !== undefined && parsed < field.min) {
    fail(key, 'ENV_NUMBER_TOO_SMALL', `must be >= ${field.min}${received(value, field.secret === true)}`);
  }

  if (field.max !== undefined && parsed > field.max) {
    fail(key, 'ENV_NUMBER_TOO_LARGE', `must be <= ${field.max}${received(value, field.secret === true)}`);
  }

  return parsed;
}

export function parseBooleanValue(key: string, value: unknown, _field: BooleanField): boolean {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : String(value ?? '').toLowerCase();
  const truthy = new Set(['true', '1', 'yes', 'on']);
  const falsy = new Set(['false', '0', 'no', 'off']);

  if (truthy.has(raw)) {
    return true;
  }

  if (falsy.has(raw)) {
    return false;
  }

  fail(key, 'ENV_INVALID_BOOLEAN', `must be a boolean${received(value, _field.secret === true)}`);
}

export function parseEnumValue<T extends readonly unknown[]>(
  key: string,
  value: unknown,
  field: { values: T; secret?: boolean }
): T[number] {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '');
  const chosen = field.values.find((candidate) => String(candidate) === raw);

  if (chosen === undefined) {
    fail(
      key,
      'ENV_INVALID_ENUM',
      `must be one of ${field.values.map(String).join(', ')}${received(value, field.secret === true)}`
    );
  }

  return chosen;
}

export function parseUrlValue(key: string, value: unknown, field: UrlField): string {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '');
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    fail(key, 'ENV_INVALID_URL', `must be a valid URL${received(value, field.secret === true)}`);
  }

  if (field.protocols && field.protocols.length > 0) {
    const normalized = parsed.protocol.replace(':', '');
    if (!field.protocols.map((protocol) => protocol.toLowerCase()).includes(normalized.toLowerCase())) {
      fail(key, 'ENV_UNSUPPORTED_URL_PROTOCOL', 'has an unsupported protocol');
    }
  }

  return raw;
}

export function parseFieldValue(key: string, field: EnvField, value: unknown): unknown {
  switch (field.type) {
    case 'string':
      return parseStringValue(key, value, field);
    case 'number':
      return parseNumberValue(key, value, field);
    case 'boolean':
      return parseBooleanValue(key, value, field);
    case 'enum':
      return parseEnumValue(key, value, field);
    case 'url':
      return parseUrlValue(key, value, field);
    default:
      return value;
  }
}
