// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries



// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

export const firebaseConfig = {
  apiKey: "AIzaSyAZp_SDfUg0Gl-f5-52kQeCBWCHyLyBd_A",
  authDomain: "streamtrackergame.firebaseapp.com",
  projectId: "streamtrackergame",
  storageBucket: "streamtrackergame.firebasestorage.app",
  messagingSenderId: "47409702065",
  appId: "1:47409702065:web:e0010d51b1b0ce69d22e90",
  measurementId: "G-0HK9J9JMVB"
};



// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);