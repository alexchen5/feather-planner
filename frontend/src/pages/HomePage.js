import React from 'react';
import Calendar from '../components/Calendar';
import SideNotes from '../components/SideNotes';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebaseui";
import { UidContext } from '../App';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBQ-nWGP97PXbIx8sonXoYCjpGy3_wLWfo",
  authDomain: "project-2020-70e99.firebaseapp.com",
  databaseURL: "https://project-2020-70e99-default-rtdb.firebaseio.com",
  projectId: "project-2020-70e99",
  storageBucket: "project-2020-70e99.appspot.com",
  messagingSenderId: "598105264099",
  appId: "1:598105264099:web:cf8975a7fe33cf50141ad6",
  measurementId: "G-FZCWXV0583"
};
firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();

// Configure FirebaseUI.
const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    // firebase.auth.EmailAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
    signInSuccessWithAuthResult: () => false,
  },
};

function HomePage(props) {
  const [loading, setLoading] = React.useState(true);
  const {uid, setUid} = React.useContext(UidContext);

  // Listen to the Firebase Auth state and set the local state.
  React.useEffect(() => {
    const unregisterAuthObserver = firebase.auth().onAuthStateChanged(user => {
      setUid(!!user && user.uid);
      setLoading(false);
    });
    return () => unregisterAuthObserver(); // Make sure we un-register Firebase observers when the component unmounts.
  }, [setUid]);

  if (loading) {
    return (<div>Loading</div>)
  }
  if (!uid) {
    return (
      <div>
        <h1>My App</h1>
        <p>Please sign-in:</p>
        <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
      </div>
    );
  }
  return (
    <div>
      <div style={{display: 'flex'}}>
        <Calendar/>
        <SideNotes/>
      </div>
      <button onClick={() => firebase.auth().signOut()}>Sign Out</button>
    </div>
  );
}

export default HomePage;
