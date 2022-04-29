import path from 'path';
import joi from 'joi';
import * as dotenv from 'dotenv';

import ProgramHelper from '../helpers/ProgramHelper.js';
import TypeHelper from '../helpers/TypeHelper.js';

dotenv.config({ path: path.join(ProgramHelper.getRootPath(), '.env') });

let defaultValidationSchema;

if (process.env.NODE_ENV === 'test') {
  defaultValidationSchema = joi
    .object({
      WS_PORT: joi.number().required().default(5000),
      MQTT_HOST: joi.string().trim().required(),
      MQTT_PORT: joi.number().required().default(1883)
    })
    .unknown()
    .required();
} else {
  defaultValidationSchema = joi
    .object({
      WS_PORT: joi.number().required().default(5236),
      MQTT_HOST: joi.string().trim().required(),
      MQTT_PORT: joi.number().required().default(1883),
      MQTT_USERNAME: joi.string().trim().required(),
      MQTT_PASSWORD: joi.string().trim().required()
    })
    .unknown()
    .required();
}

export class Config {
  static getConfig() {
    if (process.env.NODE_ENV === 'test') {
      if (TypeHelper.isUndefinedOrNull(process.env.WS_PORT)) {
        console.error(`WS_PORT environment variable is not set properly`);
        process.exit(1);
      }

      if (TypeHelper.isUndefinedOrNull(process.env.MQTT_HOST)) {
        console.error(`MQTT_HOST environment variable is not set properly`);
        process.exit(1);
      }

      if (TypeHelper.isUndefinedOrNull(process.env.MQTT_PORT)) {
        console.error(`MQTT_PORT environment variable is not set properly`);
        process.exit(1);
      }
    }

    const { error, value: env } = defaultValidationSchema.validate(process.env);

    if (error) {
      console.error(`Error occurs while trying to validate config. Reason: ${error}`);
      process.exit(1);
    }

    const conf = {
      ws: {
        port: env.WS_PORT
      },
      mqtt: {
        host: env.MQTT_HOST,
        port: env.MQTT_PORT,
        username: null,
        password: null
      }
    };

    if (!(process.env.NODE_ENV === 'test')) {
      conf.mqtt.username = env.MQTT_USERNAME;
      conf.mqtt.password = env.MQTT_PASSWORD;
    }

    return conf;
  }
}
