import { createApp } from './app.js';
import { startLocalCodexDelegationServer } from './local-codex-delegation.js';

const desiredPort = Number(process.env.PORT || 4000);
const allowDynamicFallback = !process.env.PORT;
const shouldAutoStartLocalCodex = String(process.env.AI_PM_DISABLE_LOCAL_CODEX || '').toLowerCase() !== '1';

async function bootstrap() {
  let localCodex = null;

  if (shouldAutoStartLocalCodex && !process.env.AI_PM_CODEX_PERSONAL_URL) {
    try {
      localCodex = await startLocalCodexDelegationServer();
      process.env.AI_PM_CODEX_PERSONAL_URL = localCodex.url;
      console.log(`Local Codex delegation server running on ${localCodex.url}`);
    } catch (error) {
      console.warn('Failed to start local Codex delegation server', error);
    }
  }

  try {
    const server = await createApp();

    const shutdown = async (error) => {
      if (error) {
        console.error('Shutting down due to error', error);
      }
      try {
        await new Promise((resolve) => {
          server.close(() => resolve());
        });
      } catch (closeError) {
        console.error('Failed to close HTTP server cleanly', closeError);
      }
      if (localCodex && typeof localCodex.close === 'function') {
        try {
          await localCodex.close();
        } catch (closeError) {
          console.error('Failed to close local Codex delegation server', closeError);
        }
      }
      process.exit(error ? 1 : 0);
    };

    const listen = (portToUse, allowFallback) => {
      const handleListening = () => {
        server.off('error', handleError);
        const address = server.address();
        const resolvedPort =
          typeof address === 'object' && address !== null ? address.port : portToUse;
        console.log(`Server running on http://localhost:${resolvedPort}`);
      };

      const handleError = (error) => {
        server.off('listening', handleListening);
        if (error && error.code === 'EADDRINUSE' && allowFallback) {
          console.warn(
            `Port ${portToUse} is already in use. Trying a random available port instead.`,
          );
          setImmediate(() => listen(0, false));
          return;
        }

        console.error('Failed to start server', error);
        shutdown(error);
      };

      server.once('listening', handleListening);
      server.once('error', handleError);
      server.listen(portToUse);
    };

    const handleSignal = (signal) => {
      console.log(`Received ${signal}. Shutting down...`);
      shutdown();
    };

    process.once('SIGINT', handleSignal);
    process.once('SIGTERM', handleSignal);

    listen(desiredPort, allowDynamicFallback);
  } catch (error) {
    if (localCodex && typeof localCodex.close === 'function') {
      try {
        await localCodex.close();
      } catch (closeError) {
        console.error('Failed to close local Codex delegation server', closeError);
      }
    }
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();
