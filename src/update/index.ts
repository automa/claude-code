import { FastifyInstance } from 'fastify';
import { query } from '@anthropic-ai/claude-code';
import { CodeFolder, WebhookEventData, WebhookEventType } from '@automa/bot';

export const update = async (
  app: FastifyInstance,
  folder: CodeFolder,
  data: WebhookEventData<WebhookEventType.TaskCreated>,
) => {
  const descriptions = data.task.items
    .filter(({ type }) => type === 'message')
    .map(({ data }) => `<description>${(data as any).content}</description>`);

  const originData =
    data.task.items.find(({ type }) => type === 'origin')?.data ?? {};

  const comments = ((originData as any).issueComments ?? []).map(
    ({ body, userName }: { body: string; userName: string }) =>
      `<comment author="${userName}">${body}</comment>`,
  );

  const message = [
    `<title>${data.task.title}</title>`,
    ...descriptions,
    ...comments,
  ].join('\n');

  const run = query({
    prompt: message,
    options: {
      cwd: folder.path,
      permissionMode: 'bypassPermissions',
    },
  });

  let completedMsg;

  for await (const message of run) {
    if (message.type === 'result') {
      completedMsg = message;
    }
  }

  if (completedMsg?.subtype !== 'success') {
    app.log.error(
      {
        result: completedMsg,
      },
      'Claude Code did not complete the task',
    );

    throw new Error('Claude Code did not complete the task');
  }

  // Make sure all created files are tracked
  await folder.addAll();

  return {
    message: completedMsg.result,
    cost: completedMsg.total_cost_usd,
  };
};
