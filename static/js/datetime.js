function updateDateTime() {
    const now = new Date();
    const datetime = now.toLocaleString();
    document.getElementById('datetime').textContent = datetime;

}

// Initial call and periodic update every second
updateDateTime();
setInterval(updateDateTime, 1000);
