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
  const [ editorState, setEditorState ] = useEditorUpdater(label?.content || '');
  const [ didChange, logChange, reset ] = useEditorChangeLogger(editorState);
  const [ isFocused, declareFocus, declareBlur ] = useEditorFocus(dispatchListeners);

  const handleBlur = () => {
    declareBlur();
    handleSubmission();
  }

  const handleClick: MouseEventHandler = () => {
    declareFocus();
    reset(editorState);
    editor.current?.focus();
  }

  const handleChange = (newState: EditorState) => {
    logChange(newState);
    setEditorState(newState);
  }

  const checkSubmit = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      declareBlur();
      handleSubmission();
      setTimeout(() => {
        // we want to blur after submission has been dealt with
        editor.current?.blur();
      }, 50);
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  const handleSubmission = () => {
    if (!didChange) return;

    label ? handleEditSubmission({...label}) // we are editing if the label exists
    : handleNewSubmission(); // otherwise we are dealing with adding a new label
  }

  const handleEditSubmission = (label: CalendarDateLabel) => {
    let action: (() => Promise<void>) | null = null, undo: (() => Promise<void>) | null = null;
    if (editorState.getCurrentContent().hasText()) { // if our edit has text
      action = async () => {
        // give an update to the db
        db.doc(`users/${uid}/date-labels/${label.labelId}`).set(
          { content: convertToRaw(editorState.getCurrentContent()) }, { merge: true }
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

  const handleNewSubmission = async () => {
    // no text in edit, we can do nothing
    if (!editorState.getCurrentContent().hasText()) return;

    const newDoc = await db.collection(`users/${uid}/date-labels`).add({
      date: dateStr,
      content: convertToRaw(editorState.getCurrentContent()),
    });

    const redo = async () => {
      db.doc(newDoc.path).set({ 
        date: dateStr,
        content: convertToRaw(editorState.getCurrentContent()),
      })
    }

    const undo = async () => {
      newDoc.delete();
    }
    addUndo({ undo, redo })
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
        onBlur={handleBlur}
        keyBindingFn={checkSubmit}
      />
    </div>
  )

}

export default DateLabel;