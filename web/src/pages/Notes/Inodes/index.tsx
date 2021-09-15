import { ContentState, Editor, EditorState, getDefaultKeyBinding } from "draft-js";
import React, { MouseEventHandler } from "react";
import { AppContext, db } from "utils/globalContext";
import { useEditorUpdater } from "utils/useEditorUtil";
import { UndoRedoContext } from "utils/useUndoRedo";
import { FileBase } from "../data";
import DirectoryInode from "./DirectoryInode";
import PinboardInode from "./PinboardInode";

import 'draft-js/dist/Draft.css';
import style from './inodes.module.scss';
import { DocumentFocusContext } from "components/DocumentFocusStack";

function Inode({ inodePath, file } : { inodePath: string, file: FileBase }) {
  const { notes: { noteTabs } } = React.useContext(AppContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);

  const [state, setState] = React.useState<'normal' | 'edit' | 'dragging'>('normal');
  const { mountFocus, unmountFocus } = React.useContext(DocumentFocusContext);
  const [forceOpen, setForceOpen] = React.useState<boolean>(false);

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(file.name);

  const editorStateRef = React.useRef<EditorState>(editorState);
  React.useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState])

  const isOpen = React.useMemo(() => noteTabs.find(note => note.inodePath === inodePath)?.isOpen || false, [noteTabs, inodePath]);

  /**
   * Take the necessary steps to submit content changes to the db
   * @param val the current text content
   */
  const submitContentChanges = React.useRef<(newName: string) => void>((a) => {})
  submitContentChanges.current = React.useCallback((newName: string) => {
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
  }, [addUndo, setEditorState, file.name, file.restoreData, inodePath]);

  // Use effect to submit potential changes when the state leaves edit
  React.useEffect(() => {
    if (state === 'edit') {
      return () => {
        const text = editorStateRef.current.getCurrentContent().getPlainText(' ').replace('\n', ' ').trim();
        submitContentChanges.current(text);
      }
    }
    return () => {}
  }, [state])

  const handleClickEdit = () => {
    // expect that pointer event none if tab not open
    if (state === 'normal') {
      setState('edit')
      mountFocus('inode-focus', 'notes-root', [
        {
          key: 'mousedown',
          callback: () => unmountFocus('inode-focus'),
        }
      ], () => {
        if (editor.current) setState('normal')
      })
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
    unmountFocus('inode-focus');
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