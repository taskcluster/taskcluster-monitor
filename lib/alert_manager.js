import fs from 'fs';
import yaml from 'js-yaml';

// The purpose of the AlertManager is to keep a collection of alerts and trigger actions
// to notify consumers
export class AlertManager {
  constructor(checkInterval, notificationFrequency, notificationHandlers) {
    this.checkInterval = checkInterval || 5;
    this.notificationFrequency = notificationFrequency || 300;
    this.notificationHandlers = {};
    this._alerts = {};
    this.timeoutId = null;
  }

  get alerts() {
    return Object.keys(this._alerts).map(fp => {
      let a = this._alerts[fp];
      return {
        fingerprint: fp,
        name: a.obj.name,
        type: a.obj.type,
        status: a.obj.status,
        lastReported: a.lastReported
      }
    });
  }

  async checkAlerts() {
    clearTimeout(this.timeoutId);

    await Promise.all(Object.keys(this._alerts).map(
      async (fp) => {
        let a = this._alerts[fp];
        if (!this.shouldReportAlert(a)) {
          return;
        }

        if (!Object.keys(this.notificationHandlers).length) {
          console.log('No notification handlers configured');
          return;
        }

        await this.sendNotification(a.obj);
        a.lastReported = new Date();
      }
    ));

    this.scheduleAlertCheckInterval();
  }

  async sendNotification(alertObj) {
    let handlers = [];
    // Allow alerts to specific what notification handlers to use
    if (alertObj.notificationHandlers) {
      Object.keys(alertObj.notificationHandlers).forEach(handler => {
        if (this.notificationHandlers[handler]) {
          handlers.push(handler);
        }
      });

    }

    if (!handlers.length) {
      // Add default notification handler
      handlers = ['sns'];
    }

    // Send notification of alert using each notification handler
    await Promise.all(handlers.map(
      handlerName => {
        let handler = this.notificationHandlers[handlerName];
        let subject = `Rule '${alertObj.name}' triggered`;
        let message = alertObj.message || subject;
        let notificationMessage = {
          name: alertObj.name,
          message: message,
          time: alertObj.lastAlert.getTime()
        };

        return handler.notify(subject, notificationMessage).catch(err => {
          console.log(`Error sending message for '${alertObj.name}'. ${err.message}`);
        });
    }));
  }

  scheduleAlertCheckInterval() {
    clearTimeout(this.timeoutId);

    this.timeoutId = setTimeout( () => {
      async () => {
        await this.checkAlerts().catch(err => {
          console.log(`[alert-operator] Error checking alerts. ${err.message}`)
        });
      }();
    }, this.checkInterval * 1000);
  }



  /*
   * Registers an instance of an Alert object for monitoring.
   */
  registerAlert(alertObj) {
    this._alerts[alertObj.fingerprint] = {
      obj: alertObj,
      lastReported: null
    };

  }

  run() {
    this.scheduleAlerts();
    this.scheduleAlertCheckInterval();
    this.running = true;
  }

  scheduleAlerts() {
    Object.keys(this._alerts).forEach(fp => {
      let a = this._alerts[fp].obj;
      // Attempt to stagger scheduling alerts to be evaluated. Prevent thundering
      // herd issue so pick a random time in the next 2 minutes.
      a.schedule(Math.random() * (1, 2 * 60 * 1000) + 1);
    });
  }

  shouldReportAlert(a) {
    if (!a.obj.active) {
      a.lastReported = null;
      return false;
    }

    // Alert should be reported when first fired
    if (!a.lastReported) {
      return true;
    }

    // Only report the alert if a suitable amount of time has elapsed since the
    // last alert to prevent alert overload.
    let alertDuration = (Date.now() - a.lastReported)/1000;
    if (alertDuration > this.notificationFrequency) {
      return true;
    }

    return false;
  }

  stop() {
    if (!this.running) {
      return;
    }

    Object.keys(this._alerts).forEach(fp => {
      let a = this._alerts[fp].obj;
      a.stop();
    });
    this.running = false;
  }
}
