// @ts-ignore
import quibble from 'quibble';
import { createSandbox } from 'sinon';

export const quibbleSandbox = createSandbox();

export const queryStub = quibbleSandbox.stub();

quibble('@anthropic-ai/claude-code', { query: queryStub });
