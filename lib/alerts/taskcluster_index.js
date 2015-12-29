import assert from 'assert'
import { Queue,Index } from 'taskcluster-client';
import urlJoin from 'url-join';

import { Alert } from './alert';

function msToHours(ms) {
  return ms/1000/3600;
}

export class IndexedTaskAlert extends Alert {
  _setup(config, alertConfig) {
    assert(alertConfig.namespace, 'Indexed namespace is required');
    assert(alertConfig.threshold, 'Task age threshold (in hours) is required');
    this.namespace = alertConfig.namespace;
    this.treshold = alertConfig.threshold;

    let options = config.taskcluster || {};
    // Specifying a different base URL allows the taskcluster-client to be used
    // against a mocked endpoint.
    this.index = new Index({
      baseUrl: options.indexUrl
    });
    this.queue = new Queue({
      baseUrl: options.queueUrl
    });
  }

  /*
   * Evaluate the alert rule and activate/deactivate the alert based on the results.
   */
  async run() {
    let start = Date.now();
    console.log(`Evaluating rule '${this.name}'`);
    let task;
    try {
      task = await this.index.findTask(this.namespace);

      let taskId = task.taskId;
      let status = await this.queue.status(taskId);
      let lastRun = status.status.runs[status.status.runs.length-1];
      let age = msToHours(Date.now() - new Date(lastRun.resolved));

      if (age > this.treshold) {
        this.activateAlert(
          `'${this.name}' triggered.  Task '${taskId}' age exceeds threshold. ` +
          `${age} hours > ${this.threshold} hours`
        );
      } else {
        this.deactivateAlert();
      }
    } catch (e) {
      if (!e.statusCode || e.statusCode != 404) {
        console.log(`[alert-operator] Error looking up task for ${this.namespace}. ${e.stack || e}`);
        return;
      }

      // Purposely activate this alert as it's a configured alert giving an error
      // that the end user should know about.
      let message = `Error looking up '${this.namespace}' namespace for rule '${this.name}'`;
      this.activateAlert(message);
    }

    console.log(`Evaluated rule '${this.name}' in ${(Date.now() - start)/1000} seconds.`);
  }
}
