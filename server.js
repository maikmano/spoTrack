const express = require('express');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');
require('dotenv').config();

const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.static(__dirname + '/public'))
   .use(cors());

const redirect_uri = process.env.REDIRECT_URI ||
  'http://168.232.163.149:3000/callback';
  
// Coloque seu endereço de IP público abaixo
const server_address = 'http://168.232.163.149';
const port = process.env.PORT || 3000;

app.get('/login', function(req, res) {
  const state = generateRandomString(16);
  res.cookie('spotify_auth_state', state);

  const scope = 'user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.CLIENT_ID,
      scope: scope,
      redirect_uri: `${server_address}:${port}/callback`,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (state === null || state !== storedState) {
    res.redirect(`${server_address}:3000/#` +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie('spotify_auth_state');
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: `${server_address}:${port}/callback`,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(
          process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET
        ).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;

        const options = {
          url: 'https://api.spotify.com/v1/me/top/tracks?limit=10',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        request.get(options, function(error, response, body) {
          const topSongs = body.items.map((song) => ({
            name: song.name,
            artist: song.artists[0].name,
            imageUrl: song.album.images[0].url,
            previewUrl: song.preview_url
          }));

          res.redirect(`${server_address}:3000/#` +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token,
              top_songs: JSON.stringify(topSongs)
            }));
        });
      } else {
        res.redirect(`${server_address}:3000/#` +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

console.log(`Listening on port ${port}.`);
app.listen(port);
