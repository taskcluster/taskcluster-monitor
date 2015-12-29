import assert from 'assert';
import nock from 'nock';
import { AlertManager} from '../lib/alert_manager';
import { MockAlert } from './mock_alert';
import { sleep } from '../lib/utils';

suite('Alert Manager', () => {
  test('alerts registered', async () => {
    let checkInterval = 1;
    let notificationFrequency = 10;
    let alertConfig = {
      name: 'mock-alert',
      type: 'mock',
      description: 'mock alert',
      frequency: 1,
      schedule: [true]
    };

    let manager = new AlertManager(checkInterval, notificationFrequency);
    let mockAlert = new MockAlert({}, alertConfig);

    manager.registerAlert(mockAlert);
    assert(manager.alerts.length === 1, "Alerts do not appear to be registered");
  });

  test('send alert notifcations after elapsed time interval', async () => {
    let checkInterval = 1;
    let notificationFrequency = 2;
    let notifications = 0;
    let notificationMessage = '';
    let notificationSubject = '';
    let alertConfig = {
      name: 'mock-alert',
      type: 'mock',
      description: 'mock alert',
      frequency: 1,
      schedule: [true]
    };

    let manager = new AlertManager(checkInterval, notificationFrequency);
    let mockAlert = new MockAlert({}, alertConfig);

    manager.registerAlert(mockAlert);
    manager.notificationHandlers = {
      'sns':  {
        notify: async (subject, message) => {
          notificationMessage = message;
          notificationSubject = subject;
          notifications += 1;
        }
      }
    }

    manager.run();
    await sleep(10 * 1000);
    assert(notifications >= 4, "Four or more notifications should have been sent");

    assert.equal(notificationMessage.message, "Rule 'mock-alert' triggered");
    assert.equal(notificationSubject, "Rule 'mock-alert' triggered");
  });

  test('alert notifications - custom message', async () => {
    let checkInterval = 1;
    let notificationFrequency = 1;
    let notifications = 0;
    let notificationMessage = '';
    let notificationSubject = '';
    let notified = false;
    let alertConfig = {
      name: 'mock-alert',
      type: 'mock',
      description: 'mock alert',
      frequency: 1,
      schedule: [true],
      notification: {
        message: 'custom message'
      }
    };

    let manager = new AlertManager(checkInterval, notificationFrequency);
    let mockAlert = new MockAlert({}, alertConfig);

    manager.registerAlert(mockAlert);
    manager.notificationHandlers = {
      'sns':  {
        notify: async (subject, message) => {
          notified = true;
          notificationMessage = message;
          notificationSubject = subject;
          notifications += 1;
        }
      }
    }

    manager.run();

    while (!notified) {
      await sleep(50);
    }

    assert.equal(notificationMessage.message, "custom message");
    assert.equal(notificationSubject, "Rule 'mock-alert' triggered");
  });
});


