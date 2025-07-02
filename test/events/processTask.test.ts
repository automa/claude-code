import { join } from 'node:path';

import { FastifyInstance } from 'fastify';
import { assert } from 'chai';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import { CodeFolder, WebhookEventData, WebhookEventType } from '@automa/bot';

import { server } from '../utils';

import { anthropic, automa } from '../../src/clients';
import processTask from '../../src/events/jobs/processTask';
import { queryStub, quibbleSandbox } from '../mocks';

const data = {
  task: {
    id: 1,
    token: 'abcdef',
    title: 'Fix a minor bug',
    items: [],
  },
  repo: {
    id: 1,
    name: 'monorepo',
    is_private: true,
  },
  org: {
    id: 1,
    name: 'automa',
    provider_type: 'github',
  },
} as WebhookEventData<WebhookEventType.TaskCreated>;

const dataWithDescription = {
  ...data,
  task: {
    ...data.task,
    items: [
      {
        id: 1,
        type: 'message',
        data: {
          content: 'It does not work',
        },
        bot_id: null,
        repo_id: null,
      },
    ],
  },
} as WebhookEventData<WebhookEventType.TaskCreated>;

const codeFixture = join(__dirname, '..', 'fixtures', 'code');

const anthropicRequestData = {
  max_tokens: 2048,
  model: 'claude-sonnet-4-0',
  system:
    'Generate a github pull request title (should be short) and body (using markdown) based on the description given by the user. Make sure to not include any diffs in pull request body.',
  messages: [{ role: 'user', content: 'Task completed successfully' }],
  tools: [
    {
      name: 'create_pull_request',
      description: 'Create a pull request with a title and body',
      input_schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        additionalProperties: false,
        properties: {
          body: {
            type: 'string',
          },
          title: {
            maxLength: 72,
            type: 'string',
          },
        },
        required: ['title', 'body'],
        type: 'object',
      },
    },
  ],
  tool_choice: {
    name: 'create_pull_request',
    type: 'tool',
  },
};

