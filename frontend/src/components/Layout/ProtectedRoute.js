import React, { useEffect } from 'react';
import axios from 'axios';
import { Redirect, Route } from 'react-router-dom';
import AuthContext from '../../AuthContext';

function ProtectedRoute(props) {
  const token = React.useContext(AuthContext);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState(false);

  useEffect(() => {
    axios
    .get('/accounts/checkin', {
      params: {
        token,
      }
    })
    .then(({data}) => {
      const {success} = data;
      setStatus(success);
    })
    .finally(() => setLoading(false));
  }, [token]);
  
  return <>{loading ? <div>Loading</div>:
    (status ? <Route {...props} /> : <Redirect to="/login" />)}</>;
}

export default ProtectedRoute;
