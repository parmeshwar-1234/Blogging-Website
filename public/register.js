document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (response.ok) {
                alert('Registration successful! You can now log in.');
                window.location.href = '/admin/login.html';
            } else {
                const data = await response.json();
                errorMessage.textContent = data.message || 'Registration failed.';
            }
        } catch (error) {
            console.error('Error during registration fetch:', error);
            errorMessage.textContent = 'Network error or server unreachable.';
        }
    });
});
