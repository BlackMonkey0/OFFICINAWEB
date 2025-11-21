// firebase.js - inicializa Firebase y Firestore
// REEMPLAZA el objeto abaixo con tu firebaseConfig desde la consola de Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Inicializar Firebase app (compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// Exportamos referencias globalmente
window.firestoreDB = db;
console.log('Firebase inicializado (Firestore). Reemplaza firebaseConfig con tus credenciales.');