// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLrlOBz5HUWsBzv_baTcFdcP2-H1k5IMc",
  authDomain: "calculadora-e1803.firebaseapp.com",
  projectId: "calculadora-e1803",
  storageBucket: "calculadora-e1803.appspot.com", // Corrigido aqui, faltava o '.appspot.com'
  messagingSenderId: "377205630531",
  appId: "1:377205630531:web:1a45008c95f6c5c94816f6",
  measurementId: "G-EMT5C6M8PY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Firestore and get a reference to the service
const db = getFirestore(app);

export { auth, db };
