import React from 'react';
import { db, userLayout } from '../../pages/HomePage';
import { UidContext } from '../../App';

function StyleMenu() {
  const {uid} = React.useContext(UidContext);
  const {layout} = React.useContext(userLayout);

  const handleOpenNotesClick = () => {
    const resizeBatch = db.batch();
    if (!layout.isNotesOpen) {
      resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
        { isNotesOpen: true }, { merge: true }
      );
    }
    if (parseInt(layout.calendarHeight) > 90) {
      resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
        { calendarHeight: '60vh' }, { merge: true }
      );
    }
    resizeBatch.commit();
  }

  return (<div
    style={{
      height: '56px',
      position: 'absolute',
      bottom: '16px',
      borderRadius: '8px',
      backgroundColor: 'white',
      width: '800px',
      boxShadow: '4px 4px 16px rgb(0 0 0 / 5%)',
      padding: '8px',
      zIndex: '20',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <p>Style Menu</p>
    <button onClick={handleOpenNotesClick}>Open Notes</button>
  </div>)
}

export default StyleMenu;