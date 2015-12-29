import { Alert } from  '../lib/alerts/alert';
import { sleep } from '../lib/utils';

export class MockAlert extends Alert {
  _setup(config, alertConfig) {
    this.alertSchedule = alertConfig.schedule || [false];
    this.currentSchedule = 0;
  }

  getSchedule() {
    if (this.currentSchedule > this.alertSchedule.length-1) {
      this.currentSchedule = 0;
    }

    return this.alertSchedule[this.currentSchedule];
  }

  async run() {
    console.log(`Evaluating rule '${this.name}`);
    if (this.getSchedule()) {
      this.activateAlert();
    } else {
      this.deactivateAlert();
    }

    this.currentSchedule += 1;
  }
}

