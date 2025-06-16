import { env } from './env';

import Anthropic from '@anthropic-ai/sdk';
import Automa from '@automa/bot';

export const automa = new Automa();

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC.API_KEY,
});
