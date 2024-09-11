// STEP 1 - Auth URL
exports.auth = functions.https.onRequest(async (req, res) => {
    const {url, codeVerifier, state} = twitterClient.generateOAuth2AuthLink(
      callbackURL,
      {scope: ["tweet.read", "tweet.write", "users.read", "offline.access"]},
    );
    // Store verifier
    await dbRef.set({codeVerifier, state});
    res.redirect(url); // Use 'res' instead of 'response'
  });
  // STEP 2 - Verify callback code, store access_token
  exports.callback = functions.https.onRequest(async (req, res) => {
    const {state, code} = req.query; // Use 'req' instead of 'request'
    const dbSnapshot = await dbRef.get();
    const {codeVerifier, state: storedState} = dbSnapshot.data();
    if (state !== storedState) {
      return res.status(400).send("Stored tokens do not match!"); // Use 'res' instead of 'response'
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
    res.send(data); // Use 'res' instead of 'response'
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
    const {data} = await refreshedClient.v2.tweet(nextTweet.data.choices[0].text);
    res.send(data); // Use 'res' instead of 'response'
  