import React from 'react';

import { db, UidContext } from "globalContext";
import Note from './Note';

function SideNotes() {
  const [notes, setNotes] = React.useState([] as any[]);
  const {uid} = React.useContext(UidContext);
  // const {layout} = React.useContext(userLayout);

  React.useEffect(() => {
    db.collection(`users/${uid}/notes`)
      .onSnapshot(snapshot => {
        const newNotes: any[] = [];
        snapshot.forEach(doc => {
          newNotes.push({
            note_id: doc.id,
            content: doc.data().content,
            position: doc.data().position,
            size: doc.data().size,
          });
        });
        setNotes(newNotes);
      })
  }, [uid]);

  // const handleResizeDrag = e => {
  //   e.preventDefault();
  //   pos4 = e.clientY;
  //   document.addEventListener('mouseup', closeResizeNotes);
  //   document.addEventListener('mousemove', resizeNotes);
  // }

  // const resizeNotes = e => {
  //   e.preventDefault();
  //   pos2 = pos4 - e.clientY;
  //   let newHeight = (parseInt(getComputedStyle(calendarHeight).height) - pos2) * 100 / window.innerHeight;
  //   if (newHeight >= 0 && newHeight <= 100) pos4 = e.clientY;
  //   calendarHeight.style.height = Math.min(100, Math.max(0, newHeight)) + "vh";
  // }

  // const closeResizeNotes = () => {
  //   document.removeEventListener('mouseup', closeResizeNotes);
  //   document.removeEventListener('mousemove', resizeNotes);
    
  //   const resizeBatch = db.batch();
  //   if (calendarHeight.style.height === '0vh') {
  //     if (!layout.isNotesExpanded) {
  //       resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
  //         { isNotesExpanded: true }, { merge: true }
  //       );
  //     }
  //     resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
  //       { calendarHeight: '60vh' }, { merge: true }
  //     );
  //   } else if (calendarHeight.style.height === '100vh') {
  //     if (layout.isNotesOpen) {
  //       resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
  //         { isNotesOpen: false }, { merge: true }
  //       );
  //     }
  //     resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
  //       { calendarHeight: '60vh' }, { merge: true }
  //     );
  //   } else {
  //     if (!layout.isNotesOpen) {
  //       resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
  //         { isNotesOpen: true }, { merge: true }
  //       );
  //     }
  //     if (layout.isNotesExpanded) {
  //       resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
  //         { isNotesExpanded: false }, { merge: true }
  //       );
  //     }
  //     resizeBatch.set(db.doc(`users/${uid}/preferences/layout`), 
  //       { calendarHeight: calendarHeight.style.height }, { merge: true }
  //     );
  //   }
  //   resizeBatch.commit();
  // }

  // const handleAddClick = () => {
  //   db.collection(`users/${uid}/notes`).add({
  //     content: '',
  //     position: {
  //       left: '8px',
  //       top: '8px',
  //     },
  //     size: {
  //       width: '160px',
  //       height: '180px',
  //     },
  //   })
  // }

  // const handleCloseClick = () => {
  //   db.doc(`users/${uid}/preferences/layout`).set(
  //     { isNotesOpen: false }, { merge: true }
  //   );
  // }

  // const handleExpandClick = () => {
  //   db.doc(`users/${uid}/preferences/layout`).set(
  //     { isNotesExpanded: true }, { merge: true }
  //   );
  // }

  // const handleCollapseClick = () => {
  //   db.doc(`users/${uid}/preferences/layout`).set(
  //     { isNotesExpanded: false }, { merge: true }
  //   );
  // }

  return (
    <>
      <div style={{position: 'relative', textAlign: 'right'}}>
        <div 
          // onMouseDown={handleResizeDrag} 
          className={'border-capture top'} style={{pointerEvents: 'auto', cursor: 'row-resize'}}/>
        {/* <IconButton size='small' onClick={handleAddClick}><AddIcon/></IconButton>
        {layout.isNotesExpanded ? 
          <IconButton size='small' onClick={handleCollapseClick}><ExpandMoreIcon/></IconButton>
          : 
          <IconButton size='small' onClick={handleExpandClick}><ExpandLessIcon/></IconButton>
        }
        <IconButton size='small' onClick={handleCloseClick}><CloseIcon/></IconButton> */}
      </div>
      <div id={'sidenote-container'}>
        {notes.map(note => <Note 
          key={note.note_id} 
          id={note.note_id} 
          content={note.content || ''} 
          position={note.position || {}}
          size={note.size || {}}
        />)}
      </div>
    </>
  )
}

export default SideNotes;