window.map = L.map("map").setView([0, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

if (L.control.locate) {
    L.control.locate({
        setView: 'always',
        clickBehavior: { inView: 'setView', outOfView: 'setView' },
    }).addTo(map);
}

const socket = io();
const tbody = document.getElementById("userTableBody");
const activeUsersDisplay = document.getElementById("active-users");
const users = {};
const markers = {};
const colr = {};

socket.on("connect", () => console.log("✅ Connected to WebSocket server"));
socket.on("disconnect", () => console.log("❌ Disconnected from WebSocket server"));
socket.on("active_user_count", (count) => {
    console.log("📡 Active user count:", count);
    updateActiveCount(count);
    sortTable();
});

socket.on("user_status_update", (user) => {
    console.log("📡 Received user update:", user);
    updateUserRow(user);

    const existingMarker = window.userMarkers[user.id];
    if (existingMarker && user.last_known_location) {
        const [lat, lng, ts] = user.last_known_location.split(",");
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            existingMarker.setLatLng([parsedLat, parsedLng]);

            const [lat, lng, ts] = user.last_known_location.split(",")
            const [datePart, timePart] = String(ts).split("T");
            const cleanTime = timePart.split(".")[0];
            existingMarker.setPopupContent(`
                <div style="text-align:center;">
                    <b>${user.username}</b></div>
                    ${user.isactive ? "🟢 Active" : "🔴 Last Active"}<br>
                    📅 ${datePart}<br>
                    🕒 ${cleanTime}
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
            updateUserRow(user);

        });
        sortTable();
    } catch (err) {
        console.error("❌ Error loading users:", err);
    }
}

function updateActiveCount(count) {
    if (activeUsersDisplay) {
        activeUsersDisplay.textContent = count;
    }
}

function updateUserRow(user) {
    users[user.id] = user;

    let row = document.getElementById(`user-${user.id}`);
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
            <i class="fa-solid fa-location-dot"></i></button>
        </td>
    `;
    const button = row.querySelector("button");
    const color = user.isactive ? "green" : "red";
    button.style.color = colr[user.id] ? color : "#000000";
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

let currentFrontMarker = null;
if (!window.userMarkers) window.userMarkers = {};

window.showUserLocation = function (userId) {
    const user = users[userId];
    console.log(user);
    const icon = user.isactive ? blueIcon : redIcon;
    colr[user.id] = !colr[user.id];

    if (!user || !user.last_known_location) {
        alert("No location data available for this user.");
        return;
    }

    button = document.querySelector(`#user-${user.id} button`);
    const color = user.isactive ? "green" : "red";
    button.style.color = colr[user.id] ? color : "#000000";

    const [lat, lng, ts] = user.last_known_location.split(",")
    const [datePart, timePart] = String(ts).split("T");
    const cleanTime = timePart.split(".")[0];
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
        alert("Invalid coordinates received for this user.");
        return;
    }

    const existingMarker = window.userMarkers[user.id];

    if (existingMarker) {
        map.removeLayer(existingMarker);
        delete window.userMarkers[user.id];
        if (currentFrontMarker === existingMarker) currentFrontMarker = null;
        return;
    }

    const marker = L.marker([parsedLat, parsedLng], { icon })
        .addTo(map)
        .bindPopup(`
    <div style="text-align:center;">
        <b>${user.username}</b></div>
        ${user.isactive ? "🟢 Active" : "🔴 Last Active"}<br>
        📅 ${datePart}<br>
        🕒 ${cleanTime}
        `)
        .openPopup();

    if (currentFrontMarker && currentFrontMarker !== marker) {
        currentFrontMarker.setZIndexOffset(0);
    }
    marker.setZIndexOffset(1000);
    currentFrontMarker = marker;

    window.userMarkers[user.id] = marker;

    map.setView([parsedLat, parsedLng], map.getMaxZoom() || 18, { animate: true });
};

function sortTable() {
    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.sort((a, b) => {
        const aStatus = a.querySelector("td:nth-child(2)").textContent.trim();
        const bStatus = b.querySelector("td:nth-child(2)").textContent.trim();

        const aActive = aStatus === "Active";
        const bActive = bStatus === "Active";

        if (aActive !== bActive) return aActive ? -1 : 1;

        const aTimeCell = a.dataset.lastSeen;
        const bTimeCell = b.dataset.lastSeen;

        if (aTimeCell && bTimeCell) {
            const aTime = new Date(aTimeCell);
            const bTime = new Date(bTimeCell);
            return bTime - aTime;
        }

        return 0;
    });

    rows.forEach(row => tbody.appendChild(row));
}


window.onload = loadInitialUsers;
