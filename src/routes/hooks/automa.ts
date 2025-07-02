import { FastifyInstance } from 'fastify';
import { Tool } from '@anthropic-ai/sdk/resources/messages';
import {
  verifyWebhook,
  WebhookEventData,
  WebhookEventType,
  type WebhookPayload,
} from '@automa/bot';
import { ATTR_HTTP_REQUEST_HEADER } from '@opentelemetry/semantic-conventions/incubating';
import { z } from 'zod/v4';

import { env } from '../../env';

import { anthropic, automa } from '../../clients';
import { update } from '../../update';

const PullRequest = z.object({
  title: z.string().max(72),
  body: z.string(),
});

const generatePrFields = async (description: string) => {
  const response = await anthropic.messages.create({
    max_tokens: 2048,
    model: env.ANTHROPIC.MODEL,
    system:
      'Generate a github pull request title (should be short) and body (using markdown) based on the description given by the user. Make sure to not include any diffs in pull request body.',
    messages: [{ role: 'user', content: description }],
    tools: [
      {
        name: 'create_pull_request',
        description: 'Create a pull request with a title and body',
        input_schema: z.toJSONSchema(PullRequest) as Tool.InputSchema,
      },
    ],
    tool_choice: {
      name: 'create_pull_request',
      type: 'tool',
    },
  });

  if (response.content[0]?.type !== 'tool_use') {
    throw new Error(
      `Expected tool use response when generating PR fields, got: ${JSON.stringify(
        response.content[0],
      )}`,
    );
  }

  return response.content[0].input as z.infer<typeof PullRequest>;
};

export default async function (app: FastifyInstance) {
  app.post<{
    Body: WebhookPayload;
  }>('/automa', async (request, reply) => {
    const id = request.headers['webhook-id'] as string;
    const signature = request.headers['webhook-signature'] as string;
    const timestamp = Date.now();

    // Verify request
    if (!verifyWebhook(env.AUTOMA.WEBHOOK_SECRET, signature, request.body)) {
      app.log.warn(
        {
          'http.request.id': request.id,
          [ATTR_HTTP_REQUEST_HEADER('webhook-id')]: id,
          [ATTR_HTTP_REQUEST_HEADER('webhook-signature')]: signature,
        },
        'Invalid signature',
      );

      return reply.unauthorized();
    }

    app.log.info(
      {
        'http.request.id': request.id,
        [ATTR_HTTP_REQUEST_HEADER('webhook-id')]: id,
        [ATTR_HTTP_REQUEST_HEADER('webhook-signature')]: signature,
      },
      'Webhook verified',
    );

    const baseURL = request.headers['x-automa-server-host'] as string;

    if (request.body.type === WebhookEventType.TaskCreated) {
      await app.events.processTask.publish(
        `${request.body.data.task.id}-${timestamp}`,
        {
          baseURL,
          data: request.body.data,
        },
      );
    }

    return reply.send();
  });
}

export const runUpdate = async (
  app: FastifyInstance,
  baseURL: string,
  data: WebhookEventData<WebhookEventType.TaskCreated>,
) => {
  // Download code
  const folder = await automa.code.download(data, { baseURL });

  try {
    // Modify code
    const { message } = await update(app, folder, data);

    const prFields = await generatePrFields(message);

    // Propose code
    await automa.code.propose(
      {
        ...data,
        proposal: {
          title: prFields?.title,
          body: prFields?.body,
        },
      },
      {
        baseURL,
      },
    );
  } finally {
    // Clean up
    automa.code.cleanup(data);
  }
};
