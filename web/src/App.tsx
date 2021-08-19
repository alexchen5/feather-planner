import React, { useState } from "react";
import axios from 'axios';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import HomePage from './pages/HomePage';

axios.defaults.baseURL = 'https://ancient-dusk-81301.herokuapp.com/';
// axios.defaults.baseURL = 'http://127.0.0.1:56838/';
axios.defaults.headers.put['Content-Type'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.delete['Content-Type'] = 'application/json';

export const UidContext = React.createContext({} as UidContext);

function App() {
  const [uid, setUid] = useState(false as string | false); 

  return (
    <UidContext.Provider value={{uid, setUid}}>
      <Router>
        <Switch>
          <Route
            exact 
            path="/"
            component={HomePage}
          />
          {/* <Route
            exact
            path="/login"
            render={(props) => {
              return <LoginPage {...props} newToken={newToken} />;
            }}
          />
          <Route
            exact
            path="/register"
            render={(props) => {
              return <RegisterPage {...props} newToken={newToken} />;
            }}
          />
          <ProtectedRoute exact path="/" component={HomePage} /> */}
        </Switch>
      </Router>
    </UidContext.Provider>
  );
}

export default App;
