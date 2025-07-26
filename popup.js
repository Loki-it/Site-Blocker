document.addEventListener('DOMContentLoaded', function() {
  const siteInput = document.getElementById('site-input');
  const addBtn = document.getElementById('add-btn');
  const blockedList = document.getElementById('blocked-list');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importExportArea = document.getElementById('import-export-area');
  const toggleBlockBtn = document.getElementById('toggle-block-btn');
  
  loadAndRenderBlockedSites();
  
  addBtn.addEventListener('click', function() {
    const site = siteInput.value.trim();
    if (!site) return;
    
    chrome.storage.sync.get(['blockedSites'], function(result) {
      const sites = result.blockedSites || [];
      
      if (!sites.some(s => s.toLowerCase() === site.toLowerCase())) {
        sites.push(site);
        saveAndRenderBlockedSites(sites);
        siteInput.value = '';
      } else {
        alert('This site is already in the blocked list!');
      }
    });
  });
  
  blockedList.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-btn')) {
      const siteToRemove = e.target.dataset.site;
      chrome.storage.sync.get(['blockedSites'], function(result) {
        const updatedSites = (result.blockedSites || []).filter(site => site !== siteToRemove);
        saveAndRenderBlockedSites(updatedSites);
      });
    }
  });
  
  exportBtn.addEventListener('click', function() {
    chrome.storage.sync.get(['blockedSites'], function(result) {
      importExportArea.value = JSON.stringify(result.blockedSites || [], null, 2);
    });
  });
  
  importBtn.addEventListener('click', function() {
    try {
      const sites = JSON.parse(importExportArea.value);
      if (Array.isArray(sites)) {
        saveAndRenderBlockedSites(sites);
        importExportArea.value = 'List imported successfully!';
      } else {
        importExportArea.value = 'Error: Must be an array of sites';
      }
    } catch (e) {
      importExportArea.value = 'Error: Invalid JSON format';
    }
  });

  toggleBlockBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
        const currentSite = url.hostname;
        
        chrome.storage.sync.get(['blockedSites'], function(result) {
          let sites = result.blockedSites || [];
          const isBlocked = sites.some(s => s.toLowerCase() === currentSite.toLowerCase());
          
          if (isBlocked) {
            sites = sites.filter(s => s.toLowerCase() !== currentSite.toLowerCase());
            saveAndRenderBlockedSites(sites, () => {
              chrome.runtime.sendMessage({action: "updateRules"}, () => {
                chrome.tabs.reload(tabs[0].id);
              });
            });
          } else {
            sites.push(currentSite);
            saveAndRenderBlockedSites(sites, () => {
              chrome.runtime.sendMessage({action: "updateRules"});
            });
          }
        });
      }
    });
  });
  
  function updateToggleButton() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
        const currentSite = url.hostname;
        
        chrome.storage.sync.get(['blockedSites'], function(result) {
          const sites = result.blockedSites || [];
          const isBlocked = sites.some(s => s.toLowerCase() === currentSite.toLowerCase());
          
          if (isBlocked) {
            toggleBlockBtn.textContent = 'Unblock current site';
            toggleBlockBtn.classList.add('unblock');
          } else {
            toggleBlockBtn.textContent = 'Block current site';
            toggleBlockBtn.classList.remove('unblock');
          }
        });
      }
    });
  }
  
  function loadAndRenderBlockedSites() {
    chrome.storage.sync.get(['blockedSites'], function(result) {
      renderBlockedList(result.blockedSites || []);
      updateToggleButton();
    });
  }
  
  function saveAndRenderBlockedSites(sites, callback) {
    chrome.storage.sync.set({blockedSites: sites}, function() {
      renderBlockedList(sites);
      if (callback) {
        callback();
      }
    });
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
