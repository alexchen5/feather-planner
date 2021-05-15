import React from 'react';

import '../../SideNotes.css'

import { db } from "../../pages/HomePage";
import Note from './Note';
import { UidContext } from '../../App';
import AddNote from './AddNote';


function SideNotes() {
  const [notes, setNotes] = React.useState([]);
  const {uid} = React.useContext(UidContext);

  React.useEffect(() => {
    db.collection(`users/${uid}/notes`)
      .onSnapshot(snapshot => {
        const newNotes = [];
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

  return (
    <div id={'sidenote-container'}>
      <AddNote/>
      {notes.map(note => <Note 
        key={note.note_id} 
        id={note.note_id} 
        content={note.content || ''} 
        position={note.position || {}}
        size={note.size || {}}
      />)}
    </div>
  )
}

export default SideNotes;