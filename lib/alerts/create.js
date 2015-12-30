import assert from 'assert';
import fs from 'fs';
import yaml from 'js-yaml';

import { InfluxAlert } from './influx';
import { IndexedTaskAlert } from './taskcluster_index';

export function newAlert(config, alertConfig) {
  let alerts = {
    indexedTask: IndexedTaskAlert,
    influx: InfluxAlert
  }

  assert(alerts[alertConfig.type], `Unsupported alert type provided: ${alertConfig.type}`);

  let alertObj = alerts[alertConfig.type];
  return new alertObj(config, alertConfig);
}

export function newAlertsFromConfig(config, alertsConfig) {
  let readConfig = yaml.safeLoad(fs.readFileSync(alertsConfig, 'utf8'));
  assert(Object.keys(readConfig).length, "No Alerts configured");

  return Object.keys(readConfig).map(alertName => {
    return newAlert(config, Object.assign({}, {name: alertName}, readConfig[alertName]));
  });
}

