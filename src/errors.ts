/** Stable codes identifying individual environment validation failures. */
export type EnvValidationIssueCode =
  | 'ENV_REQUIRED'
  | 'ENV_STRING_TOO_SHORT'
  | 'ENV_STRING_TOO_LONG'
  | 'ENV_STRING_PATTERN'
  | 'ENV_INVALID_NUMBER'
  | 'ENV_NUMBER_NOT_INTEGER'
  | 'ENV_NUMBER_TOO_SMALL'
  | 'ENV_NUMBER_TOO_LARGE'
  | 'ENV_INVALID_BOOLEAN'
  | 'ENV_INVALID_ENUM'
  | 'ENV_INVALID_URL'
  | 'ENV_UNSUPPORTED_URL_PROTOCOL';

/** A single environment variable validation failure. */
export type EnvValidationIssue = {
  readonly key: string;
  readonly code: EnvValidationIssueCode;
  readonly message: string;
};

/** Issue codes retained for compatibility with the earlier EnvGuardError API. */
export type EnvGuardIssueCode =
  | 'MISSING'
  | 'INVALID_TYPE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'PATTERN_MISMATCH'
  | 'OUT_OF_RANGE'
  | 'NOT_INTEGER'
  | 'NOT_IN_ENUM'
  | 'INVALID_URL'
  | EnvValidationIssueCode;

/** A validation issue exposed by EnvGuardError. */
export type EnvGuardIssue = {
  readonly key: string;
  readonly code: EnvGuardIssueCode;
  readonly message: string;
  readonly received?: unknown;
};

function formatErrorMessage(issues: readonly EnvGuardIssue[]): string {
  const details = issues.map((issue) => `  x ${issue.key}: ${issue.message}`);
  return `env-guard: ${issues.length} problem${issues.length === 1 ? '' : 's'} found\n${details.join('\n')}`;
}

/** Base validation error retained for compatibility with earlier releases. */
export class EnvGuardError extends Error {
  readonly code: string = 'ENV_GUARD_ERROR';
  readonly issues: readonly EnvGuardIssue[];

  constructor(issues: readonly EnvGuardIssue[]) {
    if (issues.length === 0) {
      throw new TypeError('EnvGuardError requires at least one issue');
    }

    super(formatErrorMessage(issues));
    this.name = 'EnvGuardError';
    this.issues = Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
  }
}

/** Reports environment validation failures with stable issue codes. */
export class EnvValidationError extends EnvGuardError {
  override readonly code = 'ENV_VALIDATION_ERROR' as const;
  override readonly issues: readonly EnvValidationIssue[];

  constructor(issues: readonly EnvValidationIssue[]) {
    super(issues);
    this.name = 'EnvValidationError';
    this.issues = Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
  }
}
