import WebSocketPIR from '../src/WebSocketPIR.js';

(async () => {
  const webSocketPIR = new WebSocketPIR();
  await webSocketPIR.run();
})();
