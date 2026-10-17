// Independently maintained, best-effort selectors. No remote selector downloads.
(() => {
 const adapters={
  youtubeShorts:['youtube.com','ytd-reel-shelf-renderer, ytd-reel-video-renderer, ytd-rich-section-renderer:has(a[href^="/shorts/"]), a[href^="/shorts/"]'],
  youtubeRecommendations:['youtube.com','#related, ytd-browse[page-subtype="home"] ytd-rich-grid-renderer, .ytp-endscreen-content'],
  youtubeComments:['youtube.com','ytd-comments, #comments'],
  instagramReels:['instagram.com','a[href^="/reels/"], a[href^="/reel/"]'],
  facebookReels:['facebook.com','a[href^="/reel/"], a[href^="/reels/"]'],
  xTrends:['x.com','[data-testid="trend"], [aria-label="Timeline: Trending now"]'],
  tiktokRecommendations:['tiktok.com','[data-e2e="recommend-list-item-container"], [data-e2e="recommend-list-item"]']
 };
 globalThis.OpenStayDistractions={css(host,toggles){return Object.entries(adapters).filter(([key,[domain]])=>toggles[key]&&(host===domain||host.endsWith(`.${domain}`))).map(([, [,selectors]])=>`${selectors} { display: none !important; }`).join('\n');}};
})();
