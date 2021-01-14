import React from "react";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import { AuthProvider } from './AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';

import './axios';

function App() {
  document.title = 'Project 2020';

  const [authDetails, setAuthDetails] = React.useState(
    localStorage.getItem('token')
  );

  function setAuth(token) {
    localStorage.setItem('token', token);
    setAuthDetails(token);
  }

  return (
    <AuthProvider value={authDetails}>
      <Router>
        <Switch>
          <Route
            exact
            path="/login"
            render={(props) => {
              return <LoginPage {...props} setAuth={setAuth} />;
            }}
          />
          <Route
            exact
            path="/register"
            render={(props) => {
              return <RegisterPage {...props} setAuth={setAuth} />;
            }}
          />
          <ProtectedRoute exact path="/" component={HomePage} />
        </Switch>
      </Router>
    </AuthProvider>
  );
}

export default App;
