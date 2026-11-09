import type { BooleanField, EnvField, NumberField, StringField, UrlField } from './types';

export function parseStringValue(key: string, value: unknown, field: StringField): string {
  const text = typeof value === 'string' ? value : String(value ?? '');

  if (field.minLength !== undefined && text.length < field.minLength) {
    throw new Error(`${key} must be at least ${field.minLength} characters long (got ${JSON.stringify(text)})`);
  }

  if (field.maxLength !== undefined && text.length > field.maxLength) {
    throw new Error(`${key} must be at most ${field.maxLength} characters long (got ${JSON.stringify(text)})`);
  }

  if (field.pattern !== undefined) {
    const pattern = typeof field.pattern === 'string' ? new RegExp(field.pattern) : field.pattern;
    if (!pattern.test(text)) {
      throw new Error(`${key} does not match the required pattern`);
    }
  }

  return text;
}

export function parseNumberValue(key: string, value: unknown, field: NumberField): number {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '');

  if (raw === '' || raw === 'null' || raw === 'undefined') {
    throw new Error(`${key} must be a number (got ${JSON.stringify(value)})`);
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a number (got ${JSON.stringify(value)})`);
  }

  if (field.integer && !Number.isInteger(parsed)) {
    throw new Error(`${key} must be an integer (got ${JSON.stringify(value)})`);
  }

  if (field.min !== undefined && parsed < field.min) {
    throw new Error(`${key} must be >= ${field.min} (got ${JSON.stringify(value)})`);
  }

  if (field.max !== undefined && parsed > field.max) {
    throw new Error(`${key} must be <= ${field.max} (got ${JSON.stringify(value)})`);
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

  throw new Error(`${key} must be a boolean (got ${JSON.stringify(value)})`);
}

export function parseEnumValue<T extends readonly unknown[]>(key: string, value: unknown, field: { values: T }): T[number] {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '');
  const chosen = field.values.find((candidate) => String(candidate) === raw);

  if (chosen === undefined) {
    throw new Error(`${key} must be one of ${field.values.map(String).join(', ')} (got ${JSON.stringify(value)})`);
  }

  return chosen;
}

export function parseUrlValue(key: string, value: unknown, field: UrlField): string {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '');

  try {
    const parsed = new URL(raw);

    if (field.protocols && field.protocols.length > 0) {
      const normalized = parsed.protocol.replace(':', '');
      if (!field.protocols.map((protocol) => protocol.toLowerCase()).includes(normalized.toLowerCase())) {
        throw new Error(`${key} has an unsupported protocol`);
      }
    }

    return raw;
  } catch {
    throw new Error(`${key} must be a valid URL (got ${JSON.stringify(value)})`);
  }
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
