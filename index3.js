// [START import]
// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");
// Import firebase-functions first to avoid issues
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Then initialize
initializeApp();
// [END import]
// Database reference
const dbRef = admin.firestore().doc("tokens/demo");
// Twitter API init
const TwitterApi = require("twitter-api-v2").default;
const twitterClient = new TwitterApi({
  clientId: "eXVlLWpmWWlJSlJ4SDU0WjF3Ukc6MTpjaQ",
  clientSecret: "4XvaETW4Vq_vZh8j4A8v3ncLDDu-RNZoeOhhxcY4-eEVK0YiWK",
});
const callbackURL = "http://127.0.0.1:5000/kitsunekeltimi/us-central1/callback";
// OpenAI API init
const {Configuration, OpenAIApi} = require("openai");
const configuration = new Configuration({
  organization: "YOUR_OPENAI_ORG",
  apiKey: "YOUR_OPENAI_SECRET",
});
const openai = new OpenAIApi(configuration);
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
exports.tweet = functions.https.onRequest(async (req, res) => {
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
  res.send(data);
});
