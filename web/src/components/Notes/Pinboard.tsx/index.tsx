import { IconButton } from "@material-ui/core";
import AddIcon from '@material-ui/icons/Add';
import React from "react";
import { db } from "utils/globalContext";
import { UndoRedoContext } from "utils/useUndoRedo";
import { PinboardPin } from "../data";
import Pin from "./Pin";

import style from './pinboard.module.scss';

function PinboardComponent({ inodePath, pins }: { inodePath: string, pins: PinboardPin[] }) {
  const { addUndo } = React.useContext(UndoRedoContext);

  const addNote = async () => {
    const initContent = {
      content: '',
      lastEdited: Date.now(),
      position: {
        left: 6,
        top: 6,
      },
      size: {
        width: 260,
        height: 290,
      },
    }
    const newDoc = await db.collection(inodePath + '/pinboard').add(initContent)

    const redo = async () => {
      db.doc(newDoc.path).set(initContent);
    }
    const undo = async () => {
      newDoc.delete();
    }
    
    addUndo({undo, redo})
  }

  return (
    <div className={style.root}>
      {
        pins.map(pin => <Pin key={pin.docPath} pin={pin}/>)
      }
      <div className={style.addButton}>
        <IconButton size='medium' onClick={addNote}><AddIcon/></IconButton>
      </div>
    </div>
  )
}

export default PinboardComponent;