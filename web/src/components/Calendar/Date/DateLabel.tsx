import React, { KeyboardEvent } from "react";
import { ContentState, convertFromRaw, convertToRaw, Editor, EditorState, getDefaultKeyBinding, RawDraftContentState } from "draft-js";
import { db, UidContext } from "globalContext";
import { CalendarDateLabel } from "types/calendar";

import style from "./date.module.scss";

function AddDateLabel({ dateStr }: { dateStr: string }) {
  const {uid} = React.useContext(UidContext);
  const editor = React.createRef<Editor>();
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createEmpty()
  );
  const [editing, setEditing] = React.useState(false);

  const handleBlur = () => {
    handleSubmission();
  }
  const getFocus = () => {
    setEditing(true);
    editor.current?.focus();
  }
  const checkSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmission();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }
  const handleSubmission = () => {
    if (editorState.getCurrentContent().hasText()) {
      db.collection(`users/${uid}/date-labels`).add({
        date: dateStr,
        content: convertToRaw(editorState.getCurrentContent()),
      });
    }
    setEditing(false);
  }

  return (
    <div 
      className={style.label}
      data-state={editing ? 'edit' : 'normal'}
      onMouseDown={e => {
        if (
          document.querySelector('[fp-role="calendar-container"]')?.contains(document.activeElement) ||
          document.querySelector('[fp-role="calendar-plan"][fp-state^="edit"]')
        ) return;
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

function EditDateLabel({ labelId, content }: { labelId: string, content: RawDraftContentState | string }) {
  const {uid} = React.useContext(UidContext);
  const editor = React.createRef<Editor>();
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    )
  );
  const [editing, setEditing] = React.useState(false);

  const handleBlur = () => {
    handleSubmission();
  }
  const getFocus = () => {
    setEditing(true);
    editor.current?.focus();
  }
  const checkSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmission();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }
  const handleSubmission = () => {
    if (editorState.getCurrentContent().hasText()) {
      db.doc(`users/${uid}/date-labels/${labelId}`).set(
        { content: convertToRaw(editorState.getCurrentContent()) }, { merge: true }
      );
    } else {
      db.doc(`users/${uid}/date-labels/${labelId}`).delete();
    }
    setEditing(false);
  }

  return (
    <div 
      className={style.label}
      data-state={editing ? 'edit' : 'normal'}
      onMouseDown={e => {
        if (document.querySelector('[fp-role="calendar-container"]')?.contains(document.activeElement)) return;
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

function DateLabel({ dateStr, label } : { dateStr: string, label: CalendarDateLabel | null }) {
  return (
  <>{
    label ?
      <EditDateLabel labelId={label.labelId} content={label.content} />
      :
      <AddDateLabel dateStr={dateStr}/>
  }</>
  )
}

export default DateLabel;