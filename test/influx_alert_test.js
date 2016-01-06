import assert from 'assert';
import nock from 'nock';
import { InfluxAlert } from '../lib/alerts/influx';
import { sleep } from '../lib/utils';

const BASIC_INFLUX_ALERT_CONFIG = {
  name: 'test',
  type: 'influx',
  description: 'influx alert test',
  database: 'test'
};


suite('Influx DB Alert', () => {
  test('must supply influx host', () => {
    let config = {
      influx: {
        username: 'u',
        password: 'p'
      }
    };
    assert.throws(
      () => { new InfluxAlert(config, BASIC_INFLUX_ALERT_CONFIG)},
      /Influx host must be provided/
    );
  });

  test('must supply influx username', () => {
    let config = {
      influx: {
        host: 'h',
        password: 'p'
      }
    };
    assert.throws(
      () => { new InfluxAlert(config, BASIC_INFLUX_ALERT_CONFIG)},
      /Influx username must be provided/
    );
  });

  test('must supply influx password', () => {
    let config = {
      influx: {
        host: 'h',
        username: 'u'
      }
    };
    assert.throws(
      () => { new InfluxAlert(config, BASIC_INFLUX_ALERT_CONFIG)},
      /Influx password must be provided/
    );
  });
  test('must supply influx database', () => {
    let config = {
      influx: {
        host: 'h',
        username: 'u',
        password: 'p'
      }
    };
    assert.throws(
      () => {
        new InfluxAlert(config, {
          name: 'test',
          type: 'influx',
          description: 'influx alert test',
        });
      },
      /Influx database must be provided/
    );
  });

  test('submit successful query', async () => {
    let config = {
      influx: {
        host: 'localhost',
        username: 'username',
        password: 'password'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'influx',
      description: 'test alert',
      query: 'select * from time_series',
      frequency: 60,
      duration: 300,
      threshold: 0,
      database: 'test'
    }

    let result = [
      {
        points: [ [0,0] ]
      }
    ];

    let mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .reply(200, result);
    let a = new InfluxAlert(config, alertConfig);
    await a.run();
  });

  test('status change from inactive to pending', async () => {
    let config = {
      influx: {
        host: 'localhost',
        username: 'username',
        password: 'password'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'influx',
      description: 'test alert',
      query: 'select * from time_series',
      frequency: 1,
      duration: 5,
      threshold: 1,
      database: 'test'
    }

    let result = [
      {
        points: [ [0,2] ]
      }
    ];

    let mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .reply(200, result);

    let a = new InfluxAlert(config, alertConfig);

    assert(a.status === 'inactive', 'Alert status should be inactive');
    await a.run();
    assert(a.status === 'pending', 'Alert status should be pending');
  });

  test('status change from pending to active', async () => {
    let config = {
      influx: {
        host: 'localhost',
        username: 'username',
        password: 'password'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'influx',
      description: 'test alert',
      query: 'select * from time_series',
      frequency: 1,
      duration: 2,
      threshold: 1,
      database: 'test'
    }

    let result = [
      {
        points: [ [0,2] ]
      }
    ];

    let mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .twice()
                 .reply(200, result);

    let a = new InfluxAlert(config, alertConfig);

    await a.run();
    assert(a.status === 'pending', 'Alert status should be pending');

    // Wait for at least duration to pass to make sure the status gets changed to active
    await sleep(3000);
    await a.run();
    assert(a.status === 'active', 'Alert status should be active');
  });

  test('status change from pending to inactive', async () => {
    let config = {
      influx: {
        host: 'localhost',
        username: 'username',
        password: 'password'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'influx',
      description: 'test alert',
      query: 'select * from time_series',
      frequency: 1,
      duration: 2,
      threshold: 1,
      database: 'test'
    }

    let result = [
      {
        points: [ [0,2] ]
      }
    ];


    let mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .reply(200, result);

    let a = new InfluxAlert(config, alertConfig);

    await a.run();
    assert(a.status === 'pending', 'Alert status should be pending');

    result = [
      {
        points: [ [0,0] ]
      }
    ];

    mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .reply(200, result);

    await a.run();
    assert(a.status === 'inactive', 'Alert status should be inactive');
  });

  test('status not changed when threshold not reached', async () => {
    let config = {
      influx: {
        host: 'localhost',
        username: 'username',
        password: 'password'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'influx',
      description: 'test alert',
      query: 'select * from time_series',
      frequency: 1,
      duration: 5,
      threshold: 2,
      database: 'test'
    }

    let result = [
      {
        points: [ [0,1] ]
      }
    ];


    let mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .reply(200, result);

    let a = new InfluxAlert(config, alertConfig);

    assert(a.status === 'inactive', 'Alert status should be inactive');
    await a.run();
    assert(
      a.status === 'inactive',
      'Alert status should be inactive when threshold not reached'
    );
  });

  test('status change from inactive to pending using min_threshold', async () => {
    let config = {
      influx: {
        host: 'localhost',
        username: 'username',
        password: 'password'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'influx',
      description: 'test alert',
      query: 'select * from time_series',
      frequency: 1,
      duration: 5,
      min_threshold: 1,
      database: 'test'
    }

    let result = [
      {
        points: [ [0,0] ]
      }
    ];

    let mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .reply(200, result);

    let a = new InfluxAlert(config, alertConfig);

    assert(a.status === 'inactive', 'Alert status should be inactive');
    await a.run();
    assert(a.status === 'pending', 'Alert status should be pending');
  });

  test('status inactive using min_threshold', async () => {
    let config = {
      influx: {
        host: 'localhost',
        username: 'username',
        password: 'password'
      }
    };

    let alertConfig = {
      name: 'test-alert',
      type: 'influx',
      description: 'test alert',
      query: 'select * from time_series',
      frequency: 1,
      duration: 5,
      min_threshold: 1,
      database: 'test'
    }

    let result = [
      {
        points: [ [0,3] ]
      }
    ];

    let mock = nock('http://localhost:8086')
                 .get('/db/test/series')
                 .query(true)
                 .reply(200, result);

    let a = new InfluxAlert(config, alertConfig);

    assert(a.status === 'inactive', 'Alert status should be inactive');
  });
});
