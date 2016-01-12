import assert from 'assert'
import denodeify from 'denodeify';
import influx from 'influx';

import { Alert } from './alert';

export class InfluxAlert extends Alert {
  _setup(config, alertConfig) {
    assert(config.influx.host, "Influx host must be provided");
    assert(config.influx.username, "Influx username must be provided");
    assert(config.influx.password, "Influx password must be provided");
    assert(alertConfig.database, "Influx database must be provided");

    this.client = influx({
      host: config.influx.host,
      username: config.influx.username,
      password: config.influx.password,
      database: alertConfig.database
    });
  }

  get query() {
    return this._alertConfig.query;
  }

  /*
   * Given a list of results, determine if the alert should be activated or
   * deactivated based on the number of results and the threshold the alert
   * is configured for.
   *
   * @param {Array} results - List of results returned by the influx query
   */
  processResults(results) {
    this.lastProcessed = new Date();
    if (!results || !results.length) {
      if (!this.min_threshold) {
        return;
      } else {
        // An empty array is returned when no results have been recorded in that time
        // frame.  Treat this has the value 0 when comparing minimum thresholds
        // Should be ok for 99% of the cases we need it.
        results = [{points:[[0,0]]}];
      }
    }

    let value = results[0].points[0][1];

    let shouldActivate = false;

    if (this.min_threshold) {
      if (value < this.min_threshold) {
        shouldActivate = true;
      }
    } else if (value > this.threshold) {
      shouldActivate = true;
    }

    if (shouldActivate) {
      console.log(
        `${this.name} - ${this.min_threshold ? 'minimum ' : ''}threshold: ` +
        `${this.min_threshold || this.threshold} - Results: ${value}}`
      );
      this.activateAlert();
    } else {
      this.deactivateAlert();
    }
  }

  /*
   * Evaluates the rule and processes the results. This method is called
   * on the scheduled specified for the alert.
   */
  async run() {
    let start = Date.now();
    console.log(`Evaluating rule '${this.name}`);

    let results = await this.runQuery(this.query);
    this.processResults(results);
    console.log(`Evaluated rule '${this.name}' in ${(Date.now() - start)/1000} seconds`);
  }

  /*
   * Query influx for specific results.
   *
   * @param {String} query - Influx query. Example 'select * from time_series'
   *
   * @return {Array} list of results from running the influx query
   */
  async runQuery(query) {
    let influxQuery = denodeify(this.client.query.bind(this.client));
    let response;

    try {
      response = await influxQuery(query);
    } catch (e) {
      console.log('Error making request', e.message);
      response = undefined;
    }

    return response;
  }
}
