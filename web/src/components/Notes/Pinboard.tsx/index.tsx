import { db } from "utils/globalContext";
import { PinboardPin } from "../data";
import Pin from "./Pin";

import style from './pinboard.module.scss';

function PinboardComponent({ inodePath, pins }: { inodePath: string, pins: PinboardPin[] }) {
  const addNote = () => {
    db.collection(inodePath + '/pinboard').add({
      content: '',
      position: {
        left: 8,
        top: 8,
      },
      size: {
        width: 160,
        height: 180,
      },
    })
  }

  return (
    <div className={style.root}>
      <div style={{position: 'relative', textAlign: 'right'}}>
        <button onClick={addNote}>add note</button>
      </div>
      {
        pins.length ? pins.map(pin => <Pin key={pin.docPath} pin={pin}/>) : 'Empty Pinboard!'
      }
    </div>
  )
}

export default PinboardComponent;