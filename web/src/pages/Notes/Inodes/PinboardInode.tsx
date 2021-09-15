import React, { MouseEventHandler } from "react";
import { Editor } from "draft-js";

import { AppContext, db } from "utils/globalContext";
import { UndoRedoContext } from "utils/useUndoRedo";
import { FileBase } from "../data";
import { getParentInode } from "../Listeners";

import { IconButton } from "@material-ui/core";
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import EditIcon from '@material-ui/icons/Edit';

import firebase from "firebase/app";
import "firebase/firestore";

import style from './inodes.module.scss';
import { DocumentFocusContext } from "components/DocumentFocusStack";

function PinboardInodeMenu() {

  return null;
}

function PinboardInode({ inodePath, file, editor } : { inodePath: string, file: FileBase, editor: { ref: React.RefObject<Editor>, component: JSX.Element } }) {
  const { mountFocus, unmountFocus } = React.useContext(DocumentFocusContext);
  const { notes: {tabs, inodes, noteTabs} } = React.useContext(AppContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);
  const [ menuState, setMenuState ] = React.useState<'open' | 'closed'>('closed');
  
  const isOpen = React.useMemo(() => noteTabs.find(note => note.inodePath === inodePath)?.isOpen || false, [noteTabs, inodePath]);
  
  const handleClick = () => {
    tabs.open(inodePath, 'pinboard');
  }

  const handleMouseDownMenu: MouseEventHandler = (e) => {
    if (menuState === 'closed') {
      setMenuState('open')
      mountFocus('inode-menu-open', 'notes-root', [
        {
          key: 'mousedown',
          callback: () => unmountFocus('inode-menu-open'),
        }
      ], () => {
        if (true) setMenuState('closed')
      })
    } 
  }

  const deletePinboardHelper = async () => {
    const parentInode = await getParentInode(inodePath);

    tabs.close(inodePath, 'pinboard', true)
    inodes.delete(inodePath, parentInode)

    let deleteTimout: NodeJS.Timeout | null = null;
    const pins: firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>[] = []
    await db.collection(inodePath + '/pinboard').get().then((snapshot) => {
      snapshot.forEach(doc => {
        if (doc.exists) pins.push(doc)
      })
    });

    const deleteAllPins = () => {
      deleteTimout = setTimeout(() => {
        deleteTimout = null;
        pins.forEach(p => p.ref.delete());
      }, 30000); // 30 second timeout to delete all pins from db, so we dont waste writes
    }

    const restoreAllPins = () => {
      if (deleteTimout) {
        // just clear the deletion timeout if we can
        clearTimeout(deleteTimout)
        deleteTimout = null;
      } else {
        // otherwise we restore in the db
        pins.forEach(p => db.doc(p.ref.path).set(p.data()));
      }
    }

    const redo = async () => {
      deleteAllPins()
      setTimeout(() => {
        // put the state update in a timeout 
        tabs.close(inodePath, 'pinboard', true)
        inodes.delete(inodePath, parentInode)
  
        const delBatch = db.batch();
        delBatch.delete(db.doc(inodePath))
        delBatch.update(db.doc(parentInode + '/dir/index'), 'inodePaths', firebase.firestore.FieldValue.arrayRemove(inodePath))      
        delBatch.commit()
      }, 50)
    };

    const undo = async () => {
      restoreAllPins()
      const restoreBatch = db.batch();
      restoreBatch.set(db.doc(inodePath), {...file.restoreData})
      restoreBatch.update(db.doc(parentInode + '/dir/index'), 'inodePaths', firebase.firestore.FieldValue.arrayUnion(inodePath))      
      restoreBatch.commit()
      setTimeout(() => {
        // open pinboard after it respawns
        tabs.open(inodePath, 'pinboard')
      }, 100)
    }
    
    redo(); // execute update
    addUndo({undo, redo})
  }

  return (
    <div 
      className={style.inode + ' ' + style.pinboard}
      fp-state={isOpen ? 'open' : 'closed'}
      onClick={handleClick}
    >
      {editor.component}
      <div
        className={style.inodeMenu}
        fp-state={menuState}
      >
        <IconButton 
          size='small' 
          onClick={handleMouseDownMenu}
        >
          <MoreHorizIcon/>
        </IconButton>
        {
          menuState === 'open' && 
          <>
            <IconButton 
              size='small' 
              onClick={handleMouseDownMenu}
            >
              <EditIcon/>
            </IconButton>
            <IconButton 
              size='small' 
              onClick={handleMouseDownMenu}
            >
              <DeleteForeverIcon/>
            </IconButton>
          </>
        }
      </div>
    </div>
  )
}

export default PinboardInode;