import { env } from './env';

import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = env.ANTHROPIC.API_KEY
  ? new Anthropic({
      apiKey: env.ANTHROPIC.API_KEY,
    })
  : new AnthropicBedrock({
      awsRegion: env.AWS.REGION,
      awsAccessKey: env.AWS.ACCESS_KEY_ID,
      awsSecretKey: env.AWS.SECRET_ACCESS_KEY,
    });
