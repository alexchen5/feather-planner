import axios from 'axios';
import React from 'react';
import {
  Button,
  TextField,
  Link,
} from '@material-ui/core';

function LoginPage({ newToken, ...props }) {
	function handleSubmit(event) {
    event.preventDefault();
		const loginForm = new FormData(event.target);

		axios
			.post(`/accounts/login`, loginForm, {
				'Content-Type': `multipart/form-data; boundary=${loginForm._boundary}`,
			})
      .then((response) => {
				console.log(response);
				const data = response.data;
				if (data['status'] === 0) {
					newToken(data.token);
					props.history.push('/');
				} else {
					alert(`Login failed with status code ${data['status']}`);
				}
      })
      .catch((err) => {console.log(err)})
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
			<Link href="/register">
				{"Don't have an account? Register"}
			</Link>
		</form>
	)
}

export default LoginPage;