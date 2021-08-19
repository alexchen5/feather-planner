import axios from 'axios';
import React from 'react';
import {
  Button,
  TextField,
  Link,
} from '@material-ui/core';

import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from "firebase/app";
import "firebase/auth";
import "firebaseui";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQ-nWGP97PXbIx8sonXoYCjpGy3_wLWfo",
  authDomain: "project-2020-70e99.firebaseapp.com",
  databaseURL: "https://project-2020-70e99-default-rtdb.firebaseio.com",
  projectId: "project-2020-70e99",
  storageBucket: "project-2020-70e99.appspot.com",
  messagingSenderId: "598105264099",
  appId: "1:598105264099:web:cf8975a7fe33cf50141ad6",
  measurementId: "G-FZCWXV0583"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Configure FirebaseUI.
const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: 'popup',
  // // Redirect to /signedIn after sign in is successful. Alternatively you can provide a callbacks.signInSuccess function.
  signInSuccessUrl: '/',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    // firebase.auth.EmailAuthProvider.PROVIDER_ID,
  ],
};

// function LoginPage({ newToken, ...props }) {
function LoginPage() {
	return (
    <div>
      <h1>My App</h1>
      <p>Please sign-in:</p>
      <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
    </div>
	)

	// function handleSubmit(event) {
  //   event.preventDefault();
	// 	const loginForm = new FormData(event.target);

	// 	axios
	// 		.post(`/accounts/login`, loginForm, {
	// 			'Content-Type': `multipart/form-data; boundary=${loginForm._boundary}`,
	// 		})
  //     .then((response) => {
	// 			console.log(response);
	// 			const data = response.data;
	// 			if (data['status'] === 0) {
	// 				newToken(data.token);
	// 				props.history.push('/');
	// 			} else {
	// 				alert(`Login failed with status code ${data['status']}`);
	// 			}
  //     })
  //     .catch((err) => {console.log(err)})
  // }

	// return (
	// 	<div>
	// 		<div id={'firebaseui-auth-container'}></div>
	// 		<form onSubmit={handleSubmit}>
	// 			<TextField
	// 				variant="outlined"
	// 				margin="normal"
	// 				required
	// 				fullWidth
	// 				id="email"
	// 				label="Email"
	// 				name="email"
	// 				type="text"
	// 				autoFocus
	// 			/>
	// 			<TextField
	// 				variant="outlined"
	// 				margin="normal"
	// 				required
	// 				fullWidth
	// 				name="password"
	// 				label="Password"
	// 				type="password"
	// 				id="password"
	// 				autoComplete="current-password"
	// 			/>
	// 			<Button type="submit" fullWidth variant="contained" color="primary">
	// 				Sign In
	// 			</Button>
	// 			<Link href="/register">
	// 				{"Don't have an account? Register"}
	// 			</Link>
	// 		</form>
	// 	</div>
	// )
}

export default LoginPage;