import assert from 'assert';
import crypto from 'crypto';

const REQUIRED_PROPERTIES = ['name', 'type', 'description'];

export class Alert {
  constructor(config, alertConfig) {
    assert(config, "Configuration must be provided");
    assert(alertConfig, "Alert configuration must be provided");
    REQUIRED_PROPERTIES.forEach(property => {
      assert(alertConfig[property], `Alert configuration missing '${property}'`);
    });

    this._setup(config, alertConfig);
    this._config = config;
    this._alertConfig = alertConfig;
    this._fingerprint = null;
    this.alertMessage = null;
    this.lastProcessed = null;
    this.lastAlert = null;
    this.status = 'inactive';
  }

  // Setup method for classes inheriting from Alert.
  _setup() {
    return;
  }

  get message() {
    let notificationProperties = this._alertConfig.notification || {};

    if (!notificationProperties.message) {
      notificationProperties.message = '';
    }

    let message = this.alertMessage ? this.alertMessage : notificationProperties.message;
    return message;
  }

  get active() {
    return this.status === 'active';
  }

  get threshold() {
    return this._alertConfig.threshold || 0;
  }

  get frequency() {
    return this._alertConfig.frequency || 60;
  }

  get duration() {
    return this._alertConfig.duration || 0;
  }

  get type() {
    return this._alertConfig.type;
  }

  get name() {
    return this._alertConfig.name;
  }

  get fingerprint() {
    if (this._fingerprint) {
      return this._fingerprint;
    }

    let md5 = crypto.createHash('md5');
    REQUIRED_PROPERTIES.forEach(element => {
      md5.update(this._alertConfig[element]);
    });

    this._fingerprint = md5.digest('hex');
    return this._fingerprint;
  }

  activateAlert(message) {
    if (!this.lastAlert) {
      this.lastAlert = new Date();
    }

    // If the duration the alert has been active is more than
    // the duration setting (defaults to 0 seconds), then activate
    // alert
    let duration = (Date.now() - this.lastAlert)/1000;

    if (duration >= this.duration) {
      if (['inactive', 'pending'].includes(this.status)) {
        console.log(`Alert rule 'active' for '${this.name}'`);
        this.status = 'active';
        this.alertMessage = message;
      }
    } else {
      if (this.status === 'inactive') {
        console.log(`Alert rule 'pending' for '${this.name}'`);
        this.status = 'pending';
      }
    }
  }

  deactivateAlert() {
    if (!['pending', 'active'].includes(this.status)) {
      return;
    }

    console.log(`Alert rule deactivated for '${this.name}'`);
    this.lastAlert = null;
    this.status = 'inactive';
    this.alertMessage = null;
  }

  async run() {
    console.log(`Evaluating '${this.name}'`);
    throw new Error("Method not implemented");
  }

  schedule(offset=0) {
    console.log(`Scheduling first run of rule '${this.name}' in ${offset/1000} seconds`);
    this.timeoutId = setTimeout(() => {
      async () => {
        await this.run()
        this.scheduleInterval();
      }().catch(err => { console.log(err); this.scheduleInterval();  });
    }, offset)
  }

  scheduleInterval() {
    if (this.intervalId) { return };
    console.log(`Scheduling rule '${this.name}' every ${this.frequency} seconds`);

    this.intervalId = setInterval(() => {
      async() => {
        await this.run();
      }().catch(err => { console.log(err) });
    }, this.frequency * 1000);
  }

  stop() {
    clearInterval(this.intervalId);
    clearTimeout(this.timeoutId);
  }
}
