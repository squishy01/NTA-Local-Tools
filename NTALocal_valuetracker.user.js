// ==UserScript==
// @name         NTA Local Tools - Value Tracker
// @namespace    https://www.kingsofchaos.com/
// @version      1.1.1
// @description  Tracks and displays KoC player wealth values.
// @match        https://www.kingsofchaos.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
    'use strict';

    // ==================================================
    // CONFIGURATION & UPDATE LINKS
    // ==================================================
    const INSTALLED_VERSION = (typeof GM_info !== "undefined" && GM_info.script)
        ? GM_info.script.version
        : "1.0.0";

    const CONFIG_URL = "https://raw.githubusercontent.com/squishy01/NTA-Local-Tools/refs/heads/main/NTAlocal_config.json";
    const UPDATE_URL = "https://github.com/squishy01/NTA-Local-Tools/raw/refs/heads/main/NTALocal_valuetracker.user.js";

    const STORAGE_KEY = "koc_wealth_tracker";
    const SETTINGS_KEY = "koc_wealth_view_settings";

    let isUpdateAvailable = false;
    let remoteVersionStr = "";

    // Helper: Safely fetch parsed JSON from LocalStorage
    function getStoredData(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || {};
        } catch (e) {
            console.error(`Error loading key "${key}" from localStorage`, e);
            return {};
        }
    }

    // Helper: Safely save data to LocalStorage
    function setStoredData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error saving key "${key}" to localStorage`, e);
        }
    }

    function cleanNumber(value) {
        return Number(value.replace(/[(),\s]/g, ''));
    }

    function formatElapsed(timestamp) {
        if (!timestamp) return "";

        const stored = new Date(timestamp.replace(" ", "T"));
        const now = new Date();
        let seconds = Math.floor((now - stored) / 1000);

        if (isNaN(seconds) || seconds < 0) seconds = 0;

        const days = Math.floor(seconds / 86400);
        seconds %= 86400;

        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;

        const minutes = Math.floor(seconds / 60);
        seconds %= 60;

        let result = "";
        if (days) result += days + "d ";
        if (hours || days) result += hours + "h ";
        if (minutes || hours || days) result += minutes + "m ";
        result += seconds + "s";

        return result;
    }

    // ==================================================
    // VERSION CHECKER
    // ==================================================

    function compareVersions(v1, v2) {
        if (!v1 || !v2) return 0;
        const clean = (v) => String(v).trim().replace(/^v/i, '').replace(/["']/g, '');
        const p1 = clean(v1).split('.').map(Number);
        const p2 = clean(v2).split('.').map(Number);

        const len = Math.max(p1.length, p2.length);
        for (let i = 0; i < len; i++) {
            const num1 = p1[i] || 0;
            const num2 = p2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    }

    function showUpdateIndicator() {
        const btn = document.getElementById("kocViewerBtn");
        if (btn && !document.getElementById("kocUpdateBadge")) {
            const badge = document.createElement("span");
            badge.id = "kocUpdateBadge";
            badge.textContent = " [Update Available!]";
            badge.style.color = "#ff4d4d";
            badge.style.fontWeight = "bold";
            btn.appendChild(badge);
        }

        const headerH2 = document.querySelector("#kocViewer .koc-header h2");
        if (headerH2 && !document.getElementById("kocHeaderUpdateLink")) {
            const updateLink = document.createElement("a");
            updateLink.id = "kocHeaderUpdateLink";
            updateLink.href = UPDATE_URL;
            updateLink.target = "_blank";
            updateLink.textContent = `Update Available (v${remoteVersionStr})`;
            updateLink.style.cssText = "color:#ff4d4d;font-weight:bold;text-decoration:underline;margin-left:15px;";
            headerH2.appendChild(updateLink);
        }
    }

    function checkVersion() {
        if (typeof GM_xmlhttpRequest === "undefined") return;

        GM_xmlhttpRequest({
            method: "GET",
            url: CONFIG_URL,
            headers: { "Cache-Control": "no-cache" },
            onload: function (response) {
                try {
                    const config = JSON.parse(response.responseText);
                    const remoteVersion = config?.version?.value_tracker;

                    if (remoteVersion && compareVersions(remoteVersion, INSTALLED_VERSION) > 0) {
                        isUpdateAvailable = true;
                        remoteVersionStr = String(remoteVersion).trim();
                        showUpdateIndicator();
                    }
                } catch (err) {
                    console.error("Failed to parse NTA remote config JSON", err);
                }
            }
        });
    }

    // ==================================================
    // TRACK CURRENT TARGET
    // ==================================================

    function trackTarget() {
        const statsLink = document.querySelector('a[href^="stats.php?id="]');
        if (!statsLink) return;

        const idMatch = statsLink.href.match(/id=(\d+)/);
        if (!idMatch) return;

        const targetId = idMatch[1];
        const pageText = document.body.innerText;

        const invested = pageText.match(/Total Invested Value:\s*\(?([\d,]+)\)?/i);
        const sell = pageText.match(/Total Sell Value:\s*\(?([\d,]+)\)?/i);
        const sabcap = pageText.match(/Maximum Daily Sabotage loss:\s*\(?([\d,]+)\)?/i);
        const timestamp = pageText.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/);

        if (!invested && !sell && !sabcap) return;

        const db = getStoredData(STORAGE_KEY);
        db[targetId] = {
            ...(db[targetId] || {}),
            target: statsLink.textContent.trim(),
            ...(invested && { target_value: cleanNumber(invested[1]) }),
            ...(sell && { target_sell: cleanNumber(sell[1]) }),
            ...(sabcap && { target_sabcap: cleanNumber(sabcap[1]) }),
            ...(timestamp && { koc_timestamp: timestamp[0] })
        };

        setStoredData(STORAGE_KEY, db);
        console.log("Updated target:", targetId, db[targetId]);
    }

    // ==================================================
    // BUTTON
    // ==================================================

    function createButton() {
        const btn = document.createElement("button");
        btn.id = "kocViewerBtn";
        btn.textContent = "View KoC Player Values";
        btn.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 99999;
            padding: 10px 15px;
            background: #222;
            color: white;
            border: 1px solid #555;
            border-radius: 6px;
            cursor: pointer;
        `;

        btn.onclick = openViewer;
        document.body.appendChild(btn);

        if (isUpdateAvailable) {
            showUpdateIndicator();
        }
    }

    // ==================================================
    // VIEWER
    // ==================================================

    function openViewer() {
        if (document.getElementById("kocViewer")) return;

        let settings = getStoredData(SETTINGS_KEY);

        const overlay = document.createElement("div");
        overlay.id = "kocViewer";
        overlay.innerHTML = `
        <div class="koc-box">
            <div class="koc-header">
                <h2>
                    KoC Player Wealth
                    ${isUpdateAvailable ? `<a id="kocHeaderUpdateLink" href="${UPDATE_URL}" target="_blank" style="color:#ff4d4d;font-weight:bold;text-decoration:underline;margin-left:15px;">Update Available (v${remoteVersionStr})</a>` : ''}
                </h2>
                <button id="kocClose">X</button>
            </div>
            <div class="koc-controls">
                <input id="kocSearch" placeholder="Search name or ID">
                <select id="kocSort">
                    <option value="invested">Sort: Invested</option>
                    <option value="name">Sort: Name</option>
                    <option value="id">Sort: ID</option>
                </select>
                <button id="kocDirection">Sort Direction</button>
                <button id="kocRefresh">Refresh List</button>
                <button id="kocExport">Export</button>
                <button id="kocImport">Import</button>
                <input id="kocImportFile" type="file" accept=".json" style="display:none">
                <select id="kocLimit">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Invested</th>
                        <th>Sell</th>
                        <th>Sab Cap</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody id="kocRows"></tbody>
            </table>
            <div class="koc-pages">
                <button id="kocPrev">Previous</button>
                <span id="kocPage"></span>
                <button id="kocNext">Next</button>
            </div>
        </div>
        `;

        document.body.appendChild(overlay);

        const style = document.createElement("style");
        style.id = "kocViewerStyles";
        style.textContent = `
        #kocViewer {
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.7);
            z-index:99998;
            display:flex;
            justify-content:center;
            align-items:center;
            font-family:Arial,sans-serif;
        }
        #kocViewer .koc-box {
            background:#111;
            color:white;
            width:90%;
            max-width:1200px;
            max-height:90vh;
            overflow:auto;
            padding:20px;
            border-radius:12px;
            box-shadow:0 0 30px black;
        }
        #kocViewer .koc-header {
            display:flex;
            justify-content:space-between;
            align-items:center;
        }
        #kocViewer .koc-controls {
            display:flex;
            flex-wrap:wrap;
            gap:10px;
            margin:15px 0;
        }
        #kocViewer input, #kocViewer select, #kocViewer button {
            padding:7px;
        }
        #kocViewer table {
            width:100%;
            border-collapse:collapse;
        }
        #kocViewer th, #kocViewer td {
            border-bottom:1px solid #444;
            padding:8px;
            text-align:center;
        }
        #kocViewer a {
            color:#66b3ff;
        }
        #kocViewer .koc-pages {
            display:flex;
            justify-content:center;
            gap:20px;
            margin-top:15px;
        }
        `;
        document.head.appendChild(style);

        const ui = {
            search: document.getElementById("kocSearch"),
            sort: document.getElementById("kocSort"),
            limit: document.getElementById("kocLimit"),
            rows: document.getElementById("kocRows"),
            pageDisplay: document.getElementById("kocPage"),
            importFile: document.getElementById("kocImportFile")
        };

        let page = 0;

        function render() {
            const db = getStoredData(STORAGE_KEY);
            let rows = Object.entries(db).map(([id, value]) => ({ id, ...value }));

            const searchVal = ui.search.value.toLowerCase().trim();
            if (searchVal) {
                rows = rows.filter(x =>
                    x.id.includes(searchVal) ||
                    (x.target || "").toLowerCase().includes(searchVal)
                );
            }

            const sortVal = ui.sort.value;
            const direction = settings.direction === "asc" ? 1 : -1;

            rows.sort((a, b) => {
                if (sortVal === "name") {
                    return (a.target || "").localeCompare(b.target || "") * direction;
                }
                if (sortVal === "id") {
                    return (Number(a.id) - Number(b.id)) * direction;
                }
                return ((a.target_value || 0) - (b.target_value || 0)) * direction;
            });

            const limit = Number(ui.limit.value) || 25;
            const totalPages = Math.max(1, Math.ceil(rows.length / limit));

            if (page >= totalPages) {
                page = totalPages - 1;
            }

            const display = rows.slice(page * limit, (page + 1) * limit);

            ui.rows.innerHTML = display.map((x, i) => `
                <tr>
                    <td>${page * limit + i + 1}</td>
                    <td>
                        <a href="https://www.kingsofchaos.com/stats.php?id=${x.id}" target="_blank">
                            ${x.target || ""}
                        </a>
                    </td>
                    <td>
                        <a href="https://www.kingsofchaos.com/attack.php?id=${x.id}" target="_blank">
                            ${x.id}
                        </a>
                    </td>
                    <td>${x.target_value ? x.target_value.toLocaleString() : ""}</td>
                    <td>${x.target_sell ? x.target_sell.toLocaleString() : ""}</td>
                    <td>${x.target_sabcap ? x.target_sabcap.toLocaleString() : ""}</td>
                    <td class="koc-time" data-time="${x.koc_timestamp || ""}">
                        ${formatElapsed(x.koc_timestamp)}
                    </td>
                </tr>
            `).join("");

            ui.pageDisplay.textContent = `${page + 1} / ${totalPages}`;
        }

        ui.rows.addEventListener("mouseover", (e) => {
            const cell = e.target.closest(".koc-time");
            if (cell && cell.dataset.time) {
                cell.textContent = cell.dataset.time;
            }
        });

        ui.rows.addEventListener("mouseout", (e) => {
            const cell = e.target.closest(".koc-time");
            if (cell && cell.dataset.time) {
                cell.textContent = formatElapsed(cell.dataset.time);
            }
        });

        function closeViewer() {
            overlay.remove();
            style.remove();
        }

        document.getElementById("kocClose").onclick = closeViewer;
        overlay.onclick = (e) => { if (e.target === overlay) closeViewer(); };

        document.getElementById("kocPrev").onclick = () => {
            if (page > 0) { page--; render(); }
        };

        document.getElementById("kocNext").onclick = () => {
            page++; render();
        };

        ui.search.value = settings.search || "";
        ui.search.oninput = (e) => {
            settings.search = e.target.value;
            setStoredData(SETTINGS_KEY, settings);
            page = 0;
            render();
        };

        ui.sort.value = settings.sort || "invested";
        ui.sort.onchange = (e) => {
            settings.sort = e.target.value;
            setStoredData(SETTINGS_KEY, settings);
            page = 0;
            render();
        };

        ui.limit.value = settings.limit || "25";
        ui.limit.onchange = (e) => {
            settings.limit = e.target.value;
            setStoredData(SETTINGS_KEY, settings);
            page = 0;
            render();
        };

        document.getElementById("kocDirection").onclick = () => {
            settings.direction = settings.direction === "asc" ? "desc" : "asc";
            setStoredData(SETTINGS_KEY, settings);
            render();
        };

        document.getElementById("kocRefresh").onclick = () => {
            page = 0;
            render();
        };

        // Export
        document.getElementById("kocExport").onclick = () => {
            const data = localStorage.getItem(STORAGE_KEY) || "{}";
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "koc_wealth_backup.json";
            link.click();
            URL.revokeObjectURL(url);
        };

        // Import
        document.getElementById("kocImport").onclick = () => {
            ui.importFile.click();
        };

        ui.importFile.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    const current = getStoredData(STORAGE_KEY);
                    const updated = { ...current, ...imported };

                    setStoredData(STORAGE_KEY, updated);
                    page = 0;
                    render();
                    alert("Import complete");
                } catch (err) {
                    alert("Invalid backup file");
                }
            };
            reader.readAsText(file);
        };

        render();
    }

    // ==================================================
    // START
    // ==================================================

    if (
        window.location.pathname.includes("/attack.php") &&
        window.location.search.includes("id=")
    ) {
        trackTarget();
    }

    createButton();
    checkVersion();
})();
