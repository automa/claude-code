import { join } from 'node:path';

// Always setup the environment first
import { env, isProduction, isTest, version } from './env';

import fastify from 'fastify';
import fastifyAutoload from '@fastify/autoload';
import fastifyHelmet from '@fastify/helmet';
import fastifySensible from '@fastify/sensible';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import httpErrors from 'http-errors';

import eventsPlugin from './events';

export const server = async () => {
  const app = fastify({
    logger: !isTest
      ? {
          transport: {
            targets: [],
          },
        }
      : false,
    disableRequestLogging: true,
    forceCloseConnections: true,
    pluginTimeout: 15_000,
  });

  await app.register(fastifyAutoload, {
    dir: join(__dirname, 'plugins'),
  });

  await app.register(fastifySensible);
  await app.register(fastifyHelmet);

  await app.register(eventsPlugin);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof httpErrors.HttpError) {
      return error;
    }

    if (error.code === 'FST_ERR_VALIDATION') {
      return reply.unprocessableEntity(error.message);
    } else if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.payloadTooLarge(error.message);
    } else if (error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      return reply.unsupportedMediaType(error.message);
    } else if (error.statusCode === 400) {
      return reply.badRequest(error.message);
    }

    app.error.capture(error, { method: request.method, url: request.url });

    return reply.internalServerError();
  });

  if (!isProduction) {
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'Claude Code Bot',
          description: 'Claude Code Bot documentation',
          version,
        },
      },
    });
    await app.register(fastifySwaggerUi, {});
  }

  await app.register(fastifyAutoload, {
    dir: join(__dirname, 'routes'),
    routeParams: true,
    autoHooks: true,
    cascadeHooks: true,
  });

  return app;
};

async function start() {
  try {
    const app = await server();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Only start the server if this file is the entrypoint
if (require.main === module) {
  start();
}
