import { DocumentListenerContext } from "components/DocumentEventListener/context";
import { ContentState, Editor, EditorState, getDefaultKeyBinding } from "draft-js";
import { FeatherContext } from "pages/HomePage/context";
import React, { MouseEventHandler } from "react";
import { db } from "utils/globalContext";
import { useEditorUpdater } from "utils/useEditorUtil";
import { UndoRedoContext } from "utils/useUndoRedo";
import { FileBase } from "../data";
import DirectoryInode from "./DirectoryInode";
import PinboardInode from "./PinboardInode";

import 'draft-js/dist/Draft.css';
import style from './inodes.module.scss';
import { useDocumentEventListeners } from "components/DocumentEventListener/useDocumentEventListeners";

function Inode({ inodePath, file } : { inodePath: string, file: FileBase }) {
  const { notes: { noteTabs } } = React.useContext(FeatherContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { addUndo } = React.useContext(UndoRedoContext);

  const [state, setState] = React.useState<'normal' | 'edit' | 'dragging'>('normal');
  const { registerFocus, deregisterFocus } = useDocumentEventListeners(dispatchListeners);
  const [forceOpen, setForceOpen] = React.useState<boolean>(false);

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(file.name);

  const isOpen = React.useMemo(() => noteTabs.find(note => note.inodePath === inodePath)?.isOpen || false, [noteTabs, inodePath]);

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

  const handleClickEdit = () => {
    // expect that pointer event none if tab not open
    if (state === 'normal') {
      setState('edit')
      registerFocus('inode-focus', [
        {
          type: 'mousedown',
          callback: () => {
            if (editor.current) setState('normal')
            deregisterFocus('inode-focus')
          }
        }
      ])
    } else if (state === 'edit') {
      editor.current?.focus();
    }
  }

  const handleMouseDownEdit: MouseEventHandler = (e) => {
    // expect that pointer event none if tab not open
    if (state === 'edit') {
      e.stopPropagation();
    }
  }

  const handleBlur = () => {
    setState('normal')
    deregisterFocus('inode-focus')
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

  const editorProp = {
    ref: editor,
    setForceOpen,
    component: (
      <div
        style={(!isOpen && !forceOpen) ? {pointerEvents: 'none'} : {}}
        className={style.editorContainer}
        fp-state={state}
        onClick={handleClickEdit}
        onMouseDown={handleMouseDownEdit}
      >
        <Editor
          ref={editor}
          readOnly={(!isOpen || state !== 'edit') && !forceOpen}
          editorState={editorState} 
          onChange={setEditorState}
          keyBindingFn={checkKey}
          onBlur={handleBlur}
        />
      </div>
    ),
  }

  switch (file.type) {
    case 'dir': return <DirectoryInode inodePath={inodePath} file={file} editor={editorProp}/>
    case 'pinboard': return <PinboardInode inodePath={inodePath} file={file} editor={editorProp}/>
  }
  return null
}

export default Inode;