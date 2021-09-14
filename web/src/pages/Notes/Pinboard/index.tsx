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
import { animated, useSpring } from "react-spring";

export interface PinStyling {
  editorState: EditorState, 
  onBlockToggle: (blockType: string) => void,
  onInlineToggle: (inlineStyle: string) => void,
}

function PinboardComponent({ inodePath, pins }: { inodePath: string, pins: PinboardPin[] }) {
  const { notes: { tabs } } = React.useContext(AppContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);
  const [ currentPin, setCurrentPin ] = React.useState<PinStyling | null>(null);

  const boardContent = React.useRef<HTMLDivElement>(null);
  const [spring, api] = useSpring(() => ({ 
    config: { tension: 270, clamp: true, },
    from: { height: 0, width: 0 },
  }));
  React.useLayoutEffect(() => {
    api.start({ height: boardContent.current?.scrollHeight || 0, width: boardContent.current?.scrollWidth || 0 })
  }, [pins, api]);

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
      <div className={style.boardWrapper}>
        <animated.div 
          style={{
            position: 'absolute',
            width: spring.width,
            height: spring.height,
          }}
        >
          <div ref={boardContent} style={{ position: 'absolute' }}>
            {pins.map(pin => 
              <Pin key={pin.docPath} pin={pin} updateCurrentPin={updateCurrentPin}/>
            )}
          </div>
        </animated.div>
      </div>
      <div className={style.addButton}>
        <IconButton size='medium' onClick={addNote}><AddIcon/></IconButton>
      </div>
    </div>
  )
}

export default PinboardComponent;