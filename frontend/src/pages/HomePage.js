import React from 'react';
import Calendar from '../components/Calendar';
import SideNotes from '../components/SideNotes';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebaseui";
import { UidContext } from '../App';
import StyleMenu from '../components/StyleMenu';

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
export const userLayout = React.createContext(null);

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
  const [layout, setLayout] = React.useState({});
  const [homeApp, setHomeapp] = React.useState('calendar');

  // Listen to the Firebase Auth state and set the local state.
  React.useEffect(() => {
    const unregisterAuthObserver = firebase.auth().onAuthStateChanged(user => {
      setUid(!!user && user.uid);
      setLoading(false);
    });
    return () => unregisterAuthObserver(); // Make sure we un-register Firebase observers when the component unmounts.
  }, [setUid]);

  React.useEffect(() => {
    if (uid) {
      db.doc(`users/${uid}/preferences/layout`)
        .onSnapshot(snapshot => {
          setLayout(snapshot.exists ? snapshot.data() : {});
        })
    }
  }, [uid]);

  if (loading) {
    return (<></>)
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
    <userLayout.Provider value={{layout, setLayout}}>
      <div id="home-layout"> 
        <div id="home-menu">
          <button onClick={() => firebase.auth().signOut()}>Sign Out</button>
          <button onClick={() => setHomeapp('calendar')}>Show Calendar</button>
          <button onClick={() => setHomeapp('notes')}>Show Notes</button>
        </div>
        <div id="home-app">
          <div style={{display: `${homeApp === 'calendar' ? 'block' : 'none'}`, height: '100%'}}><Calendar/></div>
          <div style={{display: `${homeApp === 'notes' ? 'block' : 'none'}`}}><SideNotes/></div>
        </div>
      </div>

      {/* <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          backgroundColor: 'white',
          // overflow: 'hidden',
        }}
      >
        <div
          style={{
            minWidth: '220px',
            borderRight: '1px solid var(--edge-grey)',
            // backgroundColor: '#f9f9f9', 
          }}
        >
          <p>Social Menu</p>
          
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            height: '100%',
            alignItems: 'center',
          }}
        >
          <div
            id='calendar-height'
            style={{
              height: `${layout.isNotesOpen ? (layout.isNotesExpanded ? '0px' : layout.calendarHeight || '60vh') : '100vh'}`,
              width: '100%',
            }}
          >
          </div>
          {true && <div
            style={{
              overflow: 'auto',
              borderTop: '1px solid var(--edge-grey)',
              flexGrow: '1',
              width: '100%',
              backgroundColor: 'white',
              zIndex: '1',
            }}
          >
          </div>}
          <StyleMenu/>
        </div>
      </div> */}
    </userLayout.Provider>
  );
}

export default HomePage;
