var map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

const locateControl = L.control.locate({
    setView: 'always',
    clickBehavior: { inView: 'setView', outOfView: 'setView' },
}).addTo(map);

const shareBtn = document.getElementById("shareLocationBtn");
const statusEl = document.getElementById("status");
const timestampEl = document.getElementById("timestamp");
const latEl = document.getElementById("latitude");
const lngEl = document.getElementById("longitude");

let isSharing = false;
let watchId = null;
let loc_now = null;
let repeatTimer = null;

const socket = io();
socket.on("connect", () => console.log("✅ Connected to WebSocket server"));
socket.on("disconnect", () => console.log("❌ Disconnected from WebSocket server"));

function updateLocationUI(lat, lng) {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    const latAbs = Math.abs(lat).toFixed(7);
    const lngAbs = Math.abs(lng).toFixed(7);
    timestampEl.textContent = new Date().toLocaleString();
    latEl.textContent = `${latAbs}° ${latDir}`;
    lngEl.textContent = `${lngAbs}° ${lngDir}`;
}

function sendLocation(lat, lng) {
    const payload = { latitude: lat, longitude: lng };
    socket.emit("share_location", payload);
    console.log("📍 Location emitted:", payload);
}

function handleSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    loc_now = { lat, lng };
    updateLocationUI(lat, lng);
    locateControl.start();
    sendLocation(lat, lng);
}

function handleError(err) {
    console.warn("⚠️ Geolocation error:", err);
    if (err.code === 1) {
        statusEl.textContent = "Location access denied ❌";
        statusEl.style.color = "#ff0000";
    } else if (err.code === 2) {
        statusEl.textContent = "Location unavailable ⚠️";
        statusEl.style.color = "#ff6600";
    } else if (err.code === 3) {
        statusEl.textContent = "GPS timeout — retrying...";
        statusEl.style.color = "#e6b800";
        restartWatch();
    } else {
        statusEl.textContent = "Unknown location error ❌";
    }
}

function startSharing() {
    if (!navigator.geolocation) {
        alert("Geolocation not supported by this browser.");
        return;
    }

    isSharing = true;
    shareBtn.textContent = "Stop Sharing";
    shareBtn.style.backgroundColor = "#ff4d4d";
    statusEl.textContent = "Sharing live location 🌍";
    statusEl.style.color = "#2E6F40";

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000
    });

    repeatTimer = setInterval(() => {
        if (loc_now) {
            sendLocation(loc_now.lat, loc_now.lng);
            updateLocationUI(loc_now.lat, loc_now.lng);
        } else {
            console.log("⏳ Waiting for initial GPS fix...");
        }
    }, 3000);

    console.log("📡 Started continuous tracking");
}

function stopSharing() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    if (repeatTimer) {
        clearInterval(repeatTimer);
        repeatTimer = null;
    }

    isSharing = false;
    shareBtn.textContent = "Share Location";
    shareBtn.style.backgroundColor = "#45a240";
    statusEl.textContent = "Stopped sharing 🛑";
    statusEl.style.color = "#ff0000";

    console.log("🛑 Stopped continuous tracking");

    socket.emit("stop_sharing");

}

function restartWatch() {
    console.log("🔁 Restarting GPS watch...");
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000
    });
}

shareBtn.addEventListener("click", function () {
    if (!isSharing) startSharing();
    else stopSharing();
});