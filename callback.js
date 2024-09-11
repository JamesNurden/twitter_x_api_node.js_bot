exports.callback = functions.https.onRequest(async (request, response) => {
    const { state, code } = request.query;
    const dbSnapshot = await dbRef.get();
    const { codeVerifier, state: storedState } = dbSnapshot.data();
    if (state !== storedState) {
      return response.status(400).send('Stored tokens do not match!');
    }
    // Rest of your code here
  });
  