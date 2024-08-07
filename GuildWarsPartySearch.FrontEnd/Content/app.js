﻿var map;
var mapData = {};
var loading = true;
var initialized = false;

var continent = 1;

var districts = [
    "Current",
    "International",
    "American",
    "Europe - English",
    "Europe - French",
    "Europe - German",
    "Europe - German",
    "Europe - Italian",
    "Europe - Spanish",
    "Europe - Polish",
    "Europe - Russian",
    "Asia - Korean",
    "Asia - Chinese",
    "Asia - Japanese"
];

var searchTypes = [
    "Hunting",
    "Mission",
    "Quest",
    "Trade",
    "Guild"
];

var markerSize = {
    "dungeon": "small",
    "arena": "medium",
    "arena_cantha": "large",
    "arena_elona": "large",
    "challenge_cantha": "large",
    "challenge_cantha_kurzick": "large",
    "challenge_cantha_luxon": "large",
    "challenge_elona": "large",
    "challenge_realm": "large",
    "city": "medium",
    "city_cantha": "large",
    "city_cantha_kurzick": "large",
    "city_cantha_luxon": "large",
    "city_elona": "large",
    "city_realm": "large",
    "guildhall": "medium",
    "gate": "medium",
    "gate_of_anguish": "large",
    "outpost": "small",
    "outpost_cantha": "medium",
    "outpost_cantha_kurzick": "medium",
    "outpost_cantha_luxon": "medium",
    "outpost_elona": "medium",
    "outpost_realm": "medium",
    "mission": "large",
    "mission_cantha": "large",
    "mission_cantha_kurzick": "large",
    "mission_cantha_luxon": "large",
    "mission_elona": "large",
    "mission_realm": "large",
    "mission_eotn": "medium",
    "zaishen": "large",
    "travel": "large",
    "vortex": "large"
};

let locationMap = new Map();
let maps = [];
let professions = [];

function getEntriesForMapId(searches, mapId) {
    let entries = new Map();

    searches.forEach((value, key) => {
        if (key.startsWith(mapId + '-')) {
            entries.set(key, value);
        }
    });

    return entries;
}

function aggregatePartySearches(searches) {
    const aggregated = {};

    searches.forEach(value => {
        const mapId = value.map_id;
        const district = value.district;

        // Ensure the first level (mapId) exists
        if (!aggregated[mapId]) {
            aggregated[mapId] = {};
        }

        // Ensure the second level (district) exists
        if (!aggregated[mapId][district]) {
            aggregated[mapId][district] = [];
        }

        // Assuming value is an array of party searches
        value.parties.forEach(partySearch => {
            if (!aggregated[mapId][district][partySearch.search_type]) {
                aggregated[mapId][district][partySearch.search_type] = []
            }

            aggregated[mapId][district][partySearch.search_type].push(partySearch);
        });
    });

    return aggregated;
}

async function fetchObj(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch' + url + ". Response: " + response.statusText);
    }
    const mapsData = await response.json();
    return mapsData;
}

async function initializeData() {
    try {
        maps = await fetchObj("/models/maps");
    } catch (error) {
        console.error('Failed to load maps:', error);
    }

    try {
        professions = await fetchObj("/models/professions");
    } catch (error) {
        console.error('Failed to load professions:', error);
    }

    initialized = true;
}

function getDecodedHash() {
    const hash = window.location.hash.substring(1);
    return decodeURIComponent(hash);
}

