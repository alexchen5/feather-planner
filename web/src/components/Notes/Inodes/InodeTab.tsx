import { DocumentListenerContext } from "components/DocumentEventListener/context";
import { ContentState, Editor, EditorState, getDefaultKeyBinding } from "draft-js";
import { FeatherContext } from "pages/HomePage/context";
import React, { MouseEventHandler } from "react";
import { db } from "utils/globalContext";
import { useEditorFocus, useEditorUpdater } from "utils/useEditorUtil";
import { UndoRedoContext } from "utils/useUndoRedo";
import { File } from "../data";

import CloseIcon from '@material-ui/icons/Close';

import 'draft-js/dist/Draft.css';
import style from './inodes.module.scss';
import { Icon, IconButton } from "@material-ui/core";

function InodeTab({ file, inodePath, isOpen }: { file: File, inodePath: string, isOpen: boolean }) {
  const { notes: { tabs } } = React.useContext(FeatherContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { addUndo } = React.useContext(UndoRedoContext);

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(file.name);
  const [ isFocused, declareFocus, declareBlur ] = useEditorFocus(dispatchListeners, 'tab-focus');

  /**
   * Take the necessary steps to submit content changes to the db
   * @param val the current text content
   */
  const submitContentChanges = (newName: string) => {
    if (!newName || newName === file.name) { // reset editor state and do nothing if we have an empty title
      // weird glitch where text isnt updated solved with timeout
      setTimeout(() => {
        if (editor.current)
          setEditorState(EditorState.createWithContent(ContentState.createFromText(file.name)));
      }, 150);
      return;
    }
    
    const redo = async () => {
      db.doc(inodePath).set({ name: newName }, { merge: true });
    };
    const undo = async () => {
      db.doc(inodePath).set({...file.restoreData});
    }
    
    redo(); // execute update
    addUndo({undo, redo})
  };

  const handleClick = () => {
    tabs.open(inodePath, file.type);
  }

  const handleClickEdit = () => {
    if (isOpen) editor.current?.focus();
  }

  const handleCloseClick: MouseEventHandler = (e) => {
    e.stopPropagation();
    tabs.close(inodePath, file.type)
  }

  const handleFocus = () => {
    declareFocus();
  }

  const handleBlur = () => {
    declareBlur()
    const text = editorState.getCurrentContent().getPlainText(' ').replace('\n', ' ').trim();
    submitContentChanges(text);
  }

  /**
   * Callback on every key, to check that no new line characters are entered
   * @param e 
   * @returns 
   */
   const checkKey = (e: React.KeyboardEvent): string | null => {
    if (e.key === 'Enter' && !e.shiftKey) {
      editor.current?.blur(); 
      return 'submit';
    } else if (e.key === 'Enter') {
      return 'none';
    }
    return getDefaultKeyBinding(e);
  }

  return (
    <div
      className={style.tab}
      fp-state={isOpen ? 'open' : 'closed'}
      onClick={handleClick}
    >
      <div
        className={style.editorContainer}
        fp-state={isFocused ? 'edit' : 'normal'}
        onClick={handleClickEdit}
      >
        <Editor
          ref={editor}
          readOnly={!isOpen}
          editorState={editorState} 
          onChange={setEditorState}
          keyBindingFn={checkKey}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      <IconButton size='small' onClick={handleCloseClick}><CloseIcon/></IconButton>
    </div>
  )
}

export default InodeTab;