import firebase from "firebase/app";

function Profile() {

  return (
    <div style={{ textAlign: 'center', paddingTop: '40px' }}>
      <button onClick={() => firebase.auth().signOut()}>Sign Out</button>
    </div>
  )
}

export default Profile;