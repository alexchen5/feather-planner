import { ContentState, convertFromRaw, convertToRaw, Editor, EditorState, RichUtils } from "draft-js";
import React from "react";
import { UidContext } from "../../App";
import { db } from "../../pages/HomePage";

let pos1, pos2, pos3, pos4 = 0;

function Note({ id, content, position }) {
  const note = React.createRef(null);
  const editor = React.createRef(null);
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    ),
  );
  const [editing, setEditing] = React.useState(false);
  const {uid} = React.useContext(UidContext);

  const handleKeyCommand = command => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  const saveNoteContent = () => {
    // if (!editorState.getCurrentContent().hasText()) db.doc(`users/${uid}/notes/${id}`).delete();
    db.doc(`users/${uid}/notes/${id}`).update(
      'content', convertToRaw(editorState.getCurrentContent())
    );
  }

  const getFocus = () => {
    setEditing(true);
    editor.current.focus();
  }
  const handleBlur = e => {
    setEditing(false);
    saveNoteContent();
  }

  const handleMouseDown = e => {
    if (editing) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('mouseup', closeDragElement);
    document.addEventListener('mousemove', elementDrag);
  }

  const elementDrag = e => {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    if (note.current.offsetTop - pos2 >= 0) pos4 = e.clientY;
    if (note.current.offsetLeft - pos1 >= 0) pos3 = e.clientX;
    note.current.style.top = Math.max(0, note.current.offsetTop - pos2) + "px";
    note.current.style.left = Math.max(0, note.current.offsetLeft - pos1) + "px";
  }

  const closeDragElement = () => {
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
    db.doc(`users/${uid}/notes/${id}`).update(
      'position.left', note.current.style.left,
      'position.top', note.current.style.top
    );
  }

  return (<div 
    ref={note}
    className={'sidenote'} 
    editing={`${editing}`}
    onClick={e => {
      e.stopPropagation();
      if(e.detail === 2) getFocus();
    }}
    onMouseDown={handleMouseDown}
    style={{left: position.left, top: position.top, minWidth: '100px', minHeight: '60px'}}
  >
    <Editor 
      ref={editor}
      editorState={editorState} 
      readOnly={!editing}
      placeholder={'Empty Note'}
      handleKeyCommand={handleKeyCommand}
      onChange={setEditorState}
      onBlur={handleBlur}
    />
  </div>)
}

export default Note;