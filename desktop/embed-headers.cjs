// Desktop WebViews must identify themselves to the YouTube embedded player.
// https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity
module.exports = function embedHeaders(details) {
  const headers = { ...details.requestHeaders };
  const url = new URL(details.url);
  if (['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) && url.pathname.startsWith('/embed/')) {
    const key = Object.keys(headers).find(key => key.toLowerCase() === 'referer');
    if (!key || !/^https?:\/\//i.test(headers[key])) {
      if (key) delete headers[key];
      headers.Referer = 'https://studio.threadline.app/';
    }
  }
  return headers;
};
