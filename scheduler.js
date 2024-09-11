const cron = require('node-cron');
const { tweet } = require('./bot');

cron.schedule('0 * * * *', () => {
  tweet('Hello, world! This is a scheduled tweet.');
});
