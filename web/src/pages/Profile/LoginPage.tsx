import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import firebase from "firebase/app";
import "firebase/auth";

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
    <div style={{ textAlign: 'center' }}>
			<h1>Welcome to Feather Planner!</h1>
			<StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
		</div>
	)
}

export default LoginPage;