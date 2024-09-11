const CronJob = require("cron").CronJob;

const cronTweet = new CronJob("30 * * * * *", async () => {
    tweet();
  });
  
  cronTweet.start();

require("dotenv").config({ path: __dirname + "/.env" });
const { twitterClient } = require("./twitterClient.js")

const tweet = async () => {
  try {
    await twitterClient.v2.tweet("Hello world!");
  } catch (e) {
    console.log(e)
  }
}

tweet();

const express = require('express')
const app = express()
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

/*require("dotenv").config({ path: __dirname + "/.env" });
const { twitterClient } = require("./twitterClient.js")
const CronJob = require("cron").CronJob;

const tweet = async () => {
  try {
    await twitterClient.v2.tweet("Hello world!");
  } catch (e) {
    console.log(e)
  }
}

const cronTweet = new CronJob("30 * * * * *", async () => {
  tweet();
});

cronTweet.start();
*/