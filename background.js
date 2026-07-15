const REDIRECT_URL = chrome.runtime.getURL('blocked.html');

async function rebuildRules() {
  const { blockedSites = [] } = await chrome.storage.sync.get(['blockedSites']);

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(r => r.id);

  const newRules = blockedSites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        url: REDIRECT_URL + '?url=' + encodeURIComponent('https://' + site)
      }
    },
    condition: {
      urlFilter: `||${site}`,
      resourceTypes: ['main_frame']
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules
  });
}

chrome.runtime.onStartup.addListener(rebuildRules);
chrome.runtime.onInstalled.addListener(rebuildRules);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateRules') {
    rebuildRules().then(() => sendResponse({ status: 'complete' }));
    return true;
  }
});
