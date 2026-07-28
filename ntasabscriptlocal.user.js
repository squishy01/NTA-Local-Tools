// ==UserScript==
// @name         NTA sabscript local version
// @namespace    https://www.kingsofchaos.com/
// @version      3.9
// @description  Reads KoC player/target stats and logs them.
// @author       ChatGPT
// @match        https://www.kingsofchaos.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const statsToTrack = {
        spy: [
            "spy",
            "spy rating"
        ],
        strike: [
            "strike",
            "strike action"
        ],
        defense: [
            "defense",
            "defensive action"
        ],
        sentry: [
            "sentry",
            "sentry rating"
        ],
        poison: [
            "poison",
            "poison rating"
        ],
        antidote: [
            "antidote",
            "antidote rating"
        ],
        theft: [
            "theft",
            "theft rating"
        ],
        vigilance: [
            "vigilance",
            "vigilance rating"
        ]
    };

    function normalizeValue(value) {
        value = value.trim();

        if (value === "??" || value === "???") {
            return null;
        }

        return Number(value.replace(/,/g, ""));
    }

    function getServerTimestamp() {
        const ths = document.querySelectorAll("th");

        for (const th of ths) {
            if (th.textContent.trim().toLowerCase() === "server time") {

                const table = th.closest("table");

                if (!table) return null;

                let next = table.nextElementSibling;

                while (next) {
                    if (next.tagName === "TABLE") {

                        const timestamp = next.querySelector("th");

                        if (timestamp) {
                            return timestamp.textContent.trim();
                        }
                    }

                    next = next.nextElementSibling;
                }
            }
        }

        return null;
    }

    function getPlayerInfo(prefix) {
        let name = null;
        let id = null;

        const rows = document.querySelectorAll("tr");

        for (const row of rows) {

            const cells = row.querySelectorAll("td");

            if (cells.length < 2) continue;

            const label = cells[0].textContent
                .trim()
                .toLowerCase()
                .replace(":", "");

            if (label !== "name") continue;

            const valueCell = cells[1];

            const link = valueCell.querySelector("a");

            if (link) {
                name = link.textContent.trim();

                const match = link.href.match(/stats\.php\?id=(\d+)/);

                if (match) {
                    id = Number(match[1]);
                }
            } else {
                name = valueCell.textContent.trim();
            }

            // FIRST Name row only
            break;
        }

        // No link means this is the player's own stats page
        if (!id) {

            const match = window.location.href.match(/stats\.php\?id=(\d+)/);

            if (match) {
                id = Number(match[1]);
            }
        }

        const output = {};

        if (name) {
            output[`${prefix}_name`] = name;
        }

        if (id) {
            output[`${prefix}_id`] = id;
        }

        return output;
    }

    function extractStats() {

        // stats.php = target
        // everything else = user
        const isTarget = window.location.pathname
            .toLowerCase()
            .includes("stats.php");

        const prefix = isTarget ? "target" : "user";

        const output = {};

        Object.assign(output, getPlayerInfo(prefix));

        const rows = document.querySelectorAll("tr");

        for (const row of rows) {

            const cells = row.querySelectorAll("td");

            // Stat rows require exactly 3 td cells
            if (cells.length !== 3) continue;

            const label = cells[0].textContent
                .trim()
                .toLowerCase()
                .replace(":", "");

            let statKey = null;

            for (const key in statsToTrack) {

                if (statsToTrack[key].includes(label)) {
                    statKey = key;
                    break;
                }
            }

            if (!statKey) continue;

            // First occurrence wins
            if (output[`${prefix}_${statKey}`] !== undefined) {
                continue;
            }

            const value = normalizeValue(cells[1].textContent);

            // Skip ?? / ???
            if (value === null) {
                continue;
            }

            let timestamp = null;

            if (
                label.includes("rating") ||
                label.includes("action")
            ) {

                timestamp = cells[2].textContent.trim();

                if (!timestamp) {
                    timestamp = getServerTimestamp();
                }

            } else {

                timestamp = getServerTimestamp();

            }

            output[`${prefix}_${statKey}`] = value;
            output[`${prefix}_${statKey}_timestamp`] = timestamp || null;
        }

        console.log(output);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            extractStats
        );
    } else {
        extractStats();
    }

})();
