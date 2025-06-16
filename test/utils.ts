// Import the modules to use their typings
import '../src/plugins/error';
// Import mocks to ensure they are loaded before the server starts
import './mocks';

import { FastifyInstance, InjectOptions } from 'fastify';

export { server } from '../src';

export const call = (
  app: FastifyInstance,
  uri: string,
  options?: Omit<InjectOptions, 'url' | 'path' | 'server' | 'Request'>,
) =>
  app.inject({
    url: uri,
    ...options,
  });
