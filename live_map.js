document.addEventListener("DOMContentLoaded", () => {
// -------------------------------
// MAP SETUP
// -------------------------------
const map = L.map('live_map').setView([52.201502, 5.152320], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// -------------------------------
// LIVE OWNTRACKS MARKERS
// -------------------------------
const markers = {};

async function updatePositions() {
    try {
        const response = await fetch(
            'https://owntracks.avondvierdaagseloosdrecht.nl/owntracks/api/0/last?fields=tid,lat,lon'
        );
        const data = await response.json();

        data.forEach(item => {
            if (!item.lat || !item.lon || !item.tid) return;

            const id = item.tid;
            const latlng = [item.lat, item.lon];

            if (markers[id]) {
                markers[id].setLatLng(latlng);
            } else {
                const marker = L.marker(latlng).addTo(map);
                marker.bindTooltip(id, {
                    permanent: true,
                    direction: 'top',
                    className: 'tid-label'
                });
                markers[id] = marker;
            }
        });

    } catch (err) {
        console.error('OwnTracks fetch failed:', err);
    }
}

updatePositions();
setInterval(updatePositions, 1000);

// -------------------------------
// GPX ROUTE LAYERS
// -------------------------------
const gpxBaseUrl =
    "https://raw.githubusercontent.com/JorisFransman/A4D_Loosdrecht/main/Routes2026/";

const gpxFiles = [
    "Maandag 5km.gpx",
    "Maandag 10km.gpx",
    "Dinsdag 5km.gpx",
    "Dinsdag 10km.gpx",
    "Woensdag 5km.gpx",
    "Woensdag 10km.gpx",
    "Donderdag 5km.gpx",
    "Donderdag 10km.gpx"
];

const overlayLayers = {};

async function loadGpx(file) {
    const layerName = file.replace(".gpx", "");

    const response = await fetch(gpxBaseUrl + encodeURIComponent(file));
    const text = await response.text();

    const parser = new DOMParser();
    const gpx = parser.parseFromString(text, "application/xml");
    const geojson = toGeoJSON.gpx(gpx);

    return L.geoJSON(geojson, {
        style: {
            color: "#ff8800",
            weight: 4,
            opacity: 0.8
        },
        pointToLayer: () => null  // hide route markers
    });
}

// Immediately-invoked async function
(async () => {
    let firstLayer = null;

    for (const [i, file] of gpxFiles.entries()) {
        try {
            const layer = await loadGpx(file);
            const layerName = file.replace(".gpx", "");
            overlayLayers[layerName] = layer;

            // add first layer to map
            if (i === 0) {
                layer.addTo(map);
                firstLayer = layer;
            }

            console.log("Loaded GPX:", file);
        } catch (e) {
            console.error("Failed GPX:", file, e);
        }
    }

        // Add Leaflet layer control
        const layerControl = L.control.layers(null, overlayLayers, { collapsed: false }).addTo(map);

        // Get container for overlays
        const layerControlDiv = layerControl.getContainer();

        // Create a wrapper div for title + select all
        const wrapperDiv = document.createElement("div");
        wrapperDiv.style.marginBottom = "5px";

        // Title
        const titleDiv = document.createElement("div");
        titleDiv.innerText = "Routes";
        titleDiv.style.fontWeight = "bold";
        wrapperDiv.appendChild(titleDiv);

        // Selecteer alles checkbox
        const selectAllDiv = document.createElement("div");
        selectAllDiv.innerHTML = `
        <label style="font-weight: normal; display:block; margin:0; padding:0;">
            <input type="checkbox" id="selectAllRoutes"> Selecteer alles
        </label>
    `;
        wrapperDiv.appendChild(selectAllDiv);

        // Insert wrapper above overlay list
        const overlayList = layerControlDiv.querySelector(".leaflet-control-layers-overlays");
        overlayList.parentNode.insertBefore(wrapperDiv, overlayList);

        // Event handler for Selecteer alles
        const selectAllCheckbox = document.getElementById("selectAllRoutes");
        selectAllCheckbox.addEventListener("change", () => {
            const checked = selectAllCheckbox.checked;
            Object.values(overlayLayers).forEach(layer => {
                if (checked) {
                    if (!map.hasLayer(layer)) map.addLayer(layer);
                } else {
                    if (map.hasLayer(layer) && layer !== firstLayer) map.removeLayer(layer);
                }
            });
        });
    })();
});
