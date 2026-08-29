import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyATX9F09N8nSflxDct3Q6IQGaAK52OATCs",
  authDomain: "firetrainingsurvey-6a37c.firebaseapp.com",
  projectId: "firetrainingsurvey-6a37c",
  storageBucket: "firetrainingsurvey-6a37c.firebasestorage.app",
  messagingSenderId: "991418383238",
  appId: "1:991418383238:web:42b2ee72037712efab4a07",
  measurementId: "G-3VHEM6484Z"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
