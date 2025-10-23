function updateDateTime() {
    const now = new Date();
    const datetime = now.toLocaleString();
    document.getElementById('datetime').textContent = datetime;
}

updateDateTime();
setInterval(updateDateTime, 1000);
