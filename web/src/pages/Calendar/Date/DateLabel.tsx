import React, { KeyboardEvent, MouseEventHandler } from "react";
import { convertToRaw, Editor, EditorState, getDefaultKeyBinding } from "draft-js";
import { CalendarDateLabel } from "types/components/Calendar";
import { db, UidContext } from "utils/globalContext";
import { useEditorChangeLogger, useEditorFocus, useEditorUpdater } from "utils/useEditorUtil";
import { DocumentListenerContext } from "components/DocumentEventListener/context";

import 'draft-js/dist/Draft.css';
import style from "./date.module.scss";
import { UndoRedoContext } from "utils/useUndoRedo";

function DateLabel({ dateStr, label }: { dateStr: string, label: CalendarDateLabel | null }) {
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);

  const {uid} = React.useContext(UidContext);

  const editor = React.useRef<Editor>(null);
  const [ editorState, setEditorState ] = useEditorUpdater(label?.content || '', (newState) => {
    if (isFocused) {
      editStart(newState)
    }
  });
  // const [ didChange, logChange, reset ] = useEditorChangeLogger(editorState);
  const [ isFocused, declareFocus, declareBlur ] = useEditorFocus(dispatchListeners);

  const { editStart, editChange, editEnd } = useEditorChangeLogger(
    React.useCallback((c: EditorState) => handleSubmission.current(c), [])
  );

  const handleFocus = () => {
    editStart(editorState);
  }

  const handleBlur = () => {
    declareBlur();
    editEnd();
  }

  const handleClick: MouseEventHandler = () => {
    declareFocus();
    editor.current?.focus();
  }

  const handleChange = (newState: EditorState) => {
    editChange(newState);
    setEditorState(newState);
  }

  const checkSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      declareBlur();
      editor.current?.blur(); // handle submission in blur event
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  const handleEditSubmission = (label: CalendarDateLabel, newState: EditorState) => {
    let action: (() => Promise<void>) | null = null, undo: (() => Promise<void>) | null = null;
    if (newState.getCurrentContent().hasText()) { // if our edit has text
      action = async () => {
        // give an update to the db
        db.doc(`users/${uid}/date-labels/${label.labelId}`).set(
          { content: convertToRaw(newState.getCurrentContent()) }, { merge: true }
        )
      }
    } else { // if our edit has no text, we are deleting the label
      action = async () => {
        db.doc(`users/${uid}/date-labels/${label.labelId}`).delete();
      }
    }
    // our undo is restoring the content we started with
    undo = async () => {
      db.doc(`users/${uid}/date-labels/${label.labelId}`).set(
        { date: dateStr, content: label.content }
      )
    }

    action();
    addUndo({ undo, redo: action })
  }

  const handleNewSubmission = async (newState: EditorState) => {
    // no text in edit, we can do nothing
    if (!newState.getCurrentContent().hasText()) return;

    const newDoc = await db.collection(`users/${uid}/date-labels`).add({
      date: dateStr,
      content: convertToRaw(newState.getCurrentContent()),
    });

    const redo = async () => {
      db.doc(newDoc.path).set({ 
        date: dateStr,
        content: convertToRaw(newState.getCurrentContent()),
      })
    }

    const undo = async () => {
      newDoc.delete();
    }
    addUndo({ undo, redo })
  }

  const handleSubmission = React.useRef<(newState: EditorState) => void>(() => {})
  handleSubmission.current = (newState: EditorState) => {
    label ? handleEditSubmission({...label}, newState) // we are editing if the label exists
    : handleNewSubmission(newState); // otherwise we are dealing with adding a new label
  }

  return (
    <div 
      className={style.dateLabelContainer}
      data-state={isFocused ? 'edit' : 'normal'}
      onClick={handleClick}
    >
      <Editor
        ref={editor}
        editorState={editorState} 
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyBindingFn={checkSubmit}
      />
    </div>
  )

}

export default DateLabel;