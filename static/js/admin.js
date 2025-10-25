window.map = L.map("map").setView([0, 0], 2);
map.options.closePopupOnClick = false;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

if (L.control.locate) {
    L.control.locate({
        setView: 'always',
        clickBehavior: {
            inView: 'setView',
            outOfView: 'setView'
        },
    }).addTo(map);
}

const socket = io();
const tbody = document.getElementById("userTableBody");
const activeUsersDisplay = document.getElementById("active-users");
const loggedInDisplay = document.getElementById("logged-in");
const users = {};
const colr = {};
const userMarkers = {};
let currentFrontMarker = null;
let showAllMode = false;

document.getElementById("show-active-btn").addEventListener("click", () => {
    showAllMode = false;
    refreshMarkers();
});

document.getElementById("show-all-btn").addEventListener("click", () => {
    showAllMode = true;
    refreshMarkers();
});

const clearAllBtn = document.getElementById("clear-all");
if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
        for (const id in userMarkers) map.removeLayer(userMarkers[id]);
        Object.keys(userMarkers).forEach(id => delete userMarkers[id]);
        currentFrontMarker = null;
    });
}

const refreshBtn = document.getElementById("refresh");
if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        loadInitialUsers();
    });
}

socket.on("connect", () => console.log("✅ Connected to WebSocket server"));

socket.on("disconnect", () => console.log("❌ Disconnected from WebSocket server"));

socket.on("logged_in_count", (count) => {
    console.log("📡 Logged-in user count:", count);
    if (loggedInDisplay) loggedInDisplay.textContent = `Logged in users: ${count}`;
});

socket.on("active_user_count", (count) => {
    console.log("📡 Active user count:", count);
    updateActiveCount(count);
    sortTable();
});

socket.on("user_status_update", (user) => {
    console.log("📡 Received user update:", user);
    updateUserRow(user);

    if (user.last_known_location && userMarkers[user.id]) {
        const [lat, lng, ts] = user.last_known_location.split(",");
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            const datetime = new Date(ts);
            const timePart = datetime.toLocaleTimeString();
            const datePart = datetime.toLocaleDateString();

            const marker = userMarkers[user.id];
            marker.setLatLng([parsedLat, parsedLng]);
            marker.setPopupContent(`
                <div style="text-align:center;">
                    <b>${user.username}</b></div>
                    ${user.isactive ? "🟢 Active" : "🔴 Last Active"}<br>
                    📅 ${datePart}<br>
                    🕒 ${timePart}
            `);
        }
    }
});

async function loadInitialUsers() {
    try {
        tbody.innerHTML = "";
        const res = await fetch("/admin/api/users");
        const allUsers = await res.json();
        const countRes = await fetch("/admin/api/users_count");
        const countData = await countRes.json();
        updateActiveCount(countData.active_user_count);

        allUsers.forEach(user => {
            colr[user.id] = false;
            users[user.id] = user;
            updateUserRow(user);
        });

        sortTable();
        refreshMarkers();
    } catch (err) {
        console.error("❌ Error loading users:", err);
    }
}

function updateActiveCount(count) {
    if (activeUsersDisplay) activeUsersDisplay.textContent = count;
}

function updateUserRow(user) {
    users[user.id] = user;
    let row = document.getElementById(`user-${user.id}`);
    let prevColor = "#000000";

    if (row) {
        const existingBtn = row.querySelector("button");
        if (existingBtn) prevColor = existingBtn.style.color;
    }

    if (!row) {
        row = document.createElement("tr");
        row.id = `user-${user.id}`;
        tbody.appendChild(row);
    }

    row.innerHTML = `
        <td>${user.username}</td>
        <td class="${user.isactive ? "status-active" : "status-inactive"}">
            ${user.isactive ? "Active" : "Inactive"}
        </td>
        <td>
            <button class="show-btn" onclick="showUserLocation(${user.id})">
                <i class="fa-solid fa-location-dot"></i>
            </button>
        </td>
    `;

    const button = row.querySelector("button");
    if (userMarkers[user.id]) {
        const color = user.isactive ? "green" : "red";
        button.style.color = color;
    } else {
        button.style.color = prevColor;
    }
}


const blueIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

window.showUserLocation = function (userId) {
    const user = users[userId];
    if (!user || !user.last_known_location) {
        alert("No location data available for this user.");
        return;
    }

    const button = document.querySelector(`#user-${user.id} button`);
    const color = user.isactive ? "green" : "red";
    if (userMarkers[user.id]) {
        map.removeLayer(userMarkers[user.id]);
        delete userMarkers[user.id];
        button.style.color = "#000000";
        return;
    }
    const marker = addMarker(user);
    if (marker) {
        button.style.color = color;
        marker.setZIndexOffset(1000);
        currentFrontMarker = marker;
        const [lat, lng] = user.last_known_location.split(",");
        map.setView([parseFloat(lat), parseFloat(lng)], map.getMaxZoom() || 18, {
            animate: true
        });
    }
};

function addMarker(user) {
    const [lat, lng, ts] = user.last_known_location.split(",");
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return null;

    const icon = user.isactive ? blueIcon : redIcon;
    const datetime = new Date(ts);
    const timePart = datetime.toLocaleTimeString();
    const datePart = datetime.toLocaleDateString();

    const popupHtml = `
        <div style="text-align:center;">
            <b>${user.username}</b></div>
            ${user.isactive ? "🟢 Active" : "🔴 Last Active"}<br>
            📅 ${datePart}<br>
            🕒 ${timePart}
        
    `;

    const marker = L.marker([parsedLat, parsedLng], {
        icon
    })
        .addTo(map)
        .bindPopup(popupHtml, {
            autoClose: false,
            closeOnClick: false,
            closeButton: true
        })
        .openPopup();
    map.setView([lat, lng], map.getMaxZoom() || 18, {
        animate: true
    });
    userMarkers[user.id] = marker;
    return marker;
}

function refreshMarkers() {
    for (const id in userMarkers) map.removeLayer(userMarkers[id]);
    Object.keys(userMarkers).forEach(id => delete userMarkers[id]);

    Object.values(users).forEach(user => {
        if ((showAllMode || user.isactive) && user.last_known_location) {
            const locParts = user.last_known_location.split(",");
            if (locParts.length >= 2 && !isNaN(parseFloat(locParts[0])) && !isNaN(parseFloat(locParts[1]))) {
                addMarker(user);
            }
        }
    });
}

function sortTable() {
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => {
        const aActive = a.querySelector("td:nth-child(2)").textContent.trim() === "Active";
        const bActive = b.querySelector("td:nth-child(2)").textContent.trim() === "Active";
        if (aActive !== bActive) return aActive ? -1 : 1;
        return 0;
    });
    rows.forEach(row => tbody.appendChild(row));
}

window.onload = loadInitialUsers;