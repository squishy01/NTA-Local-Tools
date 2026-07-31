// ==UserScript==
// @name         NTA sabscript local version
// @namespace    https://www.kingsofchaos.com/
// @version      3.12
// @description  Reads KoC player/target stats and logs them.
// @author       ChatGPT
// @match        https://www.kingsofchaos.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Raw lookup mappings
    const rawLookupTables = {
        siege: { "None": 0, "Flaming Arrows": 1, "Ballistas": 2, "Battering Ram": 3, "Ladders": 4, "Trojan Horse": 5, "Catapults": 6, "War Elephants": 7, "Siege Towers": 8, "Trebuchets": 9, "Black Powder": 10, "Sappers": 11, "Dynamite": 12, "Greek Fire": 13, "Cannons": 14, "Great Horn": 15, "Fists of Thor": 16, "Ringwraiths": 17, "Saurons Ring": 18, "Morgoth": 19 },
        fortification: { "Camp": 0, "Stockade": 1, "Rabid Pitbulls": 2, "Walled Town": 3, "Towers": 4, "Battlements": 5, "Portcullis": 6, "Boiling Oil": 7, "Trenches": 8, "Moat": 9, "Drawbridge": 10, "Fortress": 11, "Stronghold": 12, "Palace": 13, "Keep": 14, "Citadel": 15, "Hand of God": 16, "Gates of Hell": 17, "Titans Shield": 18, "Hancock": 19 },
        economy: { "None": 0, "Hunting": 1, "Farming": 2, "Fishing": 3, "Mining": 4, "Construction": 5, "SpiceTrade": 6, "Spice Trade": 6, "Feudal": 7, "Trade": 8, "Exploration": 9, "Masonry": 10, "Imperial": 11, "Urbanization": 12, "Mercantile": 13, "PortTrade": 14, "Port Trade": 14, "Plantation": 15, "Manufacturing": 16, "Industrial": 17 },
        technology: { "None": 0, "Spear": 1, "Fire": 2, "Oven": 3, "Pottery": 4, "Domestication": 5, "Copper": 6, "Wheel": 7, "Writing": 8, "Bronze": 9, "Irrigation": 10, "Woodworking": 11, "Archery": 12, "Salt": 13, "Sailing": 14, "Masonry": 15, "Forum": 16, "Furnace": 17, "Ironworking": 18, "Library": 19, "Medicine": 20, "Timekeeping": 21, "Market": 22, "Monastery": 23, "Windmill": 24, "Printing": 25, "Civil Code": 26, "Shipbuilding": 27, "Astronomy": 28, "Chemistry": 29, "Gunpowder": 30, "Economics": 31, "Cotton Gin": 32, "Ballistics": 33, "Metallurgy": 34, "Laboratory": 35, "Mechanics": 36, "Textiles": 37, "Thermodynamics": 38, "Steam Engine": 39, "Assembly Line": 40, "Electricity": 41, "Cooking": 42, "Obi Bon Kenobi": 43 }
    };

    // Helper: normalize keys (lowercase & strip all spaces/punctuation)
    const normalizeKey = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Pre-normalize all lookup tables once at startup
    const lookupTables = {};
    for (const category in rawLookupTables) {
        lookupTables[category] = {};
        for (const label in rawLookupTables[category]) {
            lookupTables[category][normalizeKey(label)] = rawLookupTables[category][label];
        }
    }

    const statsToTrack = {
        spy: ["spy", "spy rating"],
        strike: ["strike", "strike action"],
        defense: ["defense", "defensive action"],
        sentry: ["sentry", "sentry rating"],
        poison: ["poison", "poison rating"],
        antidote: ["antidote", "antidote rating"],
        theft: ["theft", "theft rating"],
        vigilance: ["vigilance", "vigilance rating"],
        spy_lvl: ["covert", "covert level", "covert skill"],
        sentry_lvl: ["sentry skill", "sentry level"],
        poison_lvl: ["toxic infusion level", "poison level"],
        antidote_lvl: ["antidote level", "viperbane vigilance level"],
        theft_lvl: ["theft level", "shadowmeld level"],
        vigilance_lvl: ["vigilance level", "sentinel vigil level"],
        spies: ["spies", "covert spies"],
        sentries: ["sentries"],
        vweavers: ["venomweavers"],
        swardens: ["serpentwardens"],
        thieves: ["thieves"],
        rangers: ["rangers"],
        tech: ["technology"],
        siege: ["siege", "siege technology"],
        fort: ["fortification"],
        econ: ["economy"]
    };

    // Pre-build reverse lookup table mapping normalized labels to key & optional table type
    const statLookup = {};
    for (const key in statsToTrack) {
        for (const label of statsToTrack[key]) {
            statLookup[normalizeKey(label)] = key;
        }
    }

    function cleanName(name) {
        return name.trim().replace(/['’]s$/i, "");
    }

    function extractId(url) {
        if (!url) return null;
        const match = url.match(/stats\.php\?id=(\d+)/);
        return match ? Number(match[1]) : null;
    }

    function normalizeValue(value) {
        const trimmed = value.trim();
        if (trimmed === "??" || trimmed === "???") return null;
        return Number(trimmed.replace(/,/g, ""));
    }

    // Single-pass server time extractor
    function getServerTimestamp() {
        const ths = document.getElementsByTagName("th");
        for (let i = 0; i < ths.length; i++) {
            if (ths[i].textContent.trim().toLowerCase() === "server time") {
                const table = ths[i].closest("table");
                const nextTable = table?.nextElementSibling;
                if (nextTable && nextTable.tagName === "TABLE") {
                    const timestamp = nextTable.querySelector("th");
                    if (timestamp) return timestamp.textContent.trim();
                }
            }
        }
        return null;
    }

    function extractStats() {
        const path = window.location.pathname.toLowerCase();
        const isTarget = path.includes("stats.php") || path.includes("inteldetail.php") || path.includes("attack.php");
        const prefix = isTarget ? "target" : "user";
        const output = {};

        // Cache server time once for the whole extraction process
        const cachedServerTime = getServerTimestamp();

        // Check URL parameters for IDs
        if (path.includes("inteldetail.php")) {
            const reportMatch = window.location.href.match(/report_id=(\d+)/);
            if (reportMatch) output[`${prefix}_report_id`] = Number(reportMatch[1]);
        }
        
        const pageId = extractId(window.location.href);
        if (pageId) output[`${prefix}_id`] = pageId;

        // Single DOM loop over all table rows
        const rows = document.querySelectorAll("tr");

        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].children;
            if (cells.length < 2 || cells.length > 3) continue;

            const rawLabel = cells[0].textContent.trim();
            const normLabel = normalizeKey(rawLabel);

            // Handle player name / ID from profile table
            if (normLabel === "name" && !output[`${prefix}_name`]) {
                const link = cells[1].querySelector("a");
                output[`${prefix}_name`] = cleanName(link ? link.textContent : cells[1].textContent);
                
                const linkId = extractId(link?.href);
                if (linkId) output[`${prefix}_id`] = linkId;
                continue;
            }

            // Stat processing
            const statKey = statLookup[normLabel];
            if (!statKey || output[`${prefix}_${statKey}`] !== undefined) continue;

            const rawVal = cells[1].textContent.trim();
            let parsedVal;

            // Check if stat corresponds to an enum lookup table
            const lookupCategory = statKey === "tech" ? "technology" 
                                  : statKey === "siege" ? "siege" 
                                  : statKey === "fort" ? "fortification" 
                                  : statKey === "econ" ? "economy" : null;

            if (lookupCategory) {
                parsedVal = lookupTables[lookupCategory][normalizeKey(rawVal)];
                if (parsedVal === undefined) continue;
            } else {
                parsedVal = normalizeValue(rawVal);
                if (parsedVal === null) continue;
            }

            // Determine row timestamp
            let timestamp = null;
            if (cells.length === 3 && (normLabel.includes("rating") || normLabel.includes("action"))) {
                timestamp = cells[2].textContent.trim() || cachedServerTime;
            } else {
                timestamp = cachedServerTime;
            }

            output[`${prefix}_${statKey}`] = parsedVal;
            output[`${prefix}_${statKey}_timestamp`] = timestamp || null;
        }

        console.log("Extracted Data:", output);
        return output;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", extractStats);
    } else {
        extractStats();
    }
})();
