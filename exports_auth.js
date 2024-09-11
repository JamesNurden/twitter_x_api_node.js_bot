exports.auth = functions.https.onRequest(async (request, response) => {
    try {
      const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        callbackURL,
        { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
      );
      // store verifier
      await dbRef.set({ codeVerifier, state });
      response.redirect(url);
    } catch (error) {
      console.error('Error in auth function:', error);
      response.status(500).send('Internal server error');
    }
  });
  