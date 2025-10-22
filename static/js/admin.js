window.map = L.map("map").setView([0, 0], 2);
map.options.closePopupOnClick = false;

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
const loggedInDisplay = document.getElementById("logged-in");
const users = {};
const colr = {};
const userMarkers = {};
let currentFrontMarker = null;

// 🆕 mode control flag
let showAllMode = false; // false = Active users only, true = All users

// 🆕 Hook buttons
document.getElementById("show-active-btn").addEventListener("click", () => {
    showAllMode = false;
    refreshMarkers();
});

document.getElementById("show-all-btn").addEventListener("click", () => {
    showAllMode = true;
    refreshMarkers();
});

// Clear all markers button
const clearAllBtn = document.getElementById("clear-all");
if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
        for (const id in userMarkers) map.removeLayer(userMarkers[id]);
        Object.keys(userMarkers).forEach(id => delete userMarkers[id]);
        currentFrontMarker = null;
        console.log("🗑️ All markers cleared");
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

    // Update marker position ONLY if it already exists
    if (user.last_known_location && userMarkers[user.id]) {
        const [lat, lng, ts] = user.last_known_location.split(",");
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);

        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            const [datePart, timePart] = String(ts).split("T");
            const cleanTime = timePart.split(".")[0];
            
            const marker = userMarkers[user.id];
            marker.setLatLng([parsedLat, parsedLng]);
            marker.setPopupContent(`
                <div style="text-align:center;">
                    <b>${user.username}</b></div>
                    ${user.isactive ? "🟢 Active" : "🔴 Last Active"}<br>
                    📅 ${datePart}<br>
                    🕒 ${cleanTime}
            `);
        }
    }

    // ❌ Do NOT auto-create new markers on update
    // Markers will only appear on button press or show-active/show-all
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
        refreshMarkers(); // 🆕 initialize map markers
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

    // ✅ Preserve button color if row already exists
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

    // ✅ if marker exists → keep active color
    if (userMarkers[user.id]) {
        const color = user.isactive ? "green" : "red";
        button.style.color = color;
    } else {
        // else restore previous color (default black)
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

    // Toggle marker visibility
    if (userMarkers[user.id]) {
        // Marker already exists → remove it
        map.removeLayer(userMarkers[user.id]);
        delete userMarkers[user.id];
        button.style.color = "#000000";  // back to default
        return;
    }

    // Create new marker
    const marker = addMarker(user);
    if (marker) {
        button.style.color = color;  // toggle to active color
        // Bring it to front
        marker.setZIndexOffset(1000);
        currentFrontMarker = marker;

        const [lat, lng] = user.last_known_location.split(",");
        map.setView([parseFloat(lat), parseFloat(lng)], map.getMaxZoom() || 18, { animate: true });
    }
};


function addMarker(user) {
    const [lat, lng, ts] = user.last_known_location.split(",");
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return null;

    const icon = user.isactive ? blueIcon : redIcon;
    const [datePart, timePart] = String(ts).split("T");
    const cleanTime = timePart?.split(".")[0] || "";

    const popupHtml = `
        <div style="text-align:center;">
            <b>${user.username}</b></div>
            ${user.isactive ? "🟢 Active" : "🔴 Last Active"}<br>
            📅 ${datePart}<br>
            🕒 ${cleanTime}
        
    `;

    const marker = L.marker([parsedLat, parsedLng], { icon })
        .addTo(map)
        .bindPopup(popupHtml, {
            autoClose: false,       // ✅ don't close other popups
            closeOnClick: false,    // ✅ clicking map won't close
            closeButton: true       // ✅ show the X close button
        })
        .openPopup();              // ✅ open it immediately
map.setView([lat, lng], map.getMaxZoom() || 18, { animate: true });
    userMarkers[user.id] = marker;
    return marker;
}

function refreshMarkers() {
    // Remove all existing markers from the map
    for (const id in userMarkers) map.removeLayer(userMarkers[id]);
    Object.keys(userMarkers).forEach(id => delete userMarkers[id]);

    // Add markers for users with valid last_known_location
    Object.values(users).forEach(user => {
        if ((showAllMode || user.isactive) && user.last_known_location) {
            const locParts = user.last_known_location.split(",");
            if (locParts.length >= 2 && !isNaN(parseFloat(locParts[0])) && !isNaN(parseFloat(locParts[1]))) {
                addMarker(user);
            }
        }
    });

    console.log(`🗺 Refreshed markers — mode: ${showAllMode ? "All" : "Active only"}`);
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
