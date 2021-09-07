import { DocumentListenerContext } from "components/DocumentEventListener/context";
import { convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RawDraftContentState, RichUtils } from "draft-js";
import React, { KeyboardEvent as ReactKeyboardEvent, MouseEventHandler } from "react";
import { db } from "utils/globalContext";
import { key } from "utils/keyUtil";
import { useEditorChangeLogger, useEditorFocus, useEditorUpdater } from "utils/useEditorUtil";
import { UndoRedoContext, useUndoRedo } from "utils/useUndoRedo";
import { PinboardPin } from "../data";

import style from './pinboard.module.scss';

function Pin({ pin }: {pin: PinboardPin}) {
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { addUndo } = React.useContext(UndoRedoContext);

  const handleEditEnd = React.useRef(() => {});

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(pin.content);
  const [isFocused, declareFocus, declareBlur] = useEditorFocus(dispatchListeners, 'pinboard-focus');
  const [ didChange, logChange, reset ] = useEditorChangeLogger(editorState);

  /**
   * Helper function to take the necessary steps to delete self
   */
  const deleteSelf = React.useCallback(() => {
    // ensure edit listeners are cleaned up
    declareBlur();

    const redo = async () => {
      db.doc(pin.docPath).delete();
    }
    const undo = async () => {
      db.doc(pin.docPath).set({...pin.restoreData});
    }
    
    redo(); // execute delete
    addUndo({undo, redo})
  }, []);

  /**
   * Take the necessary steps to submit content changes to the db
   * @param val the current text content
   */
  const submitContentChanges = (val: RawDraftContentState | false) => {
    if (!didChange) return;

    if (!val) { // run delete first
      deleteSelf();
      return;
    }
    
    const redo = async () => {
      db.doc(pin.docPath).set({ content: val }, { merge: true });
    };
    const undo = async () => {
      db.doc(pin.docPath).set({...pin.restoreData});
    }
    
    redo(); // execute update
    addUndo({undo, redo})
  }

  const handleClick: MouseEventHandler = (e) => {
    if (!isFocused) { 
      reset(editorState);

      // register edit state after the completion of a click
      declareFocus([
        {
          type: 'keydown',
          // TODO: figure out how to convince ts that this is okay
          action: handleKeyDown as (ev: DocumentEventMap[keyof DocumentEventMap]) => void, // handle document keydowns
        },
        {
          type: 'mousedown',
          action: () => handleEditEnd.current(), // blur if document receives mousedown
        }
      ]); 
    } else {
      // ensure focus if we have declared focus
      editor.current?.focus();
    }
  }

  const handleMouseDown: MouseEventHandler = (e) => {
    if (!isFocused) {
      // potentially start drag
    } else {
      e.stopPropagation() // stop mousedown from going to document
    }
  }

  handleEditEnd.current = () => {
    declareBlur();
    submitContentChanges(
      editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
    );
  }

  /**
   * Function to handle the key interactions. This is added to document through declareFocus
   */
  const handleKeyDown = React.useCallback((e: KeyboardEvent) => { // useCallback to preserve referential equality between renders 
    if (key.isDelete(e)) {
      e.stopPropagation();
      console.log('delete from backspace');
      
      deleteSelf();
    }
  }, [deleteSelf]);

  /**
   * Handle key-styling command for text edit
   * @param {string} command 
   * @returns 
   */
   const handleKeyCommand = (command: string): DraftHandleValue => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      handleChange(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  /**
   * Wrapper function to set editor state. Used to log changes so that db writes 
   * are not wasted
   * @param {EditorState} newState 
   */
  const handleChange = (newState: EditorState) => {
    logChange(newState);
    setEditorState(newState);
  }
  
  return <div
    className={style.pin}
    data-state={isFocused ? 'focus' : 'normal'}
    onClick={handleClick}
    onMouseDown={handleMouseDown}
    onKeyDown={(e) => {e.stopPropagation()}} // stop key events from within bubble out
    style={{
      left: pin.position.left + 'px', 
      top: pin.position.top + 'px',
      width: pin.size.width + 'px', 
      height: pin.size.height + 'px',
    }}
  >
    <Editor
      ref={editor}
      placeholder={'Empty Note'}
      readOnly={!isFocused}
      editorState={editorState} 
      handleKeyCommand={handleKeyCommand}
      onChange={handleChange}
    />
  </div>
}

export default Pin;