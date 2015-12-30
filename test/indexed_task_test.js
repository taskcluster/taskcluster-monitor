import assert from 'assert';
import nock from 'nock';
import { IndexedTaskAlert } from '../lib/alerts/taskcluster_index';

suite('Taskcluster Index Alert', () => {
  test('namespace required', async () => {
    let alertConfig = {
      name: 'indexed-task-alert',
      type: 'indexedTask',
      description: 'indexed task alert'
    }

    assert.throws(
      () => { new IndexedTaskAlert({}, alertConfig); },
      /Indexed namespace is required/
    );
  });

  test('task age threshold required', async () => {
    let alertConfig = {
      name: 'indexed-task-alert',
      type: 'indexedTask',
      description: 'indexed task alert',
      namespace: 'garbage.1234'
    }

    assert.throws(
      () => { new IndexedTaskAlert({}, alertConfig); },
      /Task age threshold \(in hours\) is required/
    );
  });

  test('active - namespace not found', async () => {
    let alertConfig = {
      name: 'indexed-task-alert',
      type: 'indexedTask',
      description: 'indexed task alert',
      threshold: 1,
      namespace: 'garbage.1234',
      namespace1: 'tc-vcs.v1.clones.00304dc3ebb1ffb0b250af0ac8ad44fc'
    }

    let a = new IndexedTaskAlert({
      taskcluster: {
        indexUrl: 'http://localhost:4040'
      }},
      alertConfig
    );

    nock('http://localhost:4040')
     .get('/task/garbage.1234')
     .query(true)
     .reply(404);

    await a.run();

    assert.equal(a.status, 'active');
    assert.equal(
      a.alertMessage,
      'Error looking up \'garbage.1234\' namespace for rule \'indexed-task-alert\''
    );
  });

  test('inactive - age below threshold', async () => {
    let alertConfig = {
      name: 'indexed-task-alert',
      type: 'indexedTask',
      description: 'indexed task alert',
      threshold: 10,
      namespace: 'garbage.1234',
      notification: {
        message: 'alert triggered'
      }
    }

    let indexResponse = {
      namespace: 'garbage.1234',
      taskId: '1234',
      rank: 1451333343154,
      data: {},
      expires: '2016-01-27T20:03:01.292Z'
    };

    let resolved = new Date();
    resolved.setHours(resolved.getHours() - 4);
    let queueResponse = {
      status: {
        runs: [
         {resolved: resolved}
        ]
      }
    };

    let a = new IndexedTaskAlert({
      taskcluster: {
        indexUrl: 'http://localhost:4040',
        queueUrl: 'http://localhost:4041'
      }},
      alertConfig
    );

    nock('http://localhost:4040')
     .get('/task/garbage.1234')
     .query(true)
     .reply(200, indexResponse);

    nock('http://localhost:4041')
     .get('/task/1234/status')
     .query(true)
     .reply(200, queueResponse);

    await a.run();
    assert.equal(a.status, 'inactive');
  });

  test('active - age exceeds threshold', async () => {
    let alertConfig = {
      name: 'indexed-task-alert',
      type: 'indexedTask',
      description: 'indexed task alert',
      threshold: 1,
      namespace: 'garbage.1234',
      notification: {
        message: 'alert triggered'
      }
    }

    let indexResponse = {
      namespace: 'garbage.1234',
      taskId: '1234',
      rank: 1451333343154,
      data: {},
      expires: '2016-01-27T20:03:01.292Z'
    };

    let resolved = new Date();
    resolved.setHours(resolved.getHours() - 4);
    let queueResponse = {
      status: {
        runs: [
         {resolved: resolved}
        ]
      }
    };

    let a = new IndexedTaskAlert({
      taskcluster: {
        indexUrl: 'http://localhost:4040',
        queueUrl: 'http://localhost:4041'
      }},
      alertConfig
    );

    nock('http://localhost:4040')
     .get('/task/garbage.1234')
     .query(true)
     .reply(200, indexResponse);

    nock('http://localhost:4041')
     .get('/task/1234/status')
     .query(true)
     .reply(200, queueResponse);

    await a.run();
    assert.equal(a.status, 'active');
    assert(a.message.includes('\'indexed-task-alert\' triggered.  Task \'1234\' age exceeds threshold.'));
  });
});
