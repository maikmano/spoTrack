const express = require('express');
const request = require('request');
const querystring = require('querystring');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Set view engine and views directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public', { type: 'text/css' }));



// Set home page route
app.get('/', function (req, res) {
  res.render('home');
});

app.get('/login', function (req, res) {
  const scopes = 'user-top-read';
  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:8888/callback';
  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + process.env.CLIENT_ID +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(redirectUri));
});

// Definindo o callback da API
app.get('/top-songs', function (req, res) {
  const code = req.query.code || null;
  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:8888/callback';
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(
        process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET
      ).toString('base64'))
    },
    json: true
  };

  // Autenticando a API com o Spotify 
  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      const refresh_token = body.refresh_token;

      // Get the user's Spotify ID
      const options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      request.get(options, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          const user_id = body.id;

          // Definindo o endpoint e as opções da API
          const endpointShort = `https://api.spotify.com/v1/users/${user_id}/top/tracks?time_range=short_term&limit=10`;
          const optionsShort = {
            url: endpointShort,
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
          };

          const endpointMedium = `https://api.spotify.com/v1/users/${user_id}/top/tracks?time_range=medium_term&limit=10`;
          const optionsMedium = {
            url: endpointMedium,
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
          };

          // Get the user's top tracks from Spotify
          request.get(optionsShort, function (error, response, body) {
            if (!error && response.statusCode === 200) {
              const topSongsShort = body.items.map((song) => ({
                name: song.name,
                artist: song.artists[0].name,
                imageUrl: song.album.images[0].url,
                previewUrl: song.preview_url
              }));

              request.get(optionsMedium, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                  const topSongsMedium = body.items.map((song) => ({
                    name: song.name,
                    artist: song.artists[0].name,
                    imageUrl: song.album.images[0].url,
                    previewUrl: song.preview_url
                  }));

                  // Render the user's top tracks to the home page
                  res.render('index', {
                    topSongsShort: topSongsShort,
                    topSongsMedium: topSongsMedium
                  });
                } else {
                  console.log(error);
                }
              });
            } else {
              console.log(error);
            }
          });
        } else {
          console.log(error);
        }
      });
    }
  });
});

// Set logout route
app.get('/logout', function (req, res) {
  res.redirect('https://www.spotify.com/logout/');
});

// Set server error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(process.env.PORT || 3000, function () {
  console.log('Server listening on port ' + this.address().port);
});