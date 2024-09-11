exports.tweet = functions.https.onRequest(async (request, response) => {
    try {
      const { refreshToken } = (await dbRef.get()).data();
      const {
        client: refreshedClient,
        accessToken,
        refreshToken: newRefreshToken,
      } = await twitterClient.refreshOAuth2Token(refreshToken);
      await dbRef.set({ accessToken, refreshToken: newRefreshToken });
      const nextTweet = await openai.createCompletion('text-davinci-001', {
        prompt: 'tweet something cool for #techtwitter',
        max_tokens: 64,
      });
      const { data } = await refreshedClient.v2.tweet(
        nextTweet.data.choices[0].text
      );
      response.send(data);
    } catch (error) {
      console.error('Error in tweet function:', error);
      response.status(500).send('Internal server error');
    }
  });
  