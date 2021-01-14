import axios from 'axios';
import React from 'react';
import {
  Button,
  TextField,
} from '@material-ui/core';

function RegisterPage({ setAuth, ...props }) {
	function handleSubmit(event) {
		event.preventDefault();
		const loginForm = new FormData(event.target);

		axios
			.post(`/accounts/register`, loginForm, {
				'Content-Type': `multipart/form-data; boundary=${loginForm._boundary}`,
			})
	  .then((response) => {
		const data = response.data;
		setAuth(data.token);
		props.history.push('/');
	  })
	  .catch((err) => {})
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
				id="fullname"
				label="Full Name"
				name="fullname"
				type="text"
				autoFocus
			/>
			<TextField
				variant="outlined"
				margin="normal"
				required
				fullWidth
				id="username"
				label="Username"
				name="username"
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
				Sign Up
			</Button>
		</form>
	)
}

export default RegisterPage;