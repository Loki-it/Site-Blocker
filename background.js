let blockedSites = [];

chrome.storage.sync.get(['blockedSites'], function(result) {
  if (result.blockedSites) {
    blockedSites = result.blockedSites;
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    const url = new URL(details.url);
    const domain = url.hostname;
    
    for (const site of blockedSites) {
      if (domain.includes(site) || site.includes(domain)) {
        return {redirectUrl: chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}`)};
      }
    }
    return {cancel: false};
  },
  {urls: ["<all_urls>"]},
  ["blocking"]
);

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (changes.blockedSites) {
    blockedSites = changes.blockedSites.newValue;
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "updateRules") {
    chrome.storage.sync.get(['blockedSites'], function(result) {
      blockedSites = result.blockedSites || [];
      sendResponse({status: "complete"});
    });
    return true;
  }
});
