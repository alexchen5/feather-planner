import React, { useState } from "react";
import HomePage from './pages/HomePage';
import LoginPage from "pages/LoginPage";
import { UidContext } from "globalContext";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import firebase from "firebase/app";

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

  return (<>{
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
            path={["/", "/calendar", "/notes"]}
            render={() => {
              if (isLoadingUid) return <></>;
              if (!uid) return <LoginPage/>;
              return <HomePage/>;
            }}
          />
        </Switch>
      </BrowserRouter>
    </UidContext.Provider>
          
  }</>);
}

export default App;
