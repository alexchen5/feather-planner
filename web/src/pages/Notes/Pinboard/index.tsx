import { IconButton } from "@material-ui/core";
import AddIcon from '@material-ui/icons/Add';
import { EditorState } from "draft-js";
import React from "react";
import { AppContext, db } from "utils/globalContext";
import { UndoRedoContext } from "utils/useUndoRedo";
import { PinboardPin } from "../data";
import StyleMenu from "./StyleMenu";
import Pin from "./Pin";

import style from './pinboard.module.scss';

export interface PinStyling {
  editorState: EditorState, 
  onBlockToggle: (blockType: string) => void,
  onInlineToggle: (inlineStyle: string) => void,
}

function PinboardComponent({ inodePath, pins }: { inodePath: string, pins: PinboardPin[] }) {
  const { notes: { tabs } } = React.useContext(AppContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);
  const [ currentPin, setCurrentPin ] = React.useState<PinStyling | null>(null);

  const addNote = async () => {
    const initContent = {
      content: '',
      lastEdited: Date.now(),
      position: {
        left: 6,
        top: 6,
      },
      size: {
        width: 340,
        height: 290,
      },
    }
    const newDoc = await db.collection(inodePath + '/pinboard').add(initContent)

    const redo = async () => {
      setTimeout(() => {
        tabs.open(inodePath, 'pinboard')
        db.doc(newDoc.path).set(initContent);
      }, 50);
    }
    const undo = async () => {
      setTimeout(() => {
        tabs.open(inodePath, 'pinboard')
        newDoc.delete();
      }, 50);
    }
    
    addUndo({undo, redo})
  }

  const updateCurrentPin = React.useCallback((pin: PinStyling | null) => {
    setCurrentPin(pin)
  }, [])

  return (
    <div className={style.root}>
      <div className={style.menu}>
        <StyleMenu pin={currentPin}/>
      </div>
      <div className={style.board}>
        {
          pins.map(pin => <Pin key={pin.docPath} pin={pin} updateCurrentPin={updateCurrentPin}/>)
        }
        <div className={style.addButton}>
          <IconButton size='medium' onClick={addNote}><AddIcon/></IconButton>
        </div>
      </div>
    </div>
  )
}

export default PinboardComponent;