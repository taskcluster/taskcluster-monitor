import assert from 'assert';
import nock from 'nock';

import { PapertrailSearchAlert } from '../lib/alerts/papertrail.js';
import { sleep } from '../lib/utils';

const BASIC_ALERT_CONFIG = {
  name: 'test',
  type: 'papertrailSearch',
  description: 'papertrail search alert test',
};


suite('Papertrail Search Alert', () => {
  test('must supply api token', () => {
    assert.throws(
      () => { new PapertrailSearchAlert({}, BASIC_ALERT_CONFIG) },
      /Papertrail API token must be provided/
    );
  });
  test('must supply host', () => {
    assert.throws(
      () => {
        new PapertrailSearchAlert({
          papertrail: {
            apiToken: '1234'
          }},
          BASIC_ALERT_CONFIG)
      },
      /Papertrail host must be provided/
    );
  });

  test('submit successful search', async () => {
    let config = {
      papertrail: {
        baseUrl: 'http://localhost:8086/api/v1/',
        apiToken: '1234'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'papertrailSearch',
      description: 'test alert',
      query: 'status=500',
      frequency: 60,
      duration: 300,
      threshold: 0,
    }

    let result = [
      {
        events: []
      }
    ];

    let mock = nock('http://localhost:8086')
                 .get('/api/v1/events/search')
                 .query(true)
                 .reply(200, result);

    let a = new PapertrailSearchAlert(config, alertConfig);
    await a.run();
    assert.equal(a.status, 'inactive', "Alert should be inactive");
  });

  test('status change from inactive to pending', async () => {
    let config = {
      papertrail: {
        baseUrl: 'http://localhost:8086/api/v1/',
        apiToken: '1234'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'papertrailSearch',
      description: 'test alert',
      query: 'status=500',
      frequency: 60,
      duration: 300,
      threshold: 2,
    }

    let result = {
      events: [1,2,3]
    };

    let mock = nock('http://localhost:8086')
                 .get('/api/v1/events/search')
                 .query(true)
                 .reply(200, result);
    let a = new PapertrailSearchAlert(config, alertConfig);
    await a.run();
    assert.equal(a.status, 'pending', "Alert status should be inactive");
  });

  test('status change from pending to active', async () => {
    let config = {
      papertrail: {
        baseUrl: 'http://localhost:8086/api/v1/',
        apiToken: '1234'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'papertrailSearch',
      description: 'test alert',
      query: 'status=500',
      frequency: 1,
      duration: 2,
      threshold: 1,
    }

    let result = {
      events: [1,2]
    };

    let mock = nock('http://localhost:8086')
                 .get('/api/v1/events/search')
                 .query(true)
                 .twice()
                 .reply(200, result);

    let a = new PapertrailSearchAlert(config, alertConfig);
    await a.run();
    assert(a.status === 'pending', 'Alert status should be pending');

    // Wait for at least duration to pass to make sure the status gets changed to active
    await sleep(3000);
    await a.run();
    assert(a.status === 'active', 'Alert status should be active');
  });

  test('status change from pending to inactive', async () => {
    let config = {
      papertrail: {
        baseUrl: 'http://localhost:8086/api/v1/',
        apiToken: '1234'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'papertrailSearch',
      description: 'test alert',
      query: 'status=500',
      frequency: 1,
      duration: 2,
      threshold: 1,
    }

    let result = {
      events: [1,2]
    };

    let mock = nock('http://localhost:8086')
                 .get('/api/v1/events/search')
                 .query(true)
                 .reply(200, result);

    let a = new PapertrailSearchAlert(config, alertConfig);
    await a.run();
    assert(a.status === 'pending', 'Alert status should be pending');

    result = {
      events: []
    }

    mock = nock('http://localhost:8086')
             .get('/api/v1/events/search')
             .query(true)
             .reply(200, result);

    await a.run();
    assert(a.status === 'inactive', 'Alert status should be inactive');
  });
});
