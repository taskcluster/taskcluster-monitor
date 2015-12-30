import config from 'typed-env-config';
import fs from 'fs';
import path from 'path';
import loader from 'taskcluster-lib-loader';
import { AlertManager } from '../lib/alert_manager';
import { newAlertsFromConfig } from '../lib/alerts/create';
import { SNS } from '../lib/notifications/sns';


const ALERTS_CONFIG_PATH = 'config/alerts/';

var load = loader({
  cfg: {
    requires: ['profile'],
    setup: ({profile}) => config({profile})
  },

  sns: {
    requires: ['cfg'],
    setup: ({cfg}) => {
      let sns = new SNS(cfg.aws.sns);
      return sns;
    }
  },

  server: {
    requires: ['cfg', 'sns'],
    setup: ({cfg, sns}) => {
      let config = cfg;
      let manager = new AlertManager();

      // Alerts can be separated into configuration files that make
      // sense for the type of alert and what they are evaluating.
      let alertConfigs = fs.readdirSync(ALERTS_CONFIG_PATH);
      alertConfigs.forEach((alertConfig) => {
        let configPath = path.join(ALERTS_CONFIG_PATH, alertConfig);
        let alerts = newAlertsFromConfig(cfg, configPath);
        console.log(`Loaded ${alerts.length} alert(s) from '${configPath}'`);
        alerts.forEach(manager.registerAlert.bind(manager));
      });

      manager.notificationHandlers = {
        'sns': sns
      };
      manager.run();
      return manager;
    }
  }
}, ['profile', 'process']);

// If this file is executed launch component from first argument
if (!module.parent) {
  load(process.argv[2], {
    process: process.argv[2],
    profile: process.env.NODE_ENV,
  }).catch(err => {
    console.log(err.stack);
    process.exit(1);
  });
}

// Export load for tests
module.exports = load;
