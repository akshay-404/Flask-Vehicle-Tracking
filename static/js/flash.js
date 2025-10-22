document.addEventListener("DOMContentLoaded", function () {
    const flashes = document.querySelectorAll(".flash");
    if (flashes.length > 0) {
        setTimeout(() => {
            flashes.forEach(flash => {
                flash.style.transition = "opacity 0.5s ease";
                flash.style.opacity = "0";
                setTimeout(() => flash.remove(), 500);
            });
        }, 3000);
    }
});