function updateHash() {
    var zoom = map.getZoom();
    var point = project(map.getCenter());

    history.replaceState(undefined, undefined, "?v=1&x=" + point.x + "&y=" + point.y + "&z=" + zoom + "&c=" + continent);
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

function toggleMenu() {
    document.querySelector("#menu").classList.toggle("hidden");
}

function showMenu() {
    if (document.querySelector("#menu").classList.contains("hidden")) {
        toggleMenu();
    }
}

function hideMenu() {
    if (!document.querySelector("#menu").classList.contains("hidden")) {
        toggleMenu();
    }
}

var urlCoordinates = {
    v: getURLParameter("v"),
    x: getURLParameter("x"),
    y: getURLParameter("y"),
    z: getURLParameter("z"),
    c: getURLParameter("c")
};

function buildPartyList() {
    let filter = getDecodedHash();
    let searches = locationMap;
    if (filter) {
        let mapObj = maps.find(map => map.name === filter);
        searches = getEntriesForMapId(searches, mapObj.id.toString());
    }

    let aggregatedPartySearches = aggregatePartySearches(searches);
    let container = document.querySelector(".partyList");
    container.innerHTML = "";
    for (const mapId in aggregatedPartySearches) {
        // '{"party_id":8,"district_number":2,"language":0,"message":"","sender":"Seraph Stormcaller","party_size":1,"hero_count":0,"hardmode":0,"search_type":1,"primary":6,"secondary":5,"level":20}'
        let mapObj = maps.find(map => map.id.toString() === mapId);
        let outerDiv = `<div><div class="mapName">${mapObj.name}</div>`;
        for (const district in aggregatedPartySearches[mapId]) {
            outerDiv += `<div class="district">${districts[district]}</div>`;
            for (const searchType in aggregatedPartySearches[mapId][district]) {
                outerDiv += `<div class="searchType">${searchTypes[searchType]}</div >`;
                for (const partyId in aggregatedPartySearches[mapId][district][searchType]) {
                    const party = aggregatedPartySearches[mapId][district][searchType][partyId];
                    const primary = professions[party.primary.toString()];
                    const secondary = professions[party.secondary.toString()];
                    outerDiv += `<div class="partySearch">${primary.alias}/${secondary.alias}${party.level} ${party.sender}</div>`;
                }
            }
        }

        outerDiv += `</div>`;
        container.innerHTML += outerDiv;
    }
}

function mapClicked(map) {
    if (map.mapId) {
        let partySearches = getEntriesForMapId(locationMap, map.mapId.toString());
        let found = false;
        partySearches.forEach(partySearch => {
            if (partySearch.parties.length > 0) {
                let mapObj = maps.find(m => m.id === map.mapId);
                window.location.hash = mapObj.name;
                found = true;
            }
        });

        if (found) {
            buildPartyList();
            showMenu();
        }
    }
}

function unproject(coord) {
    return map.unproject(coord, map.getMaxZoom());
}

function project(coord) {
    return map.project(coord, map.getMaxZoom());
}

function loadMap(mapIndex) {
    hideMenu();
    continent = mapIndex;
    document.querySelector("#menu").classList.add("hidden");

    let maplinks = document.querySelectorAll(".mapLink");
    for (let m = 0; m < maplinks.length; m++) {
        maplinks[m].classList.remove("selected");
    }

    let mapLink = document.querySelector(".mapLink[data-id='" + mapIndex + "']");

    if (mapLink !== null) {
        mapLink.classList.add("selected");
    }

    if (map !== undefined) {
        map.off();
        map.remove();
    }

    fetch("data/" + mapIndex + ".json?v=20200516001")
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            mapData = data;

            document.title = "Guild Wars Party Search [" + mapData.name + "]";

            map = L.map("mapdiv", {
                minZoom: 0,
                maxZoom: 4,
                crs: L.CRS.Simple,
                attributionControl: false
            }).on('click', function (e) {
                //let p = project(e.latlng);
                //console.log("[" + p.x + "," + p.y + "]");
            }).on('zoomend', function () {
                zoomEnd();
            }).on('moveend zoomend', function () {
                if (loading) {
                    loading = false;
                } else {
                    updateHash();
                }
            }).on('click focus movestart', function () {
                document.querySelector("#menu").classList.add("hidden");
            });



            var mapbounds = new L.LatLngBounds(unproject([0, 0]), unproject(mapData.dims));
            map.setMaxBounds(mapbounds);
            if (urlCoordinates.x !== null && urlCoordinates.y !== null && urlCoordinates.z !== null) {
                map.setView(unproject([urlCoordinates.x, urlCoordinates.y]), urlCoordinates.z);
                urlCoordinates.x, urlCoordinates.y, urlCoordinates.z = null;
            } else if (data.center !== undefined) {
                map.setView(unproject(data.center), 4);
            } else {
                map.setView(unproject([mapData.dims[0] / 2, mapData.dims[1] / 2]), 4);
            }

            map.addLayer(L.tileLayer("tiles/" + mapData.id + "/{z}/{x}/{y}.jpg", { minZoom: 0, maxZoom: 4, continuousWorld: true, bounds: mapbounds }));

            for (let r = 0; r < mapData.regions.length; r++) {

                let region = mapData.regions[r];

                if (region.areas !== undefined) {
                    for (let a = 0; a < region.areas.length; a++) {
                        areaLabel(region.areas[a]).addTo(map);
                    }
                }

                if (region.locations !== undefined) {
                    for (let o = 0; o < region.locations.length; o++) {
                        locationMarker(region.locations[o]).addTo(map);
                    }
                }
            }

            zoomEnd();
            updateEntriesDiv();
        });
}

