// File to put stuff that is needed to be accessed globally 

import React from "react";
import firebase from "firebase/app";
import "firebase/firestore";
import { CalendarData } from "pages/Calendar/data";
import { NotesData } from "pages/Notes/data";

/**
 * The firebase id of the current user, or false if not logged in
 */
export const UidContext = React.createContext<{ uid: string | false }>({ uid: false });

/**
 * The global context of our app
 */
export const AppContext = React.createContext({} as { 
    calendar: CalendarData,
    notes: NotesData,
});

/**
 * Debugging option to turn off cache and prevent reading and writing to localStorage
 */
export const IS_CACHE_ON: boolean = true; 

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

/**
 * Our firestore database object
 */
export const db = firebase.firestore();
