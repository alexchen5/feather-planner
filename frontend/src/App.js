import React, { useEffect } from "react";
import axios from 'axios';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import ProtectedRoute from './components/Layout/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// axios.defaults.baseURL = 'https://ancient-dusk-81301.herokuapp.com/';
axios.defaults.baseURL = 'http://127.0.0.1:60823/';
axios.defaults.headers.put['Content-Type'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';
axios.defaults.headers.delete['Content-Type'] = 'application/json';

// export const AuthContext = React.createContext();

function App() {
  document.title = 'Project 2020';

  const [token, setToken] = React.useState(
    localStorage.getItem('token')
  );
  const [loading, setLoading] = React.useState(true);
  function newToken(t) {
    localStorage.setItem('token', t);
    setToken(t);
  }

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, [token]);

  return (
    // <AuthContext.Provider value={{token, newToken}}>
      loading ? <div>Loading</div> :
      <Router>
        <Switch>
          <Route
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
          <ProtectedRoute exact path="/" component={HomePage} />
        </Switch>
      </Router>
    // </AuthContext.Provider>
  );
}

export default App;
