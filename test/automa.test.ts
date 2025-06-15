import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { assert } from 'chai';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import { generateWebhookSignature } from '@automa/bot';

import { env } from '../src/env';

import { call, server } from './utils';

const payload = {
  id: 'whmsg_1',
  timestamp: '2025-05-30T09:30:06.261Z',
};

const callWithFixture = async (app: FastifyInstance, fileName: string) => {
  const body = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', `${fileName}.json`), 'utf8'),
  );

  const signature = generateWebhookSignature(env.AUTOMA.WEBHOOK_SECRET, body);

  return call(app, '/hooks/automa', {
    method: 'POST',
    headers: {
      'webhook-signature': signature,
      'x-automa-server-host': 'https://api.automa.app',
    },
    payload: body,
  });
};

suite('automa hook', () => {
  let app: FastifyInstance, response: LightMyRequestResponse, timestamp: number;
  let sandbox: SinonSandbox, publishStub: SinonStub;

  suiteSetup(async () => {
    app = await server();
    sandbox = createSandbox();
    timestamp = Date.now();
  });

  suiteTeardown(async () => {
    await app.close();
  });

  setup(() => {
    sandbox.stub(Date, 'now').returns(timestamp);

    publishStub = sandbox.stub(app.events.processTask, 'publish').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('with no signature should return 401', async () => {
    const response = await call(app, '/hooks/automa', {
      method: 'POST',
      headers: {},
      payload: {},
    });

    assert.equal(response.statusCode, 401);
  });

  test('with invalid signature should return 401', async () => {
    const response = await call(app, '/hooks/automa', {
      method: 'POST',
      headers: {
        'webhook-signature': 'invalid',
      },
      payload,
    });

    assert.equal(response.statusCode, 401);
  });

  suite('with valid signature', () => {
    setup(async () => {
      response = await callWithFixture(app, 'task');
    });

    test('should return 200', async () => {
      assert.equal(response.statusCode, 200);
    });

    test('should have empty body', async () => {
      assert.isEmpty(response.body);
    });

    test('should publish processTask event', async () => {
      assert.equal(publishStub.callCount, 1);
      assert.deepEqual(publishStub.firstCall.args, [
        `1-${timestamp}`,
        {
          data: {
            task: {
              id: 1,
              token: 'abcdef',
              title: 'Fix a minor bug',
            },
          },
          baseURL: 'https://api.automa.app',
        },
      ]);
    });
  });
});
