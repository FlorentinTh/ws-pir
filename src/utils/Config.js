import path from 'path';
import joi from 'joi';
import * as dotenv from 'dotenv';

import ProgramHelper from '../helpers/ProgramHelper.js';

dotenv.config({ path: path.join(ProgramHelper.getRootPath(), '.env') });

const defaultValidationSchema = joi
  .object({
    WS_PORT: joi.number().required().default(5236),
    MQTT_HOST: joi.string().trim().required(),
    MQTT_PORT: joi.number().required().default(1883),
    MQTT_USERNAME: joi.string().trim().required(),
    MQTT_PASSWORD: joi.string().trim().required()
  })
  .unknown()
  .required();

export class Config {
  static getConfig() {
    const { error, value: env } = defaultValidationSchema.validate(process.env);

    if (error) {
      console.error(`Error occurs while trying to validate config. Reason: ${error}`);
      process.exit(1);
    }

    return {
      ws: {
        port: env.WS_PORT
      },
      mqtt: {
        host: env.MQTT_HOST,
        port: env.MQTT_PORT,
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD
      }
    };
  }
}