function zoomEnd() {

    let zoom = map.getZoom();
    let locationLabels = document.querySelectorAll(".marker_location .label");
    let areaLabels = document.querySelectorAll(".marker_area .label");
    let icons = document.querySelectorAll(".icon");


    for (let l = 0; l < locationLabels.length; l++) {
        locationLabels[l].classList.remove("hidden");
    }

    for (let l = 0; l < areaLabels.length; l++) {
        areaLabels[l].classList.remove("hidden");
    }

    for (let i = 0; i < icons.length; i++) {
        icons[i].classList.remove("hidden");
        icons[i].classList.remove("scaled_70");
        icons[i].classList.remove("scaled_40");
    }

    if (zoom === 3) {
        for (let l = 0; l < locationLabels.length; l++) {
            locationLabels[l].classList.add("hidden");
        }

        for (let i = 0; i < icons.length; i++) {
            icons[i].classList.add("scaled_70");
        }
    } else if (zoom === 2) {

        for (let l = 0; l < locationLabels.length; l++) {
            locationLabels[l].classList.add("hidden");
        }

        for (let l = 0; l < areaLabels.length; l++) {
            areaLabels[l].classList.add("hidden");
        }

        for (let i = 0; i < icons.length; i++) {
            icons[i].classList.add("scaled_40");
        }
    } else if (zoom < 2) {
        for (let l = 0; l < locationLabels.length; l++) {
            locationLabels[l].classList.add("hidden");
        }

        for (let l = 0; l < areaLabels.length; l++) {
            areaLabels[l].classList.add("hidden");
        }

        for (let i = 0; i < icons.length; i++) {
            icons[i].classList.add("hidden");
        }
    }
}

function areaLabel(data) {

    let wiki = data.name.replace(/ /g, "_");
    if (data.wiki !== undefined) {
        wiki = data.wiki;
    }

    return L.marker(unproject(data.coordinates), {
        icon: L.divIcon({
            iconSize: null,
            className: "marker marker_area seethru unclickable",
            html: "<div class='holder'><span class='label'>" + data.name + "</span></div>"
        }),
        options: {
            wiki: wiki
        }
    });
}

function locationMarker(data) {

    let wiki = data.name.replace(/ /g, "_");
    if (data.wiki !== undefined) {
        wiki = data.wiki;
    }

    let label = data.name;
    if (data.label !== undefined) {
        label = data.label;
    }

    let divId = data.mapId ? " id='" + data.mapId + "'" : "";

    return L.marker(unproject(data.coordinates), {
        icon: L.divIcon({
            iconSize: null,
            className: "marker marker_location " + markerSize[data.type] + " seethru",
            html: "<div" + divId + " class='holder'><img class='icon' src='resources/icons/" + data.type + ".png'/><div class='label'>" + label + "</div></div>"
        }),
        options: {
            wiki: wiki,
            mapId: data.mapId
        }
    }).on('click', function (e) {

        if (map.getZoom() > 1) {
            mapClicked(e.target.options.options);
        }
    });
}

if (urlCoordinates.c !== null) {
    continent = urlCoordinates.c;
}

function updateEntriesDiv() {
    let allInnerDivs = document.querySelectorAll(".marker.marker_location .holder[id]");
    allInnerDivs.forEach(function (innerDiv) {
        let parentMarker = innerDiv.closest('.marker.marker_location');
        if (parentMarker) {
            parentMarker.classList.add('seethru');
            parentMarker.classList.add('unclickable');
        }
    });

    locationMap.keys().forEach(function (key) {
        if (locationMap.get(key).parties.length > 0) {
            let matchingInnerDivs = Array.prototype.filter.call(allInnerDivs, function (innerDiv) {
                return innerDiv.id && key.startsWith(innerDiv.id);
            });
            matchingInnerDivs.forEach(function (innerDiv) {
                let parentMarker = innerDiv.closest('.marker.marker_location');
                if (parentMarker) {
                    parentMarker.classList.remove('seethru');
                    parentMarker.classList.remove('unclickable');
                }
            });
        }
    });
}

function waitForInitialization() {
    return new Promise((resolve) => {
        const checkInitialization = () => {
            if (initialized) {
                resolve();
            } else {
                setTimeout(checkInitialization, 100); // Check again after 100ms
            }
        };
        checkInitialization();
    });
}

function connectToLiveFeed() {
    const wsUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/party-search/live-feed';
    let socket;
    let retryDelay = 1000;

    function openWebSocket() {
        socket = new WebSocket(wsUrl);

        socket.onopen = async function (event) {
            console.log('WebSocket connection established:', event);
            retryDelay = 1000;
            await initializeData();
            showMenu();
        };

        socket.onmessage = async function (event) {
            console.log('WebSocket message received:', event);
            if (event.data === 'pong') {
                console.log('Pong received from server.');
            } else {
                let obj = JSON.parse(event.data);
                console.log(obj);
                obj.Searches.forEach(searchEntry => {
                    let combinedKey = `${searchEntry.map_id}-${searchEntry.district}`;
                    locationMap.set(combinedKey, searchEntry);
                });

                await waitForInitialization();
                updateEntriesDiv();
                buildPartyList();
            }
        };

        socket.onerror = function (event) {
            console.error('WebSocket error:', event);
        };

        socket.onclose = function (event) {
            console.log('WebSocket connection closed:', event);
            if (!event.wasClean) {
                console.log(`WebSocket closed unexpectedly. Reconnecting in ${retryDelay / 1000} seconds...`);
                setTimeout(openWebSocket, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30000); // Exponential backoff with a max delay of 30 seconds
            }
        };
    }

    openWebSocket();
}

loadMap(continent);
connectToLiveFeed();