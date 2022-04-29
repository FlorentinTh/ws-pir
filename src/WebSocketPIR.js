import { WebSocketServer } from 'ws';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import mqtt from 'mqtt';

import { Config } from './utils/Config.js';

dayjs.extend(utc);

class WebSocketPIR {
  #config = Config.getConfig();

  #topics = [
    'fshk/config/devices_to_watch',
    'fshk/pir/rpizero-pir1/state',
    'fshk/pir/rpizero-pir1/scan',
    'fshk/pir/rpizero-pir1/motion',
    'fshk/pir/rpizero-pir2/state',
    'fshk/pir/rpizero-pir2/scan',
    'fshk/pir/rpizero-pir2/motion',
    'fshk/pir/rpizero-pir3/state',
    'fshk/pir/rpizero-pir3/scan',
    'fshk/pir/rpizero-pir3/motion'
  ];

  #locations = {
    'rpizero-pir1': 'Bathroom',
    'rpizero-pir2': 'Diningroom',
    'rpizero-pir3': 'Livingroom'
  };

  #mqttConnectAndSubscribe(reconnection = false) {
    const client = mqtt.connect(
      `mqtt://${this.#config.mqtt.host}:${this.#config.mqtt.port}`,
      {
        username: this.#config.mqtt.username,
        password: this.#config.mqtt.password
      }
    );

    client.on('connect', () => {
      const msg = reconnection ? `\tMQTT client reconnected` : `MQTT client connected`;
      console.log(msg);
    });

    client.on('error', error => {
      const msg = reconnection ? `reconnect` : `connect`;
      console.error(
        `Error occurs while trying to ${msg} mqtt broker. Reason: ${error.message}`
      );
      process.exit(1);
    });

    for (const topic of this.#topics) {
      client.subscribe(topic, error => {
        if (error) {
          console.error(
            `Error occurs while subscribing to topic: "${topic}". Reason: ${error.message}`
          );
          process.exit(1);
        }

        console.log(`\tsubscribed to topic: "${topic}"`);
      });
    }

    return client;
  }

  #mqttDisconnect(client) {
    client.end();
    console.log(`MQTT client disconnected`);
  }

  async run() {
    let webSocketServer;

    let wristbands;
    const offlinePIR = [];

    try {
      webSocketServer = new WebSocketServer({
        port: this.#config.ws.port
      });
    } catch (error) {
      console.error(`Fail to create WebSocket server. Reason: ${error.message}`);
      process.exit(1);
    }

    console.log(`WebSocket server created`);

    let mqttClient = this.#mqttConnectAndSubscribe(false);

    webSocketServer.on('connection', async (webSocket, request) => {
      if (!mqttClient.connected) {
        mqttClient = this.#mqttConnectAndSubscribe(true);

        if (offlinePIR.length > 0) {
          offlinePIR.splice(0, offlinePIR.length);
        }
      }

      console.log(
        `[${dayjs().format()}] WebSocket client connected (${
          request.socket.remoteAddress
        })`
      );

      let PIRCount = 0;

      const leScans = {
        'rpizero-pir1': [],
        'rpizero-pir2': [],
        'rpizero-pir3': []
      };

      mqttClient.on('message', (topic, message) => {
        topic = topic.toString().trim();

        let line;

        if (topic === 'fshk/config/devices_to_watch') {
          if (wristbands === undefined) {
            wristbands = JSON.parse(message.toString());
          }
        } else if (topic.includes('state')) {
          PIRCount++;

          if (!(message.toString().trim() === 'online')) {
            offlinePIR.push(topic.split('/')[2]);
          }

          if (PIRCount === 3) {
            const totalOfflinePIR = offlinePIR.length;

            if (totalOfflinePIR > 0) {
              const msg = totalOfflinePIR > 1 ? `PIRs are offline` : `PIR is offline`;

              webSocket.send(
                JSON.stringify({
                  error: `${totalOfflinePIR} ${msg} (${offlinePIR.join(', ')})`
                })
              );

              this.#mqttDisconnect(mqttClient);
            }
          }
        } else {
          const PIR = topic.split('/')[2];

          if (topic.includes('scan')) {
            if (leScans[PIR].length > 0) {
              leScans[PIR].splice(0, leScans[PIR].length);
            }

            for (let i = 0; i < wristbands.length; ++i) {
              const wristband = wristbands[i];
              const RSSIValues = JSON.parse(message.toString().trim()).Rssi;

              leScans[PIR].push({
                wristband,
                rssi: RSSIValues[i]
              });
            }
          }

          line = {
            timestamp: dayjs().format(),
            PIR,
            location: this.#locations[PIR],
            data: {
              motion_detected: topic.includes('motion')
                ? JSON.parse(message.toString().trim()).Motion
                : false,
              le_scan: leScans[PIR]
            }
          };
        }

        if (!(line === undefined) && !(offlinePIR.length > 0)) {
          webSocket.send(JSON.stringify(line));
        }
      });
    });
  }
}

export default WebSocketPIR;
