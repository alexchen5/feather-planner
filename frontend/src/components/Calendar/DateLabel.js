import React from "react";
import { ContentState, convertFromRaw, convertToRaw, Editor, EditorState, getDefaultKeyBinding } from "draft-js";

import { UidContext } from "../../App";
import { db } from "../../pages/HomePage";

function AddDateLabel({ date_str }) {
  const {uid} = React.useContext(UidContext);
  const editor = React.createRef(null);
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createEmpty()
  );
  const [editing, setEditing] = React.useState(false);

  const handleBlur = e => {
    handleSubmission();
  }
  const getFocus = () => {
    setEditing(true);
    editor.current.focus();
  }
  const checkSubmit = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
      handleSubmission();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }
  const handleSubmission = () => {
    if (editorState.getCurrentContent().hasText()) {
      db.collection(`users/${uid}/date-labels`).add({
        date: date_str,
        content: convertToRaw(editorState.getCurrentContent()),
      });
    }
    setEditing(false);
  }

  return (
    <div 
      className={'datenode-label' + (editing ? ' editing' : '')}
      onMouseDown={e => {
        if (document.querySelector('#calendar-container').contains(document.activeElement)) return;
        e.stopPropagation();
        getFocus();
      }}
    >
      <Editor
        ref={editor}
        editorState={editorState} 
        readOnly={!editing}
        onChange={setEditorState}
        onBlur={handleBlur}
        keyBindingFn={checkSubmit}
      />
    </div>
  )
}

function EditDateLabel({ label_id, content }) {
  const {uid} = React.useContext(UidContext);
  const editor = React.createRef(null);
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    )
  );
  const [editing, setEditing] = React.useState(false);

  const handleBlur = e => {
    handleSubmission();
  }
  const getFocus = () => {
    setEditing(true);
    editor.current.focus();
  }
  const checkSubmit = e => {
    if (e.keyCode === 13 && !e.shiftKey) {
      handleSubmission();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }
  const handleSubmission = () => {
    if (editorState.getCurrentContent().hasText()) {
      db.doc(`users/${uid}/date-labels/${label_id}`).set(
        { content: convertToRaw(editorState.getCurrentContent()) }, { merge: true }
      );
    } else {
      db.doc(`users/${uid}/date-labels/${label_id}`).delete();
    }
    setEditing(false);
  }

  return (
    <div 
      className={'datenode-label' + (editing ? ' editing' : '')}
      onMouseDown={e => {
        if (document.querySelector('#calendar-container').contains(document.activeElement)) return;
        e.stopPropagation();
        getFocus();
      }}
    >
      <Editor
        ref={editor}
        editorState={editorState} 
        readOnly={!editing}
        onChange={setEditorState}
        onBlur={handleBlur}
        keyBindingFn={checkSubmit}
      />
    </div>
  )
}

function DateLabel({ date_str, label }) {
  return (
  <>{
    label ?
      <EditDateLabel date_str={date_str} label_id={label.label_id} content={label.content} />
      :
      <AddDateLabel date_str={date_str}/>
  }</>
  )
}

export default DateLabel;