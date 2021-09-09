import firebase from "firebase/app";

function Profile() {

  return (
    <button onClick={() => firebase.auth().signOut()}>Sign Out</button>
  )
}

export default Profile;