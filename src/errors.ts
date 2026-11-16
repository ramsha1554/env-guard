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

/** Reports one or more environment validation failures with stable issue codes. */
export class EnvValidationError extends Error {
  readonly code = 'ENV_VALIDATION_ERROR' as const;
  readonly issues: readonly EnvValidationIssue[];

  constructor(issues: readonly EnvValidationIssue[]) {
    if (issues.length === 0) {
      throw new TypeError('EnvValidationError requires at least one issue');
    }

    const snapshot = issues.map((issue) => Object.freeze({ ...issue }));
    const details = snapshot.map((issue) => `${issue.key}: ${issue.message}`);

    super(
      snapshot.length === 1
        ? details[0]
        : `Environment validation failed with ${snapshot.length} issues:\n${details.join('\n')}`
    );

    this.name = 'EnvValidationError';
    this.issues = Object.freeze(snapshot);
  }
}
