import { ContentState, convertFromRaw, convertToRaw, DraftHandleValue, Editor, EditorState, RichUtils } from "draft-js";
import React from "react";
import { KeyboardEventHandler } from "react";
import { MouseEventHandler } from "react";
import { db, UidContext } from "utils/globalContext";

import style from './sideNotes.module.scss';

let pos1, pos2, pos3: number, pos4 = 0;

function Note({ id, content, position, size } : any) {
  const note = React.createRef<HTMLDivElement>();
  const editor = React.createRef<Editor>();
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    ),
  );
  const [editing, setEditing] = React.useState(false);
  const {uid} = React.useContext(UidContext);

  const handleKeyCommand = (command: string): DraftHandleValue => {
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
    editor.current?.focus();
  }
  const handleBlur = () => {
    setEditing(false);
    saveNoteContent();
  }

  const handleMouseDownDrag: MouseEventHandler = e => {
    if (editing) return;
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('mouseup', closeDragElement);
    document.addEventListener('mousemove', elementDrag);
  }

  const handleMouseDownResize: MouseEventHandler = e => {
    if (editing) return;
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('mouseup', closeResizeElement);
    document.addEventListener('mousemove', elementResize);
  }

  const elementDrag = (e: MouseEvent) => {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    if (!note.current) return;
    if (note.current.offsetTop - pos2 >= 0) pos4 = e.clientY;
    if (note.current.offsetLeft - pos1 >= 8) pos3 = e.clientX;
    note.current.style.top = Math.max(0, note.current.offsetTop - pos2) + "px";
    note.current.style.left = Math.max(8, note.current.offsetLeft - pos1) + "px";
  }

  const elementResize = (e: MouseEvent) => {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    if (!note.current) return;
    if (parseInt(getComputedStyle(note.current).height) - pos2 >= 25) pos4 = e.clientY;
    if (parseInt(getComputedStyle(note.current).width) - pos1 >= 25) pos3 = e.clientX;
    note.current.style.height = Math.max(25, parseInt(getComputedStyle(note.current).height) - pos2) + "px";
    note.current.style.width = Math.max(25, parseInt(getComputedStyle(note.current).width) - pos1) + "px";
  }

  const closeDragElement = () => {
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
    if (!note.current) return;
    db.doc(`users/${uid}/notes/${id}`).update(
      'position.left', note.current.style.left,
      'position.top', note.current.style.top
    );
  }

  const closeResizeElement = () => {
    document.removeEventListener('mouseup', closeResizeElement);
    document.removeEventListener('mousemove', elementResize);
    if (!note.current) return;
    db.doc(`users/${uid}/notes/${id}`).update(
      'size.width', note.current.style.width,
      'size.height', note.current.style.height
    );
  }

  const handleKeyDown: KeyboardEventHandler = e => {
    if (e.currentTarget !== e.target) return;

    if (e.key === 'Backspace') {
      e.stopPropagation();
      db.doc(`users/${uid}/notes/${id}`).delete();
    }
  }

  return (<div 
    ref={note}
    className={style.sidenote} 
    data-state={`${editing}`}
    onClick={e => {
      e.stopPropagation();
      if(e.detail === 2) getFocus();
    }}
    tabIndex={0}
    style={{left: position && position.left, top: position && position.top, width: size && size.width, height: size && size.height}}
    onKeyDown={handleKeyDown}
  >
    <div onMouseDown={handleMouseDownDrag} className={style.borderCapture + ' ' + style.top}/>
    <div onMouseDown={handleMouseDownDrag} className={style.borderCapture + ' ' + style.right}/>
    <div onMouseDown={handleMouseDownDrag} className={style.borderCapture + ' ' + style.bottom}/>
    <div onMouseDown={handleMouseDownDrag} className={style.borderCapture + ' ' + style.left}/>
    <div onMouseDown={handleMouseDownResize} className={style.borderCapture + ' ' + style.bottomRight} style={{cursor: 'nwse-resize'}}/>
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