import { FeatherContext } from 'pages/HomePage/context';
import React from 'react';
import { db, UidContext } from 'utils/globalContext';
import { UndoRedoContext, useUndoRedo } from 'utils/useUndoRedo';
import PinboardComponent from './Pinboard';
import style from './styles/index.module.scss';
import InodeTab from './Inodes/InodeTab';
import { DocumentListenerContext } from 'components/DocumentEventListener/context';
import { useDocumentEventListeners } from 'components/DocumentEventListener/useDocumentEventListeners';
import { key } from 'utils/keyUtil';
import Inode from './Inodes';

function Notes() {
  const { notes: {allNotes, noteTabs, inodes: { open }} } = React.useContext(FeatherContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { registerFocus, deregisterFocus } = useDocumentEventListeners(dispatchListeners);

  const {uid} = React.useContext(UidContext);
  
  const { stack, addUndo, undo, redo } = useUndoRedo();
  const undoRedoContextValue = React.useMemo(() => ({ stack, addUndo, undo, redo }), [stack, addUndo, undo, redo]);

  const homeNodes = React.useMemo<string[]>(() => {
    const ret = allNotes[`users/${uid}/inodes/index`];
    if (ret && ret.type === 'dir') {
      const paths = ret.file ? ret.file.inodePaths : [];
      return paths
    }
    return [];
  }, [uid, allNotes]);

  React.useEffect(() => {
    open(homeNodes);
  }, [homeNodes, open]);

  React.useEffect(() => {
    registerFocus('notes-base-focus', [
      {
        type: 'keydown',
        callback: (e: KeyboardEvent) => {
          if (key.isMeta(e) && !e.shiftKey && e.key === 'z') {
            undo();
          } else if (key.isMeta(e) && e.shiftKey && e.key === 'z') {
            redo();
          }
        }
      }
    ])
    return () => deregisterFocus('notes-base-focus');
    // we expect all dependancies to be memoised and never require rerendering
  }, [registerFocus, deregisterFocus, redo, undo])

  const addPinboard = async () => {
    // add new inode for the pinboard 
    const newDoc = await db.collection(`users/${uid}/inodes`).add({
      type: 'pinboard',
      name: 'Untitled Pinboard',
      roles: {

      }
    });

    // add the inode to our home directory 
    db.doc(`users/${uid}/inodes/index/dir/index`).set({
      inodePaths: [...homeNodes, newDoc.path],
    }, { merge: true });

    const redo = async () => {
      db.doc(newDoc.path).set({
        type: 'pinboard',
        name: 'Untitled Pinboard',
        roles: {
  
        }
      })
      db.doc(`users/${uid}/inodes/index/dir/index`).set({
        inodePaths: [...homeNodes, newDoc.path],
      }, { merge: true });
    }

    const undo = async () => {
      newDoc.delete();
      db.doc(`users/${uid}/inodes/index/dir/index`).set({
        inodePaths: [...homeNodes],
      }, { merge: true });
    }

    addUndo({ undo, redo });
  }

  const addHomeDirectory = async () => {
    // add new inode for the directory 
    const newDoc = await db.collection(`users/${uid}/inodes`).add({
      type: 'dir',
      name: 'Untitled Folder',
      roles: {

      }
    });

    // add the inode to our home directory 
    db.doc(`users/${uid}/inodes/index/dir/index`).set({
      inodePaths: [...homeNodes, newDoc.path],
    }, { merge: true });

    const redo = async () => {
      db.doc(newDoc.path).set({
        type: 'dir',
        name: 'Untitled Folder',
        roles: {
  
        }
      })
      db.doc(`users/${uid}/inodes/index/dir/index`).set({
        inodePaths: [...homeNodes, newDoc.path],
      }, { merge: true });
    }

    const undo = async () => {
      newDoc.delete();
      db.doc(`users/${uid}/inodes/index/dir/index`).set({
        inodePaths: [...homeNodes],
      }, { merge: true });
    }

    addUndo({ undo, redo });
  }

  return (
    <UndoRedoContext.Provider value={undoRedoContextValue}>
      <div style={{textAlign: 'right'}}>
        <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); undo() }}>Undo ({stack.undo.length})</button>
        <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); redo() }}>Redo ({stack.redo.length})</button>
      </div>
      <div className={style.root}>
        <div className={style.directory}>
          <button onClick={addPinboard}>Add pinboard</button>
          <button onClick={addHomeDirectory}>Add folder</button>
          { homeNodes.map(path => allNotes[path] ? <Inode key={path} inodePath={path} file={allNotes[path]!}/> : null) }
        </div>
        <div className={style.notesContainer}>
          <div className={style.tabsContainer}>
            { noteTabs.map(note => allNotes[note.inodePath] ? <InodeTab key={note.inodePath} file={allNotes[note.inodePath]!} inodePath={note.inodePath} isOpen={note.isOpen}/> : null) }
          </div>
          {noteTabs.map(note => {
            if (note.isOpen) {
              const file = allNotes[note.inodePath];
              if (file) switch (file.type) {
                case 'pinboard': return (
                  <div key={note.inodePath} className={style.fileRoot}>
                    <PinboardComponent inodePath={note.inodePath} pins={file.file?.pins || []}/>
                  </div>
                )
              }
            }
            return null;
          })}
        </div>
      </div>
    </UndoRedoContext.Provider>
  )
}

export default Notes;