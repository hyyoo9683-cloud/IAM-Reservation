// 관리자 웹 푸시(FCM) 서비스 워커 — 이 파일은 반드시 사이트 루트(/firebase-messaging-sw.js)에 있어야 함.
// 서버(functions/lib/pushClient.js)가 notification 필드가 있는 메시지를 보내므로 알림 표시와
// 클릭 시 링크 열기는 Firebase SDK가 알아서 처리함 — 여기서는 SDK만 초기화.
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCSHQFknw_hsxNMCvrBDer3z0cB4mG347w",
  authDomain:        "iamreservation.firebaseapp.com",
  projectId:         "iamreservation",
  storageBucket:     "iamreservation.firebasestorage.app",
  messagingSenderId: "634977833386",
  appId:             "1:634977833386:web:043a9acab5b2b229f75bd3"
});

firebase.messaging();

// 앱이 열려 있을 때 push.html이 직접 띄운 알림(data.iamLink)을 누르면 해당 링크를 열기
// (서버가 보낸 알림의 클릭 처리는 위 Firebase SDK가 따로 처리함)
self.addEventListener('notificationclick', (event) => {
  const link = event.notification && event.notification.data && event.notification.data.iamLink;
  if (!link) return;
  event.notification.close();
  event.waitUntil(clients.openWindow(link));
});
