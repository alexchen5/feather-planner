import React from 'react';
import { AppContext, db, UidContext } from 'utils/globalContext';
import { UndoRedoAction, UndoRedoContext, useUndoRedo } from 'utils/useUndoRedo';
import PinboardComponent from './Pinboard';
import style from './styles/index.module.scss';
import { DocumentListenerContext } from 'components/DocumentEventListener/context';
import { useDocumentEventListeners } from 'components/DocumentEventListener/useDocumentEventListeners';
import { key } from 'utils/keyUtil';
import Inode from './Inodes';
import UndoRedo from 'components/UndoRedo';
import useCurrent from 'utils/useCurrent';
import { useHistory } from 'react-router-dom';
import TabContainer from './Inodes/TabContainer';

const saveUndoRedo: { current: { undo: UndoRedoAction[], redo: UndoRedoAction[] } } = { current: { undo: [], redo: [] } };

function Notes() {
  const { notes: {allNotes, noteTabs, inodes: { open }} } = React.useContext(AppContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { registerFocus, deregisterFocus } = useDocumentEventListeners(dispatchListeners);

  const {uid} = React.useContext(UidContext);
  const history = useHistory();

  const undoRedo = useUndoRedo(saveUndoRedo);
  const undo = React.useRef<() => void>(() => {})
  const redo = React.useRef<() => void>(() => {})
  useCurrent(undo, undoRedo.undo)
  useCurrent(redo, undoRedo.redo)

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
            undo.current();
          } else if (key.isMeta(e) && e.shiftKey && e.key === 'z') {
            redo.current();
          } else if (key!.isCommand(e) && e.key === 'c') {
            history.push('/');
          }
        }
      }
    ])
    return () => deregisterFocus('notes-base-focus');
    // eslint-disable-next-line
  }, [registerFocus, deregisterFocus])

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

    undoRedo.addAction({ undo, redo });
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

    undoRedo.addAction({ undo, redo });
  }

  return (
    <UndoRedoContext.Provider value={undoRedo}>
      <div style={{display: 'flex', justifyContent: 'end', paddingRight: '24px'}}>
        <UndoRedo undo={{ callback: undoRedo.undo, length: undoRedo.undoLength }} redo={{ callback: undoRedo.redo, length: undoRedo.redoLength }}/>
      </div>
      <div className={style.root}>
        <div className={style.directory}>
          <button onClick={addPinboard}>Add pinboard</button>
          <button onClick={addHomeDirectory}>Add folder</button>
          { homeNodes.map(path => allNotes[path] ? <Inode key={path} inodePath={path} file={allNotes[path]!}/> : null) }
        </div>
        <div className={style.notesContainer}>
          <TabContainer/>
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