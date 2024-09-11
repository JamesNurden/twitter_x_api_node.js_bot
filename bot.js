const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');

const client = new TwitterApi({
  appKey: config.twitter.apiKey,
  appSecret: config.twitter.apiSecretKey,
  accessToken: config.twitter.accessToken,
  accessSecret: config.twitter.accessTokenSecret,
});

async function tweet(message) {
  try {
    await client.v2.tweet(message);
    console.log('Tweeted:', message);
  } catch (error) {
    console.error('Error tweeting:', error);
  }
}

module.exports = { tweet };
