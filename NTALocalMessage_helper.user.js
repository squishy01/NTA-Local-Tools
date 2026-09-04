// ==UserScript==
// @name         NTA Local Tools - Message Helper
// @namespace    https://www.kingsofchaos.com/
// @version      1.1.0
// @description  KoC Message Helper
// @match        https://www.kingsofchaos.com/writemail.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
    'use strict';

    // ==================================================
// UPDATE CHECKER
// ==================================================

const INSTALLED_VERSION =
    (typeof GM_info !== 'undefined' && GM_info.script)
        ? GM_info.script.version
        : '1.0.0';

const CONFIG_URL =
    'https://raw.githubusercontent.com/squishy01/NTA-Local-Tools/refs/heads/main/NTAlocal_config.json';

const UPDATE_URL =
    'https://github.com/squishy01/NTA-Local-Tools/raw/refs/heads/main/NTALocalMessage_helper.user.js';

let isUpdateAvailable = false;
let remoteVersionStr = '';

function compareVersions(v1, v2) {
    if (!v1 || !v2) {
        return 0;
    }

    const clean = (v) =>
        String(v)
            .trim()
            .replace(/^v/i, '')
            .replace(/["']/g, '');

    const p1 = clean(v1)
        .split('.')
        .map(Number);

    const p2 = clean(v2)
        .split('.')
        .map(Number);

    const len =
        Math.max(p1.length, p2.length);

    for (let i = 0; i < len; i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;

        if (num1 > num2) {
            return 1;
        }

        if (num1 < num2) {
            return -1;
        }
    }

    return 0;
}

function showUpdateIndicator() {
    const title =
        document.querySelector(
            '#ntaRecruitHelper .rh-title'
        );

    if (
        !title ||
        document.querySelector(
            '#ntaMessageHelperUpdate'
        )
    ) {
        return;
    }

    const updateLink =
        document.createElement('a');

    updateLink.id =
        'ntaMessageHelperUpdate';

    updateLink.href =
        UPDATE_URL;

    updateLink.target =
        '_blank';

    updateLink.textContent =
        `Update Available (v${remoteVersionStr})`;

    updateLink.style.cssText = `
        color: #ff4d4d;
        font-weight: bold;
        text-decoration: underline;
        margin-left: 12px;
    `;

    title.appendChild(updateLink);
}

function checkVersion() {
    if (
        typeof GM_xmlhttpRequest ===
        'undefined'
    ) {
        return;
    }

    GM_xmlhttpRequest({
        method: 'GET',

        url: CONFIG_URL,

        headers: {
            'Cache-Control': 'no-cache'
        },

        onload: function (response) {
            try {
                const config =
                    JSON.parse(
                        response.responseText
                    );

                const remoteVersion =
                    config?.version
                        ?.message_helper;

                if (
                    remoteVersion &&
                    compareVersions(
                        remoteVersion,
                        INSTALLED_VERSION
                    ) > 0
                ) {
                    isUpdateAvailable =
                        true;

                    remoteVersionStr =
                        String(
                            remoteVersion
                        ).trim();

                    showUpdateIndicator();
                }
            } catch (error) {
                console.error(
                    'NTA Message Helper: Failed to parse remote config JSON',
                    error
                );
            }
        },

        onerror: function (error) {
            console.error(
                'NTA Message Helper: Update check failed',
                error
            );
        }
    });
}

    const MESSAGE_STORAGE = 'koc_recruit_helper_messages';
    const AUTOFILL_STORAGE = 'nta_recruit_helper_autofill';
    const PREFILL_STORAGE = 'nta_recruit_helper_prefill';

    const NAME_TOKEN = '{name}';
    const DISCORD_TOKEN = '{discord}';
    const DISCORD_INVITE = 'https://discord.gg/aJx6FGnAqS';

    function getMessageBox() {
        return document.querySelector('#message');
    }

    function getRecruitName() {
        const headers = document.querySelectorAll('th');

        for (const th of headers) {
            const bold = th.querySelector('b');

            if (!bold) continue;

            if (bold.textContent.trim().toLowerCase() !== 'to:') {
                continue;
            }

            const text = th.textContent.trim();

            const name = text
                .replace(/^To:\s*/i, '')
                .trim();

            if (name) {
                return name;
            }
        }

        return '';
    }

    function getMessages() {
        try {
            return JSON.parse(
                localStorage.getItem(MESSAGE_STORAGE) || '{}'
            );
        } catch (error) {
            console.error(
                'NTA Recruit Helper: Could not read saved messages.',
                error
            );

            return {};
        }
    }

    function saveMessages(messages) {
        localStorage.setItem(
            MESSAGE_STORAGE,
            JSON.stringify(messages)
        );
    }

    function getAutoFill() {
        return localStorage.getItem(
            AUTOFILL_STORAGE
        ) !== 'false';
    }

    function setAutoFill(enabled) {
        localStorage.setItem(
            AUTOFILL_STORAGE,
            String(enabled)
        );
    }

    function getPrefill() {
        return localStorage.getItem(
            PREFILL_STORAGE
        ) || '';
    }

    function setPrefill(name) {
        if (name) {
            localStorage.setItem(
                PREFILL_STORAGE,
                name
            );
        } else {
            localStorage.removeItem(
                PREFILL_STORAGE
            );
        }
    }

    function loadMessage(message) {
        const box = getMessageBox();

        if (!box) {
            console.error(
                'NTA Recruit Helper: Message box not found while loading.'
            );

            return;
        }

        let output = message;

        if (getAutoFill()) {
            const recruitName = getRecruitName();

            if (recruitName) {
                output = output.replaceAll(
                    NAME_TOKEN,
                    recruitName
                );
            }

            output = output.replaceAll(
                DISCORD_TOKEN,
                DISCORD_INVITE
            );
        }

        box.value = output;

        box.dispatchEvent(
            new Event('input', {
                bubbles: true
            })
        );

        box.dispatchEvent(
            new Event('change', {
                bubbles: true
            })
        );
    }

    function createHelper() {
        console.log(
            'NTA Recruit Helper: createHelper() started'
        );

        const messageBox = getMessageBox();

        if (!messageBox) {
            console.error(
                'NTA Recruit Helper: #message was not found.'
            );

            return;
        }

        if (document.querySelector('#ntaRecruitHelper')) {
            return;
        }

        const panel = document.createElement('div');

        panel.id = 'ntaRecruitHelper';

        panel.innerHTML = `
            <div class="rh-title">
                NTA Local Tools - Recruit Helper
            </div>

            <div class="rh-row">
                <select id="rhMessageSelect">
                    <option value="">
                        -- Select Saved Message --
                    </option>
                </select>

                <button type="button" id="rhLoad">
                    Load
                </button>
            </div>

            <div class="rh-row">
                <input
                    type="text"
                    id="rhMessageName"
                    placeholder="Message name"
                >

                <button type="button" id="rhSave">
                    Save Current
                </button>
            </div>

            <div class="rh-options">
                <label>
                    <input
                        type="checkbox"
                        id="rhAutoFill"
                    >
                    Auto fill {name} / {discord}
                </label>

                <button type="button" id="rhDelete">
                    Delete
                </button>
            </div>

            <div class="rh-options">
                <label>
                    <input
                        type="checkbox"
                        id="rhPrefill"
                    >
                    Prefill this message
                </label>
            </div>

            <div class="rh-info">
                Use <strong>{name}</strong> for the recruit's name
                or <strong>{discord}</strong> for the Discord invite.
            </div>
        `;

        /*
         * Put the helper directly underneath
         * the textarea inside its existing TD.
         */
        const messageCell = messageBox.parentElement;

        if (!messageCell) {
            console.error(
                'NTA Recruit Helper: Could not find textarea parent.'
            );

            return;
        }

        messageCell.appendChild(panel);

        if (isUpdateAvailable) {
    showUpdateIndicator();
}

        const style = document.createElement('style');

        style.id = 'ntaRecruitHelperCSS';

        style.textContent = `
            #ntaRecruitHelper {
                box-sizing: border-box;
                width: 100%;
                margin-top: 10px;
                padding: 12px;
                background: #1b1b1b;
                border: 1px solid #666666;
                color: #dddddd;
                font-family: Arial, sans-serif;
                font-size: 13px;
                text-align: left;
            }

            #ntaRecruitHelper .rh-title {
                font-size: 16px;
                font-weight: bold;
                color: #ffffff;
                margin-bottom: 10px;
            }

            #ntaRecruitHelper .rh-row {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 8px;
            }

            #ntaRecruitHelper select,
            #ntaRecruitHelper input[type="text"] {
                box-sizing: border-box;
                flex: 1;
                min-width: 0;
                padding: 6px;
                background: #2b2b2b;
                border: 1px solid #666666;
                color: #eeeeee;
            }

            #ntaRecruitHelper button {
                padding: 6px 10px;
                background: #333333;
                border: 1px solid #777777;
                color: #eeeeee;
                cursor: pointer;
            }

            #ntaRecruitHelper button:hover {
                background: #444444;
            }

            #ntaRecruitHelper .rh-options {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            #ntaRecruitHelper label {
                cursor: pointer;
            }

            #ntaRecruitHelper .rh-info {
                color: #999999;
                font-size: 11px;
            }

            #ntaRecruitHelper strong {
                color: #cccccc;
            }
        `;

        document.head.appendChild(style);

        const select = panel.querySelector(
            '#rhMessageSelect'
        );

        const messageName = panel.querySelector(
            '#rhMessageName'
        );

        const saveButton = panel.querySelector(
            '#rhSave'
        );

        const loadButton = panel.querySelector(
            '#rhLoad'
        );

        const deleteButton = panel.querySelector(
            '#rhDelete'
        );

        const autoFill = panel.querySelector(
            '#rhAutoFill'
        );

        const prefill = panel.querySelector(
            '#rhPrefill'
        );

        autoFill.checked = getAutoFill();

        function refreshMessages(selected = '') {
            const messages = getMessages();
            const prefillName = getPrefill();

            select.innerHTML = `
                <option value="">
                    -- Select Saved Message --
                </option>
            `;

            Object.keys(messages)
                .sort()
                .forEach(function (name) {
                    const option =
                        document.createElement('option');

                    option.value = name;

                    option.textContent =
                        name === prefillName
                            ? '★ ' + name
                            : name;

                    select.appendChild(option);
                });

            if (selected) {
                select.value = selected;
            }
        }

        function updatePrefillCheckbox() {
            const selectedName =
                messageName.value.trim();

            prefill.checked =
                selectedName !== '' &&
                selectedName === getPrefill();
        }

        /*
         * SAVE
         *
         * If the name already exists, this overwrites it.
         */
        saveButton.addEventListener(
            'click',
            function () {
                const name =
                    messageName.value.trim();

                if (!name) {
                    alert(
                        'Enter a name for the message.'
                    );

                    return;
                }

                const message =
                    messageBox.value;

                if (!message.trim()) {
                    alert(
                        'The message field is empty.'
                    );

                    return;
                }

                const messages =
                    getMessages();

                messages[name] = message;

                saveMessages(messages);

                refreshMessages(name);

                updatePrefillCheckbox();
            }
        );

        function loadSelectedMessage() {
            const name = select.value;

            if (!name) {
                return;
            }

            const messages =
                getMessages();

            if (!messages[name]) {
                return;
            }

            /*
             * Populate the message name field
             * with the saved message name.
             */
            messageName.value = name;

            /*
             * Loading a message that isn't the
             * current prefill unchecks Prefill.
             *
             * The stored prefill itself remains
             * unchanged until the checkbox is used.
             */
            prefill.checked =
                name === getPrefill();

            loadMessage(messages[name]);
        }

        loadButton.addEventListener(
            'click',
            loadSelectedMessage
        );

        select.addEventListener(
            'change',
            loadSelectedMessage
        );

        /*
         * DELETE
         */
        deleteButton.addEventListener(
            'click',
            function () {
                const name =
                    messageName.value.trim();

                if (!name) {
                    return;
                }

                if (!confirm(
                    'Delete "' + name + '"?'
                )) {
                    return;
                }

                const messages =
                    getMessages();

                if (!messages[name]) {
                    return;
                }

                delete messages[name];

                saveMessages(messages);

                /*
                 * If this was the prefill,
                 * remove the prefill setting.
                 */
                if (getPrefill() === name) {
                    setPrefill('');
                }

                messageName.value = '';

                refreshMessages();

                prefill.checked = false;
            }
        );

        /*
         * AUTO FILL
         */
        autoFill.addEventListener(
            'change',
            function () {
                setAutoFill(
                    autoFill.checked
                );
            }
        );

        /*
         * PREFILL
         */
        prefill.addEventListener(
            'change',
            function () {
                const name =
                    messageName.value.trim();

                if (!name) {
                    prefill.checked = false;

                    alert(
                        'Load or enter a saved message first.'
                    );

                    return;
                }

                const messages =
                    getMessages();

                if (!messages[name]) {
                    prefill.checked = false;

                    alert(
                        'Save this message before setting it as the prefill.'
                    );

                    return;
                }

                if (prefill.checked) {
                    setPrefill(name);
                } else {
                    /*
                     * Only remove it if this message
                     * is currently the prefill.
                     */
                    if (getPrefill() === name) {
                        setPrefill('');
                    }
                }

                refreshMessages(name);
                updatePrefillCheckbox();
            }
        );

        /*
         * If the user manually changes the
         * message name field, update the checkbox.
         */
        messageName.addEventListener(
            'input',
            function () {
                updatePrefillCheckbox();
            }
        );

        /*
         * Load the saved messages.
         */
        refreshMessages();

        /*
         * Automatically load the prefill message
         * when the page opens.
         */
        const prefillName =
            getPrefill();

        const messages =
            getMessages();

        if (
            prefillName &&
            messages[prefillName]
        ) {
            messageName.value =
                prefillName;

            select.value =
                prefillName;

            prefill.checked = true;

            loadMessage(
                messages[prefillName]
            );
        }

        console.log(
            'NTA Local Tools - Recruit Helper loaded.'
        );

        console.log(
            'Recruit:',
            getRecruitName()
        );

        console.log(
            'Prefill:',
            getPrefill()
        );
    }

    function start() {
        const messageBox =
            getMessageBox();

        if (!messageBox) {
            return false;
        }

        createHelper();

        return true;
    }

    function initialize() {
        if (start()) {
            return;
        }

        let attempts = 0;

        const timer = setInterval(
            function () {
                attempts++;

                if (start()) {
                    clearInterval(timer);

                    return;
                }

                if (attempts >= 100) {
                    clearInterval(timer);

                    console.error(
                        'NTA Recruit Helper: #message could not be found.'
                    );
                }
            },
            100
        );
    }

    console.log(
        'NTA Recruit Helper: script started'
    );

    try {
        if (
            document.readyState === 'loading'
        ) {
            document.addEventListener(
                'DOMContentLoaded',
                function () {
                    initialize();
                }
            );
        } else {
            initialize();
        }
    } catch (error) {
        console.error(
            'NTA Recruit Helper: INITIALIZATION ERROR',
            error
        );
    }

    checkVersion();

})();
