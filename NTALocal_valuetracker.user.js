// ==UserScript==
// @name         NTA Local Tools - Value Tracker
// @namespace    https://www.kingsofchaos.com/
// @version      1.0
// @description  Tracks and displays KoC player wealth values.
// @match        https://www.kingsofchaos.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = "koc_wealth_tracker";
    const SETTINGS_KEY = "koc_wealth_view_settings";


    function cleanNumber(value) {
        return Number(value.replace(/[(),\s]/g, ''));
    }


    function formatElapsed(timestamp) {

        if (!timestamp) return "";

        const stored = new Date(timestamp.replace(" ", "T"));
        const now = new Date();

        let seconds = Math.floor((now - stored) / 1000);

        if (seconds < 0) seconds = 0;


        const days = Math.floor(seconds / 86400);
        seconds %= 86400;


        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;


        const minutes = Math.floor(seconds / 60);
        seconds %= 60;


        let result = "";

        if (days)
            result += days + "d ";

        if (hours || days)
            result += hours + "h ";

        if (minutes || hours || days)
            result += minutes + "m ";


        result += seconds + "s";

        return result;
    }



    // ==================================================
    // TRACK CURRENT TARGET
    // ==================================================

    function trackTarget() {

        const statsLink =
            document.querySelector('a[href^="stats.php?id="]');


        if (!statsLink)
            return;



        const idMatch =
            statsLink.href.match(/id=(\d+)/);



        if (!idMatch)
            return;



        const targetId = idMatch[1];


        const record = {

            target:
                statsLink.textContent.trim()

        };



        const pageText =
            document.body.innerText;



        const invested =
            pageText.match(
                /Total Invested Value:\s*\(?([\d,]+)\)?/i
            );


        const sell =
            pageText.match(
                /Total Sell Value:\s*\(?([\d,]+)\)?/i
            );


        const sabcap =
            pageText.match(
                /Maximum Daily Sabotage loss:\s*\(?([\d,]+)\)?/i
            );



        record.target_value =
            invested
            ? cleanNumber(invested[1])
            : null;


        record.target_sell =
            sell
            ? cleanNumber(sell[1])
            : null;


        record.target_sabcap =
            sabcap
            ? cleanNumber(sabcap[1])
            : null;




        const timestamp =
            pageText.match(
                /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/
            );



        if (timestamp) {

            record.koc_timestamp =
                timestamp[0];

        }




        let db =
            JSON.parse(
                localStorage.getItem(STORAGE_KEY)
                || "{}"
            );



        db[targetId] = record;



        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(db)
        );



        console.log(
            "Updated target:",
            targetId,
            record
        );

    }





    // ==================================================
    // BUTTON
    // ==================================================

    function createButton() {


        const btn =
            document.createElement("button");



        btn.textContent =
            "View KoC Player Values";



        btn.style.position =
            "fixed";

        btn.style.top =
            "10px";

        btn.style.left =
            "10px";

        btn.style.zIndex =
            "99999";

        btn.style.padding =
            "10px 15px";

        btn.style.background =
            "#222";

        btn.style.color =
            "white";

        btn.style.border =
            "1px solid #555";

        btn.style.borderRadius =
            "6px";

        btn.style.cursor =
            "pointer";



        btn.onclick =
            openViewer;



        document.body.appendChild(btn);

    }





    // ==================================================
    // VIEWER
    // ==================================================

    function openViewer() {


        let settings =
            JSON.parse(
                localStorage.getItem(SETTINGS_KEY)
                || "{}"
            );



        const overlay =
            document.createElement("div");



        overlay.id =
            "kocViewer";



        overlay.innerHTML = `

        <div class="koc-box">


            <div class="koc-header">

                <h2>
                    KoC Player Wealth
                </h2>


                <button id="kocClose">
                    X
                </button>


            </div>



            <div class="koc-controls">


                <input
                    id="kocSearch"
                    placeholder="Search name or ID"
                >



                <select id="kocSort">

                    <option value="invested">
                        Sort: Invested
                    </option>

                    <option value="name">
                        Sort: Name
                    </option>

                    <option value="id">
                        Sort: ID
                    </option>

                </select>



                <button id="kocDirection">
                    Sort Direction
                </button>



                <button id="kocRefresh">
                    Refresh List
                </button>



                <button id="kocExport">
                    Export
                </button>



                <button id="kocImport">
                    Import
                </button>



                <input
                    id="kocImportFile"
                    type="file"
                    accept=".json"
                    style="display:none"
                >



                <select id="kocLimit">

                    <option value="10">
                        10
                    </option>


                    <option value="25">
                        25
                    </option>


                    <option value="50">
                        50
                    </option>


                    <option value="100">
                        100
                    </option>


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


                <button id="kocPrev">
                    Previous
                </button>



                <span id="kocPage"></span>



                <button id="kocNext">
                    Next
                </button>


            </div>



        </div>

        `;


        document.body.appendChild(overlay);


        const style =
            document.createElement("style");
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



        #kocViewer input,
        #kocViewer select,
        #kocViewer button {

            padding:7px;

        }



        #kocViewer table {

            width:100%;
            border-collapse:collapse;

        }



        #kocViewer th,
        #kocViewer td {

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



        let page = 0;




        function render() {


            let db =
                JSON.parse(
                    localStorage.getItem(STORAGE_KEY)
                    || "{}"
                );



            let rows =
                Object.entries(db)
                .map(([id,value])=>({

                    id,
                    ...value

                }));




            const search =
                document.getElementById("kocSearch")
                .value
                .toLowerCase();




            rows =
                rows.filter(x=>


                    x.id.includes(search)


                    ||

                    (x.target || "")
                    .toLowerCase()
                    .includes(search)


                );





            const sort =
                document.getElementById("kocSort")
                .value;




            const direction =
                settings.direction === "asc"
                ? 1
                : -1;





            rows.sort((a,b)=>{


                if(sort === "name") {


                    return (

                        (a.target || "")
                        .localeCompare(
                            b.target || ""
                        )

                    ) * direction;


                }



                if(sort === "id") {


                    return (

                        Number(a.id)
                        -
                        Number(b.id)

                    ) * direction;


                }




                return (

                    (a.target_value || 0)
                    -
                    (b.target_value || 0)

                ) * direction;


            });






            const limit =
                Number(
                    document.getElementById("kocLimit")
                    .value
                );





            const totalPages =
                Math.max(

                    1,

                    Math.ceil(
                        rows.length / limit
                    )

                );





            if(page >= totalPages) {

                page =
                    totalPages - 1;

            }





            const display =
                rows.slice(

                    page * limit,

                    (page + 1) * limit

                );





            document.getElementById("kocRows")
            .innerHTML =



            display.map((x,i)=>`


                <tr>


                    <td>
                        ${page * limit + i + 1}
                    </td>




                    <td>

                        <a
                        href="https://www.kingsofchaos.com/stats.php?id=${x.id}"
                        target="_blank">

                            ${x.target || ""}

                        </a>

                    </td>





                    <td>

                        <a
                        href="https://www.kingsofchaos.com/attack.php?id=${x.id}"
                        target="_blank">

                            ${x.id}

                        </a>

                    </td>





                    <td>

                        ${
                        x.target_value
                        ?
                        x.target_value.toLocaleString()
                        :
                        ""
                        }

                    </td>





                    <td>

                        ${
                        x.target_sell
                        ?
                        x.target_sell.toLocaleString()
                        :
                        ""
                        }

                    </td>





                    <td>

                        ${
                        x.target_sabcap
                        ?
                        x.target_sabcap.toLocaleString()
                        :
                        ""
                        }

                    </td>





                    <td
                    class="koc-time"
                    data-time="${x.koc_timestamp || ""}">

                        ${formatElapsed(
                            x.koc_timestamp
                        )}

                    </td>




                </tr>


            `).join("");





            document.getElementById("kocPage")
            .textContent =

                `${page + 1} / ${totalPages}`;






            document.querySelectorAll(".koc-time")
            .forEach(cell=>{


                cell.onmouseenter = ()=>{


                    cell.textContent =
                        cell.dataset.time;


                };



                cell.onmouseleave = ()=>{


                    cell.textContent =
                        formatElapsed(
                            cell.dataset.time
                        );


                };


            });


        }

                function closeViewer() {

            overlay.remove();
            style.remove();

        }



        // Close X button
        document.getElementById("kocClose")
        .onclick = closeViewer;



        // Click outside overlay closes it
        overlay.onclick = (e)=>{

            if(e.target === overlay) {

                closeViewer();

            }

        };



        // Previous page
        document.getElementById("kocPrev")
        .onclick = ()=>{

            if(page > 0) {

                page--;

            }

            render();

        };



        // Next page
        document.getElementById("kocNext")
        .onclick = ()=>{

            page++;

            render();

        };




        // Search
        document.getElementById("kocSearch")
        .value =
            settings.search || "";



        document.getElementById("kocSearch")
        .oninput = (e)=>{


            settings.search =
                e.target.value;



            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );



            page = 0;

            render();

        };





        // Sort
        document.getElementById("kocSort")
        .value =
            settings.sort || "invested";



        document.getElementById("kocSort")
        .onchange = (e)=>{


            settings.sort =
                e.target.value;



            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );



            page = 0;

            render();

        };





        // Records per page
        document.getElementById("kocLimit")
        .value =
            settings.limit || "25";



        document.getElementById("kocLimit")
        .onchange = (e)=>{


            settings.limit =
                e.target.value;



            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );



            page = 0;

            render();

        };






        // Sort direction
        document.getElementById("kocDirection")
        .onclick = ()=>{


            settings.direction =
                settings.direction === "asc"
                ? "desc"
                : "asc";



            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );



            render();

        };






        // Refresh list
        // Reloads localStorage data and updates display
        document.getElementById("kocRefresh")
        .onclick = ()=>{


            page = 0;

            render();

        };







        // ==================================================
        // EXPORT BACKUP
        // ==================================================

        document.getElementById("kocExport")
        .onclick = ()=>{


            const data =
                localStorage.getItem(STORAGE_KEY)
                || "{}";



            const blob =
                new Blob(

                    [data],

                    {
                        type:
                        "application/json"
                    }

                );



            const url =
                URL.createObjectURL(blob);



            const link =
                document.createElement("a");



            link.href = url;



            link.download =
                "koc_wealth_backup.json";



            link.click();



            URL.revokeObjectURL(url);


        };







        // ==================================================
        // IMPORT BACKUP
        // ==================================================

        document.getElementById("kocImport")
        .onclick = ()=>{


            document.getElementById("kocImportFile")
            .click();


        };






        document.getElementById("kocImportFile")
        .onchange = (e)=>{


            const file =
                e.target.files[0];



            if(!file)
                return;





            const reader =
                new FileReader();





            reader.onload = (event)=>{


                try {



                    const imported =
                        JSON.parse(
                            event.target.result
                        );



                    let current =
                        JSON.parse(

                            localStorage.getItem(
                                STORAGE_KEY
                            )
                            ||
                            "{}"

                        );




                    current = {

                        ...current,

                        ...imported

                    };





                    localStorage.setItem(

                        STORAGE_KEY,

                        JSON.stringify(
                            current
                        )

                    );





                    page = 0;

                    render();





                    alert(
                        "Import complete"
                    );



                }
                catch(err) {



                    alert(
                        "Invalid backup file"
                    );



                }



            };





            reader.readAsText(file);


        };





        render();


    }






    // ==================================================
// START
// ==================================================

// Only collect wealth data from attack pages
if (
    window.location.pathname.includes("/attack.php") &&
    window.location.search.includes("id=")
) {
    trackTarget();
}

// Always allow viewer access
createButton();



})();
