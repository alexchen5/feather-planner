import { IconButton } from "@material-ui/core";
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import { Editor } from "draft-js";
import { FeatherContext } from "pages/HomePage/context";
import React, { MouseEventHandler } from "react";
import { db } from "utils/globalContext";
import { UndoRedoContext } from "utils/useUndoRedo";
import { FileBase } from "../data";
import { getParentInode } from "../Listeners";

import firebase from "firebase/app";
import "firebase/firestore";

import style from './inodes.module.scss';

function PinboardInode({ inodePath, file, editor } : { inodePath: string, file: FileBase, editor: { ref: React.RefObject<Editor>, component: JSX.Element } }) {
  const { notes: {tabs, inodes, noteTabs} } = React.useContext(FeatherContext);
  const { addUndo } = React.useContext(UndoRedoContext);
  
  const isOpen = React.useMemo(() => noteTabs.find(note => note.inodePath === inodePath)?.isOpen || false, [noteTabs, inodePath]);
  
  const handleClick = () => {
    tabs.open(inodePath, 'pinboard');
  }

  const handleMouseDownMenu: MouseEventHandler = (e) => {
    e.stopPropagation()
    deletePinboardHelper()
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
      <IconButton 
        size='small' 
        onClick={handleMouseDownMenu}
        onMouseDown={e => e.stopPropagation()}
      >
        <DeleteForeverIcon/>
      </IconButton>
    </div>
  )
}

export default PinboardInode;