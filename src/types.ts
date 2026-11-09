export type EnvSource = Record<string, string | number | boolean | undefined>;

export type PrimitiveFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'url';

export type StringField = {
  type: 'string';
  required?: boolean;
  default?: string;
  description?: string;
  secret?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
};

export type NumberField = {
  type: 'number';
  required?: boolean;
  default?: number;
  description?: string;
  secret?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
};

export type BooleanField = {
  type: 'boolean';
  required?: boolean;
  default?: boolean;
  description?: string;
  secret?: boolean;
};

export type EnumField<T extends readonly unknown[] = readonly string[]> = {
  type: 'enum';
  values: T;
  required?: boolean;
  default?: T[number];
  description?: string;
  secret?: boolean;
};

export type UrlField = {
  type: 'url';
  required?: boolean;
  default?: string;
  description?: string;
  secret?: boolean;
  protocols?: string[];
};

export type EnvField = StringField | NumberField | BooleanField | EnumField | UrlField;
export type EnvGuardSchema = Record<string, EnvField>;

export type FieldValue<T extends EnvField> = T extends StringField
  ? string
  : T extends NumberField
    ? number
    : T extends BooleanField
      ? boolean
      : T extends EnumField<infer U>
        ? U extends readonly (infer V)[]
          ? V
          : never
        : T extends UrlField
          ? string
          : never;

export type InferEnv<T extends EnvGuardSchema> = {
  [K in keyof T]: T[K] extends { default: unknown }
    ? FieldValue<T[K]>
    : T[K] extends { required: true }
      ? FieldValue<T[K]>
      : FieldValue<T[K]> | undefined;
};
