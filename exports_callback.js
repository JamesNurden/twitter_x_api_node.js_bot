exports.callback = functions.https.onRequest(async (request, response) => {
    try {
      const { state, code } = request.query;
      const dbSnapshot = await dbRef.get();
      const { codeVerifier, state: storedState } = dbSnapshot.data();
      if (state !== storedState) {
        return response.status(400).send('Stored tokens do not match!');
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
      await dbRef.set({ accessToken, refreshToken });
      const { data } = await loggedClient.v2.me();
      response.send(data);
    } catch (error) {
      console.error('Error in callback function:', error);
      response.status(500).send('Internal server error');
    }
  });
