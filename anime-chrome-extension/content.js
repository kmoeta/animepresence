// content.js

// raw data from site, check manifest.json for site permissions
// might have to tweak some paths for other sites
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
        title: titleEl.innerText,
        episode: episode
    };
}

function updateDiscord() {
    const data = getAnimeInfo();
    // bathground script fetch
    chrome.runtime.sendMessage({ type: "UPDATE_RPC", data: data });
}

setInterval(() => {
    const info = getAnimeInfo();
    if (info) {
        updateServer(info);
    } else {
        updateServer({ title: "", episode: "" });
    }
}, 15000);
updateDiscord();