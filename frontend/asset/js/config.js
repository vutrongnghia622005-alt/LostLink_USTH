window.LOSTLINK_API_URL = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
)
    ? 'http://localhost:3000'
    : 'https://lostlink-usth-backend.onrender.com';