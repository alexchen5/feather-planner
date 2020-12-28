import React from "react";
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';

function App() {
  document.title = 'Project 2020';

  const [authDetails, setAuthDetails] = React.useState(
    localStorage.getItem('token')
  );

  function setAuth(token, u_id) {
    localStorage.setItem('token', token);
    localStorage.setItem('u_id', u_id);
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
          <ProtectedRoute exact path="/" component={HomePage} />
        </Switch>
      </Router>
    </AuthProvider>
  );
}

export default App;
