import React, { useState } from "react";
import LoginPage from "pages/Profile/LoginPage";
import { AppContext, UidContext } from "utils/globalContext";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import firebase from "firebase/app";
import DocumentEventListener from "components/DocumentEventListener";
import { useCalendar } from "pages/Calendar/data";
import { useNotes } from "pages/Notes/data";
import PlanStyleListener from "pages/Calendar/listeners/PlanStyleListener";
import DateRangeListener from "pages/Calendar/listeners/DateRangeListener";
import { DirectoryListener, InodeListener, PinboardListener } from "pages/Notes/Listeners";
import Menu from "components/Menu";
import Notes from "pages/Notes";
import CalendarComponent from "pages/Calendar";
import Profile from "pages/Profile";

import style from 'app.module.scss';

/**
 * Wrapper for our entire app, which can deal with the logged in component
 * @returns our app
 */
function MainApp() {
  const { uid } = React.useContext(UidContext);

  const user = React.useMemo(() => firebase.auth().currentUser, []);
  const calendar = useCalendar();
  const notes = useNotes(uid);

  if (user === null) {
    console.error('Expected user to be logged in');
    return null;
  }

  return (
    <AppContext.Provider value={{ calendar, notes, user }}>
      <div className={style.root}> 
        <Menu/>
        <div className={style.body}>
          <Switch>
            <Route
              exact
              path='/notes'
              render={() => <Notes/>}
            />
            <Route
              exact
              path='/profile'
              render={() => <Profile/>}
            />
            <Route
              exact
              path={['/', 'calendar']}
              render={() => 
                <CalendarComponent/>
              }
            />
          </Switch>
        </div>
      </div>
      {<PlanStyleListener/>}
      {calendar.state.dateRanges.map(range => <DateRangeListener key={range.startDate} startDate={range.startDate} endDate={range.endDate}/>)}
      {notes.listeners.inodeListeners.map(path => <InodeListener key={path} inodePath={path}/>)}
      {notes.listeners.directoryListeners.map(path => <DirectoryListener key={path} inodePath={path}/>)}
      {notes.listeners.pinboardListeners.map(path => <PinboardListener key={path} inodePath={path}/>)}
    </AppContext.Provider>
  )
}

// We deal with routing valid paths and auth here
function App() {
  const [isLoadingUid, setIsLoadingUid] = React.useState(true);
  const [uid, setUid] = useState(false as string | false); 

  // Listen to the Firebase Auth state and set the local state.
  React.useEffect(() => {
    const unregisterAuthObserver = firebase.auth().onAuthStateChanged(user => {
      setUid(!!user && user.uid);
      setIsLoadingUid(false);
    });
    return () => unregisterAuthObserver(); // Make sure we un-register Firebase observers when the component unmounts.
  }, []);

  return (
    <DocumentEventListener>
      <UidContext.Provider value={{ uid }}>
        <BrowserRouter>
          <Switch>
            <Route
              exact
              path="/koala"
              render={() => <p>koala</p>}
            />
            <Route
              exact
              path={["/", "/calendar", "/notes", "/profile"]}
              render={() => {
                // render blank page if uid is still loading
                if (isLoadingUid) return null;

                // render the login component if user is not logged in
                if (!uid) return <LoginPage/>;

                // otherwise we can display the actual app
                return <MainApp/>;
              }}
            />
          </Switch>
        </BrowserRouter>
      </UidContext.Provider>
    </DocumentEventListener>
  );
}

export default App;
