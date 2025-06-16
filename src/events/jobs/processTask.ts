import { WebhookPayload } from '@automa/bot';

import { JobDefinition } from '../types';

import { runUpdate } from '../../routes/hooks/automa';

const processTask: JobDefinition<{
  baseURL: string;
  data: WebhookPayload['data'];
}> = {
  handler: (app, { baseURL, data }) => {
    return runUpdate(app, baseURL, data);
  },
};

export default processTask;
