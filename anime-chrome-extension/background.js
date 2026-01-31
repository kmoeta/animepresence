setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes("hianime.to")) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: getAnimeInfo // calls from content.js
            }, (results) => {
                if (results && results[0] && results[0].result) {
                    const info = results[0].result;
                    
                    // only send to server if a title AND a real episode number
                    if (info.title && info.episode && info.episode !== "Watching") {
                        fetch('http://localhost:3000/update-presence', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(info)
                        }).catch(err => console.log("Server off"));
                    }
                }
            });
        }
    });
}, 2000);

// placeholder  needed if using executeScript
function getAnimeInfo() {
    const titleEl = document.querySelector('.film-name.dynamic-name') || document.querySelector('.breadcrumb-item.active');
    const epEl = document.querySelector('.raw-name');
    const activeEp = document.querySelector('.ssl-item.ep-item.active');

    let episode = "";
    if (epEl) {
        episode = epEl.innerText.replace(/[^0-9]/g, '');
    } else if (activeEp) {
        episode = activeEp.getAttribute('data-number') || activeEp.innerText.replace(/[^0-9]/g, '');
    }

    if (!titleEl || !episode) return null;


return {
    // cleaning here as well, partial clean
    title: titleEl.innerText.replace(/\bWatching\b|\bWatch\b|English Sub\/Dub/gi, '').trim(),
    episode: episode
};
}