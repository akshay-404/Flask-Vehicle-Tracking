document.querySelectorAll('.input-container input').forEach(function(input) {
    var original = input.getAttribute('placeholder');
    input.addEventListener('focus', function() {
        input.setAttribute('placeholder', '');
    });
    input.addEventListener('blur', function() {
        input.setAttribute('placeholder', original);
    });
});
