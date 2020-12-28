import axios from 'axios';
import React from 'react';
import {
  Button,
  TextField,
} from '@material-ui/core';

function LoginPage({ setAuth, ...props }) {
	function handleSubmit(event) {
    event.preventDefault();
		const loginForm = new FormData(event.target);

		axios
			.post(`/auth/login`, loginForm, {
				'Content-Type': `multipart/form-data; boundary=${loginForm._boundary}`,
			})
      .then((response) => {
        console.log(response);
        const data = response.data;
        setAuth(data.token, data.u_id);
        props.history.push('/');
      })
      .catch((err) => {})
		
		console.log([...loginForm.entries()]);
  }

	return (
		<form onSubmit={handleSubmit}>
			<TextField
				variant="outlined"
				margin="normal"
				required
				fullWidth
				id="email"
				label="Email"
				name="email"
				type="text"
				autoFocus
			/>
			<TextField
				variant="outlined"
				margin="normal"
				required
				fullWidth
				name="password"
				label="Password"
				type="password"
				id="password"
				autoComplete="current-password"
			/>
			<Button type="submit" fullWidth variant="contained" color="primary">
				Sign In
			</Button>
		</form>
	)
}

export default LoginPage;