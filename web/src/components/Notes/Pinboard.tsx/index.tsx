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
        left: 8,
        top: 12,
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
      <div style={{position: 'relative', textAlign: 'right'}}>
        <button onClick={addNote}>add note</button>
      </div>
      {
        pins.map(pin => <Pin key={pin.docPath} pin={pin}/>)
      }
    </div>
  )
}

export default PinboardComponent;