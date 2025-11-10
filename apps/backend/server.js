import { createApp } from './app.js';

// Compute 환경에서는 3000 리슨 권장
const desiredPort = Number(process.env.PORT || 3000);
// 서버리스(프록시) 뒤에 붙으므로 임의 포트 폴백은 금지
const allowDynamicFallback = false;

createApp()
  .then((server) => {
    const listen = (portToUse, allowFallback) => {
      const handleListening = () => {
        server.off('error', handleError);
        const address = server.address();
        const resolvedPort =
          typeof address === 'object' && address !== null ? address.port : portToUse;
        console.log(`Server running on http://0.0.0.0:${resolvedPort}`);
      };

      const handleError = (error) => {
        server.off('listening', handleListening);
        if (error && error.code === 'EADDRINUSE' && allowFallback) {
          console.warn(`Port ${portToUse} in use. Fallback disabled.`);
          process.exit(1);
        }
        console.error('Failed to start server', error);
        process.exit(1);
      };

      server.once('listening', handleListening);
      server.once('error', handleError);
      // 외부에서 접근 가능하도록 0.0.0.0 바인딩
      server.listen(portToUse, '0.0.0.0');
    };

    listen(desiredPort, allowDynamicFallback);
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });

