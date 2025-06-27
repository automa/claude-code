import { dirname, join } from 'node:path';

import envSchema from 'nested-env-schema';
import { z } from 'zod/v4';

import './telemetry';

// @ts-ignore
import pkg from '../package.json';

export const environment = process.env.NODE_ENV || 'development';

export const isTest = environment === 'test';
export const isProduction = !isTest && environment !== 'development';

export const product = 'bots';
export const service = 'claude-code';
export const version = pkg.version;

const schema = z.object({
  ANTHROPIC: z.object({
    API_KEY: z.string().optional(),
    MODEL: z.string().default('claude-sonnet-4-0'),
  }),
  AUTOMA: z.object({
    WEBHOOK_SECRET: z.string().default('atma_whsec_claude-code'),
  }),
  AWS: z.object({
    REGION: z.string().optional(),
    ACCESS_KEY_ID: z.string().optional(),
    SECRET_ACCESS_KEY: z.string().optional(),
  }),
  CLAUDE_CODE_USE_BEDROCK: z.string().optional(),
  PORT: z.number().default(5008),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SENTRY_DSN: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

export const env = envSchema<Schema>({
  schema: z.toJSONSchema(schema),
  dotenv: {
    path: join(dirname(__dirname), isTest ? '.env.test' : '.env'),
  },
});
