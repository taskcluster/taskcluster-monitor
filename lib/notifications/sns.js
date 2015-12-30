import AWS from 'aws-sdk-promise';

export class SNS {
  constructor(config) {
    this.client = new AWS.SNS(config);
    this.topic = config.topic;
  }

  async notify(subject, message) {
    try {
      await this.client.publish({
        TargetArn: this.topic,
        Subject: subject,
        Message: JSON.stringify(message)
      }).promise();
    } catch (e) {
      console.log(`[alert-operator] Error publishing SNS message. ${e.message}`);
    }
  }
}
