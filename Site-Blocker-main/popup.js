document.addEventListener('DOMContentLoaded', function () {
  const siteInput = document.getElementById('site-input');
  const addBtn = document.getElementById('add-btn');
  const blockedList = document.getElementById('blocked-list');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importExportArea = document.getElementById('import-export-area');
  const toggleBlockBtn = document.getElementById('toggle-block-btn');

  loadAndRenderBlockedSites();

  addBtn.addEventListener('click', async function () {
    let site = siteInput.value.trim();
    if (!site) return;

    site = site.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

    const { blockedSites: sites = [] } = await chrome.storage.sync.get(['blockedSites']);

    if (!sites.some(s => s.toLowerCase() === site.toLowerCase())) {
      sites.push(site);
      await saveAndRenderBlockedSites(sites);
      siteInput.value = '';
    } else {
      alert('This site is already in the blocked list!');
    }
  });

  // Allow pressing Enter in the input field to add a site
  siteInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addBtn.click();
  });

  blockedList.addEventListener('click', async function (e) {
    if (e.target.classList.contains('remove-btn')) {
      const siteToRemove = e.target.dataset.site;
      const { blockedSites = [] } = await chrome.storage.sync.get(['blockedSites']);
      const updatedSites = blockedSites.filter(site => site !== siteToRemove);
      await saveAndRenderBlockedSites(updatedSites);
    }
  });

  exportBtn.addEventListener('click', async function () {
    const { blockedSites = [] } = await chrome.storage.sync.get(['blockedSites']);
    importExportArea.value = JSON.stringify(blockedSites, null, 2);
  });

  importBtn.addEventListener('click', async function () {
    try {
      const sites = JSON.parse(importExportArea.value);
      if (Array.isArray(sites)) {
        await saveAndRenderBlockedSites(sites);
        importExportArea.value = 'List imported successfully!';
      } else {
        importExportArea.value = 'Error: Must be an array of sites';
      }
    } catch (e) {
      importExportArea.value = 'Error: Invalid JSON format';
    }
  });

  toggleBlockBtn.addEventListener('click', async function () {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    let currentSite;
    try {
      currentSite = new URL(tab.url).hostname;
    } catch {
      return;
    }

    const { blockedSites: sites = [] } = await chrome.storage.sync.get(['blockedSites']);
    const isBlocked = sites.some(s => s.toLowerCase() === currentSite.toLowerCase());

    let updatedSites;
    if (isBlocked) {
      updatedSites = sites.filter(s => s.toLowerCase() !== currentSite.toLowerCase());
      await saveAndRenderBlockedSites(updatedSites);
      // Reload the tab after unblocking so the user can navigate away
      await chrome.tabs.reload(tab.id);
    } else {
      updatedSites = [...sites, currentSite];
      await saveAndRenderBlockedSites(updatedSites);
    }
  });

  async function updateToggleButton() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    let currentSite;
    try {
      currentSite = new URL(tab.url).hostname;
    } catch {
      return;
    }

    const { blockedSites: sites = [] } = await chrome.storage.sync.get(['blockedSites']);
    const isBlocked = sites.some(s => s.toLowerCase() === currentSite.toLowerCase());

    if (isBlocked) {
      toggleBlockBtn.textContent = 'Unblock current site';
      toggleBlockBtn.classList.add('unblock');
    } else {
      toggleBlockBtn.textContent = 'Block current site';
      toggleBlockBtn.classList.remove('unblock');
    }
  }

  async function loadAndRenderBlockedSites() {
    const { blockedSites = [] } = await chrome.storage.sync.get(['blockedSites']);
    renderBlockedList(blockedSites);
    await updateToggleButton();
  }

  async function saveAndRenderBlockedSites(sites) {
    await chrome.storage.sync.set({ blockedSites: sites });
    renderBlockedList(sites);
    await updateToggleButton();
    chrome.runtime.sendMessage({ action: 'updateRules' }).catch(() => {});
  }

  function renderBlockedList(sites) {
    blockedList.innerHTML = '';

    if (sites.length === 0) {
      blockedList.innerHTML = '<li class="empty-message">No sites blocked</li>';
      return;
    }

    sites.forEach(site => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="site-name">${site}</span>
        <button class="remove-btn" data-site="${site}">Remove</button>
      `;
      blockedList.appendChild(li);
    });
  }
});
