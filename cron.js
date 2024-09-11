exports.tweetHourly = functions.pubsub.schedule

exports.tweetHourly = functions.pubsub.schedule("0 * * * *").timeZone("YOUR_TIMEZONE").onRun(async (context) => {
  try {
    // Your existing code for tweeting goes here
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
