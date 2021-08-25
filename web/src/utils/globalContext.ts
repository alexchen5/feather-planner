import React from "react";
import firebase from "firebase/app";
import "firebase/firestore";

export const UidContext = React.createContext({} as { uid: string | false });

export const IS_CACHE_ON: boolean = true; // turn off cache to prevent reading and writing to localStorage

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQ-nWGP97PXbIx8sonXoYCjpGy3_wLWfo",
    authDomain: "featherplanner.com",
    databaseURL: "https://project-2020-70e99-default-rtdb.firebaseio.com",
    projectId: "project-2020-70e99",
    storageBucket: "project-2020-70e99.appspot.com",
    messagingSenderId: "598105264099",
    appId: "1:598105264099:web:cf8975a7fe33cf50141ad6",
    measurementId: "G-FZCWXV0583"
};
firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();
