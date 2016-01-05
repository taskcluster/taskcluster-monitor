import assert from 'assert';
import Papertrail from 'papertrail';

import { Alert } from './alert';

export class PapertrailSearchAlert extends Alert {
  _setup(config, alertConfig) {
    assert(config.papertrail && config.papertrail.apiToken,
           'Papertrail API token must be provided');
    assert(config.papertrail.baseUrl,
           'Papertrail host must be provided');
    assert(alertConfig.query,
           "Must supply a search query.  Open ended queries not supported");


    this.client = new Papertrail({
      baseUrl: config.papertrail.baseUrl,
      token: config.papertrail.apiToken
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
   * @param {Array} results - List of results returned by the papertrail serach 
   */
  processResults(results) {
    this.lastProcessed = new Date();
    if (!results) {
      return;
    }

    if (results.length > this.threshold) {
      console.log(
        `${this.name} - threshold: ${this.threshold} - ` +
        `Results: ${results.length}`
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

    let events = await this.runSearch(this.query);
    this.processResults(events);
    console.log(`Evaluated rule '${this.name}' in ${(Date.now() - start)/1000} seconds`);
  }

  /*
   * Query influx for specific results.
   *
   * @param {String} query - Influx query. Example 'select * from time_series'
   *
   * @return {Array} list of results from running the influx query
   */
  async runSearch(query) {
    let events;
    try {
      let minTime = Math.floor(Date.now()/1000) - (this.frequency * 1000);
      let response = await this.client.searchEvents({q: query, min_time: minTime});
      events = response.events;
    } catch (e) {
      console.log('Error making request. ', e.message);
    }

    return events;
  }
}
