// Firebase Cloud Messaging Service Worker
// This file handles background notifications when the app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyBRRTFirNr_n0qFbHdxCathBcuas1qXElM",
    authDomain: "resolve-fast.firebaseapp.com",
    projectId: "resolve-fast",
    storageBucket: "resolve-fast.firebasestorage.app",
    messagingSenderId: "689892721656",
    appId: "1:689892721656:web:35037711c3cd85963d0c0d",
    measurementId: "G-LTQLR7JZEZ"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data,
        tag: payload.data?.type || 'notification',
        requireInteraction: false,
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);

    event.notification.close();

    // Navigate to the app when notification is clicked
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }

            // Otherwise, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
