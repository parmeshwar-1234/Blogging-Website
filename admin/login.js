document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                window.location.href = '/admin'; // Redirect to the admin dashboard
            } else {
                const data = await response.json();
                errorMessage.textContent = data.message || 'Login failed.';
            }
        } catch (error) {
            console.error('Error during login fetch:', error);
            errorMessage.textContent = 'Network error or server unreachable.';
        }
    });
});