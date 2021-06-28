import React, { useEffect } from 'react';
import axios from 'axios';
import { Redirect, Route } from 'react-router-dom';

function ProtectedRoute(props) {
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState(false);

  useEffect(() => {
    axios
      .get('/accounts/checkin')
      .then(({data}) => {
        const {success} = data;
        setStatus(success);
      })
      .finally(() => setLoading(false));
  }, []);
  
  return <>{loading ? <div>Loading</div>:
    (status ? <Route {...props} /> : <Redirect to="/login" />)}</>;
}

export default ProtectedRoute;
