const fragment = new URLSearchParams(window.location.hash.slice(1));
const accessToken = fragment.get('access_token');
const refreshToken = fragment.get('refresh_token');
const topSongs = JSON.parse(fragment.get('top_songs'));

if (accessToken) {
  const main = document.querySelector('main');
  main.innerHTML = `
    <h2>Seu Top 10 de músicas do Spotify</h2>
    <div class="top-songs-container">
      ${topSongs
        .map(
          (song) =>
            `<div class="song-container">
              <img src="${song.imageUrl}" alt="${song.name}">
              <div>
                <h3>${song.name}</h3>
                <p>${song.artist}</p>
                <audio src="${song.previewUrl}" controls></audio>
              </div>
            </div>`
        )
        .join('')}
    </div>
  `;
} else {
  const loginContainer = document.querySelector('.login-container');
  loginContainer.style.display = 'block';
}
