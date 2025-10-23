document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.textContent = "👁️";
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = "🙈";
      } else {
        input.type = 'password';
        btn.textContent = "👁️";
      }
    });
  });
});
