// [START import]

// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");

// Import firebase-functions first to avoid issues
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Then initialize
initializeApp();

// Database reference
const dbRef = admin.firestore().doc("tokens/demo");

// Twitter API init
const TwitterApi = require("twitter-api-v2").default;
const twitterClient = new TwitterApi({
  clientId: "eXVlLWpmWWlJSlJ4SDU0WjF3Ukc6MTpjaQ",
  clientSecret: "4XvaETW4Vq_vZh8j4A8v3ncLDDu-RNZoeOhhxcY4-eEVK0YiWK",
});

const callbackURL = "http://127.0.0.1:5000/auth/twitter/callback";

// OpenAI API init
const {Configuration, OpenAIApi} = require("openai");
const configuration = new Configuration({
  organization: "YOUR_OPENAI_ORG",
  apiKey: "YOUR_OPENAI_SECRET",
});
const openai = new OpenAIApi(configuration);

// Passport
const passport = require('passport');
const TwitterStrategy = require('@superfaceai/passport-twitter-oauth2').Strategy;

passport.use(
  new TwitterStrategy(
    {
      clientType: 'confidential', // Depends on your Twitter app settings (valid values: 'confidential' or 'public')
      clientID: 'YOUR_TWITTER_CLIENT_ID',
      clientSecret: 'YOUR_TWITTER_CLIENT_SECRET',
      callbackURL: 'http://127.0.0.1:5000/auth/twitter/callback', // Your callback URL
    },
    function (accessToken, refreshToken, profile, done) {
      // Handle user authentication here (e.g., find or create a user)
      // Call `done` with the user object
      // Example: User.findOrCreate({ twitterId: profile.id }, function (err, user) { return done(err, user); });
    }
  )
);

// Authenticate
app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), function (req, res) {
  // Successful authentication, redirect or handle as needed
  res.redirect('/dashboard');
});

// STEP 1 - Auth URL
exports.auth = functions.https.onRequest(async (req, res) => {
  const {url, codeVerifier, state} = twitterClient.generateOAuth2AuthLink(
      callbackURL,
      {scope: ["tweet.read", "tweet.write", "users.read", "offline.access"]},
  );

  // store verifier
  await dbRef.set({codeVerifier, state});

  res.redirect(url);
});

// STEP 2 - Verify callback code, store access_token
exports.callback = functions.https.onRequest(async (req, res) => {
  const {state, code} = req.query;

  const dbSnapshot = await dbRef.get();
  const {codeVerifier, state: storedState} = dbSnapshot.data();

  if (state !== storedState) {
    return res.status(400).send("Stored tokens do not match!");
  }

  const {
    client: loggedClient,
    accessToken,
    refreshToken,
  } = await twitterClient.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: callbackURL,
  });

  await dbRef.set({accessToken, refreshToken});

  const {data} = await loggedClient.v2.me();

  res.send(data);
});

// STEP 3 - Refresh tokens and post tweets
exports.tweetHourly = functions.pubsub
  .schedule("0 */2 * * *")
  .timeZone("America/Chicago")
  .onRun(async (context) => {
    try {
      const {refreshToken} = (await dbRef.get()).data();
  
      const {
        client: refreshedClient,
        accessToken,
        refreshToken: newRefreshToken,
      } = await twitterClient.refreshOAuth2Token(refreshToken);
  
      await dbRef.set({accessToken, refreshToken: newRefreshToken});
  
      const nextTweet = await openai.createCompletion("text-davinci-001", {
        prompt: "tweet something cool for #techtwitter",
        max_tokens: 64,
      });
  
      const {data} = await refreshedClient.v2.tweet(
        nextTweet.data.choices[0].text,
      );
  
      // Send the tweet data as the response
      res.send(data);
    } catch (error) {
      console.error("Error while tweeting:", error);
      // Handle any errors here
      res.status(500).send("Error while tweeting. Please check logs.");
    }
  });
  
  const passport = require('passport');
  const TwitterStrategy = require('@superfaceai/passport-twitter-oauth2').Strategy;
  
  passport.use(
    new TwitterStrategy(
      {
        clientType: 'confidential', // Depends on your Twitter app settings (valid values: 'confidential' or 'public')
        clientID: 'YOUR_TWITTER_CLIENT_ID',
        clientSecret: 'YOUR_TWITTER_CLIENT_SECRET',
        callbackURL: 'http://127.0.0.1:5000/auth/twitter/callback', // Your callback URL
      },
      function (accessToken, refreshToken, profile, done) {
        // Handle user authentication here (e.g., find or create a user)
        // Call `done` with the user object
        // Example: User.findOrCreate({ twitterId: profile.id }, function (err, user) { return done(err, user); });
      }
    )
  );

  app.get('/auth/twitter', passport.authenticate('twitter'));
  
  app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), function (req, res) {
    // Successful authentication, redirect or handle as needed
    res.redirect('/dashboard');
  });
  
  // [END import]

// require("dotenv").config({ path: __dirname + "/.env" });
// const express = require('express')
// const app = express()
// const port = process.env.PORT || 4000;
// const { twitterClient } = require("./twitterClient.js")
// const CronJob = require("cron").CronJob;
//
// app.listen(port, () => {
//  console.log(`Listening on port ${port}`)
// })
//
// const tweet = async () => {
//   try {
//     await twitterClient.v2.tweet("Hello world!");
//   } catch (e) {
//     console.log(e)
//   }
// }
//
// const cronTweet = new CronJob("30 * * * * *", async () => {
//  tweet();
// });
//
// cronTweet.start();
// 
// node index.js