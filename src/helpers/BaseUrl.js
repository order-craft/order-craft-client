// Follow whatever host the page itself was loaded from: on the laptop
// (localhost:3000) that's the backend directly, no cert needed; from any
// other device (phone on the LAN) it's the HTTPS proxy, same as the
// customer app already does. A single hardcoded address can't serve both.
const host = window.location.hostname
export const BaseUrl =
  host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3123' : `https://${host}:3124`
//export const BaseUrl = 'https://order-craft-backend.onrender.com'
//export const BaseUrl = 'https://api.order-craft.net'
//
