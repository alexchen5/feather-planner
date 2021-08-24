import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from "firebase/app";

// Configure FirebaseUI.
const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
		firebase.auth.GoogleAuthProvider.PROVIDER_ID,
		// firebase.auth.EmailAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
		signInSuccessWithAuthResult: () => false,
  },
};

function LoginPage() {
	return (
    <div>
			<h1>Welcome to Feather Planner</h1>
			<p>Please sign-in:</p>
			<StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
		</div>
	)
}

export default LoginPage;