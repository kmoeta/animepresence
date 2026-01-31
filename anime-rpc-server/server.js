const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const RPC = require('discord-rpc');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const clientId = 'YOUR_APP_ID'; // discord application id
// this houses the name and image for the application
let rpc = new RPC.Client({ transport: 'ipc' });

let currentActivity = { title: "", episode: "", startTime: null };
let lastSeen = Date.now();
let isConnected = false;

// login to discord
async function connectToDiscord() {
    try {
        // replace old client if exists
        if (rpc) {
            try { await rpc.destroy(); } catch (e) {}
            rpc = new RPC.Client({ transport: 'ipc' });
            setupRpcEvents();
        }
        await rpc.login({ clientId });
        isConnected = true;
        console.log('Successfully connected to Discord');
    } catch (err) {
        isConnected = false;
        console.error('Discord login failed. Retrying in 15s...');
        setTimeout(connectToDiscord, 15000);
    }
}

function setupRpcEvents() {
    rpc.on('ready', () => {
        console.log('Discord RPC started and ready.');
        isConnected = true;
    });

    rpc.on('disconnected', () => {
        isConnected = false;
        console.log('Disconnected from Discord. Attempting reconnect...');
        connectToDiscord();
    });
}

// prevent rpc disconnect
process.on('unhandledRejection', (reason) => {
    console.log('Caught and suppressed error:', reason.message || reason);
});

// heartbeat, checking for no anime
setInterval(() => {
    if (!isConnected) return;

    const now = Date.now();
    const secondsSinceLastUpdate = (now - lastSeen) / 1000;

    if (secondsSinceLastUpdate > 40 && currentActivity.title !== "IDLE_STATE") {
        console.log(`No signal for ${secondsSinceLastUpdate}s. Setting Idle status.`);
        
        rpc.setActivity({
            details: "Kitauji.. Fighto~!", // custom messge
            largeImageKey: 'anime_logo', 
            // custom images in application, not sure if this works. name should match up with the image
            // in the application portal
            instance: false
        }).catch(() => { isConnected = false; });

        currentActivity = { title: "IDLE_STATE", episode: "", startTime: null };
    }
}, 10000);

// post update 
app.post('/update-presence', async (req, res) => {
    lastSeen = Date.now();
    
    if (!isConnected) {
        return res.status(503).send({ status: 'Discord not ready' });
    }

    let { title, episode } = req.body;

    if (!title || title === "") {
        if (currentActivity.title !== "IDLE_STATE") {
            rpc.setActivity({
                details: "Kitauji.. Fighto~!", // custom message
                largeImageKey: 'anime_logo', // same as above
                instance: false
            }).catch(() => { isConnected = false; });
            currentActivity = { title: "IDLE_STATE", episode: "", startTime: null };
        }
        return res.send({ status: 'idle' });
    }

    let cleanTitle = title.replace(/\bWatching\b|\bWatch\b|English Sub\/Dub|online Free|on HiAnime\.to/gi, '').trim();
    // removes extra shit from title, only works with hianime but can be tweaked
    // not sure if this works with other sites, wmight have to tweak plugin

    if (currentActivity.title !== cleanTitle || currentActivity.episode !== episode) { // getting clean link from anilist
        let aniListUrl = `https://anilist.co/search/anime?search=${encodeURIComponent(cleanTitle)}`;
        
        const query = `query ($search: String) { Media (search: $search, type: ANIME) { siteUrl } }`;
        try {
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables: { search: cleanTitle } })
            });
            const data = await response.json();
            if (data.data && data.data.Media) {
                aniListUrl = data.data.Media.siteUrl;
            }
        } catch (err) {
            console.log("AniList API error.");
        }

        console.log(`Updating Discord: ${cleanTitle} Ep ${episode}`);
        
        rpc.setActivity({
            details: `Watching ${cleanTitle}`,
            state: `Episode ${episode}`,
            startTimestamp: currentActivity.startTime || new Date(),
            largeImageKey: 'anime_logo', // same as above
            instance: false,
            buttons: [{ label: "View on AniList", url: aniListUrl }] // adds a button for other users to open on anilist
        }).catch(() => { isConnected = false; });
        
        currentActivity = { title: cleanTitle, episode, startTime: currentActivity.startTime || new Date() };
    }
    res.send({ status: 'ok' });
});

// connection attempt
connectToDiscord();

// local run

app.listen(3000, () => console.log('Server running on port 3000'));