suite('events/processTask', () => {
  let app: FastifyInstance, sandbox: SinonSandbox;
  let parseStub: SinonStub;
  let downloadStub: SinonStub, proposeStub: SinonStub, cleanupStub: SinonStub;

  suiteSetup(async () => {
    app = await server();
    sandbox = createSandbox();
  });

  suiteTeardown(async () => {
    await app.close();
  });

  setup(() => {
    queryStub.returns({
      async *[Symbol.asyncIterator]() {
        yield {
          type: 'result',
          subtype: 'success',
          result: 'Task completed successfully',
          total_cost_usd: 0.1,
        };
      },
    });

    parseStub = sandbox.stub(anthropic.messages, 'create').resolves({
      content: [
        // @ts-ignore
        {
          type: 'tool_use',
          input: {
            title: 'Fix a minor bug',
            body: 'This PR fixes a minor bug.',
          },
        },
      ],
    });

    downloadStub = sandbox
      .stub(automa.code, 'download')
      .resolves(new CodeFolder(codeFixture));

    proposeStub = sandbox.stub(automa.code, 'propose').resolves();

    cleanupStub = sandbox.stub(automa.code, 'cleanup').resolves();
  });

  teardown(() => {
    queryStub.resetBehavior();
    quibbleSandbox.resetHistory();
    sandbox.restore();
  });

  suite('with no task description', () => {
    setup(async () => {
      await processTask.handler?.(app, {
        baseURL: 'https://api.automa.app',
        data,
      });
    });

    test('should download code', async () => {
      assert.equal(downloadStub.callCount, 1);
      assert.deepEqual(downloadStub.firstCall.args, [
        data,
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should run claude code', async () => {
      assert.equal(queryStub.callCount, 1);
      assert.deepEqual(queryStub.firstCall.args, [
        {
          prompt: '<title>Fix a minor bug</title>',
          options: {
            cwd: codeFixture,
            permissionMode: 'bypassPermissions',
          },
        },
      ]);
    });

    test('should generate PR fields', async () => {
      assert.equal(parseStub.callCount, 1);
      assert.deepEqual(parseStub.firstCall.args, [anthropicRequestData]);
    });

    test('should propose code', async () => {
      assert.equal(proposeStub.callCount, 1);
      assert.deepEqual(proposeStub.firstCall.args, [
        {
          ...data,
          proposal: {
            title: 'Fix a minor bug',
            body: 'This PR fixes a minor bug.',
          },
        },
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should cleanup code', async () => {
      assert.equal(cleanupStub.callCount, 1);
      assert.deepEqual(cleanupStub.firstCall.args, [data]);
    });
  });

  suite('with task description', () => {
    setup(async () => {
      await processTask.handler?.(app, {
        baseURL: 'https://api.automa.app',
        data: dataWithDescription,
      });
    });

    test('should download code', async () => {
      assert.equal(downloadStub.callCount, 1);
      assert.deepEqual(downloadStub.firstCall.args, [
        dataWithDescription,
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should run claude code', async () => {
      assert.equal(queryStub.callCount, 1);
      assert.deepEqual(queryStub.firstCall.args, [
        {
          prompt:
            '<title>Fix a minor bug</title><description>It does not work</description>',
          options: {
            cwd: codeFixture,
            permissionMode: 'bypassPermissions',
          },
        },
      ]);
    });

    test('should generate PR fields', async () => {
      assert.equal(parseStub.callCount, 1);
      assert.deepEqual(parseStub.firstCall.args, [anthropicRequestData]);
    });

    test('should propose code', async () => {
      assert.equal(proposeStub.callCount, 1);
      assert.deepEqual(proposeStub.firstCall.args, [
        {
          ...dataWithDescription,
          proposal: {
            title: 'Fix a minor bug',
            body: 'This PR fixes a minor bug.',
          },
        },
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should cleanup code', async () => {
      assert.equal(cleanupStub.callCount, 1);
      assert.deepEqual(cleanupStub.firstCall.args, [dataWithDescription]);
    });
  });

  suite('with download error', () => {
    let error: any;

    setup(async () => {
      downloadStub.rejects(new Error('Download error'));

      try {
        await processTask.handler?.(app, {
          baseURL: 'https://api.automa.app',
          data,
        });
      } catch (err) {
        error = err;
      }
    });

    test('should throw error', () => {
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Download error');
    });

    test('should download code', async () => {
      assert.equal(downloadStub.callCount, 1);
      assert.deepEqual(downloadStub.firstCall.args, [
        data,
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should not run claude code', () => {
      assert.equal(queryStub.callCount, 0);
    });

    test('should not generate PR fields', async () => {
      assert.equal(parseStub.callCount, 0);
    });

    test('should not propose code', async () => {
      assert.equal(proposeStub.callCount, 0);
    });

    test('should not cleanup code', async () => {
      assert.equal(cleanupStub.callCount, 0);
    });
  });

  suite('with claude code error', () => {
    let error: any;

    setup(async () => {
      queryStub.returns({
        async *[Symbol.asyncIterator]() {
          throw new Error('Claude Code error');
        },
      });

      try {
        await processTask.handler?.(app, {
          baseURL: 'https://api.automa.app',
          data,
        });
      } catch (err) {
        error = err;
      }
    });

    test('should throw error', () => {
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Claude Code error');
    });

    test('should download code', async () => {
      assert.equal(downloadStub.callCount, 1);
      assert.deepEqual(downloadStub.firstCall.args, [
        data,
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should run claude code', async () => {
      assert.equal(queryStub.callCount, 1);
      assert.deepEqual(queryStub.firstCall.args, [
        {
          prompt: '<title>Fix a minor bug</title>',
          options: {
            cwd: codeFixture,
            permissionMode: 'bypassPermissions',
          },
        },
      ]);
    });

    test('should not generate PR fields', async () => {
      assert.equal(parseStub.callCount, 0);
    });

    test('should not propose code', async () => {
      assert.equal(proposeStub.callCount, 0);
    });

    test('should cleanup code', async () => {
      assert.equal(cleanupStub.callCount, 1);
      assert.deepEqual(cleanupStub.firstCall.args, [data]);
    });
  });

  suite('with claude code non-completed output', () => {
    let error: any;

    setup(async () => {
      queryStub.returns({
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'result',
            subtype: 'error',
            result: 'Task not completed',
            total_cost_usd: 0.05,
          };
        },
      });

      try {
        await processTask.handler?.(app, {
          baseURL: 'https://api.automa.app',
          data,
        });
      } catch (err) {
        error = err;
      }
    });

    test('should throw error', () => {
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Claude Code did not complete the task');
    });

    test('should download code', async () => {
      assert.equal(downloadStub.callCount, 1);
      assert.deepEqual(downloadStub.firstCall.args, [
        data,
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should run claude code', async () => {
      assert.equal(queryStub.callCount, 1);
      assert.deepEqual(queryStub.firstCall.args, [
        {
          prompt: '<title>Fix a minor bug</title>',
          options: {
            cwd: codeFixture,
            permissionMode: 'bypassPermissions',
          },
        },
      ]);
    });

    test('should not generate PR fields', async () => {
      assert.equal(parseStub.callCount, 0);
    });

    test('should not propose code', async () => {
      assert.equal(proposeStub.callCount, 0);
    });

    test('should cleanup code', async () => {
      assert.equal(cleanupStub.callCount, 1);
      assert.deepEqual(cleanupStub.firstCall.args, [data]);
    });
  });

  suite('with propose error', () => {
    let error: any;

    setup(async () => {
      proposeStub.rejects(new Error('Propose error'));

      try {
        await processTask.handler?.(app, {
          baseURL: 'https://api.automa.app',
          data,
        });
      } catch (err) {
        error = err;
      }
    });

    test('should throw error', () => {
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Propose error');
    });

    test('should download code', async () => {
      assert.equal(downloadStub.callCount, 1);
      assert.deepEqual(downloadStub.firstCall.args, [
        data,
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should run claude code', async () => {
      assert.equal(queryStub.callCount, 1);
      assert.deepEqual(queryStub.firstCall.args, [
        {
          prompt: '<title>Fix a minor bug</title>',
          options: {
            cwd: codeFixture,
            permissionMode: 'bypassPermissions',
          },
        },
      ]);
    });

    test('should generate PR fields', async () => {
      assert.equal(parseStub.callCount, 1);
      assert.deepEqual(parseStub.firstCall.args, [anthropicRequestData]);
    });

    test('should propose code', async () => {
      assert.equal(proposeStub.callCount, 1);
      assert.deepEqual(proposeStub.firstCall.args, [
        {
          ...data,
          proposal: {
            title: 'Fix a minor bug',
            body: 'This PR fixes a minor bug.',
          },
        },
        {
          baseURL: 'https://api.automa.app',
        },
      ]);
    });

    test('should cleanup code', async () => {
      assert.equal(cleanupStub.callCount, 1);
      assert.deepEqual(cleanupStub.firstCall.args, [data]);
    });
  });
});
