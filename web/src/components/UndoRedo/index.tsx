import UndoIcon from '@material-ui/icons/Undo';
import RedoIcon from '@material-ui/icons/Redo';

import style from './style.module.scss'
import { IconButton } from '@material-ui/core';

interface UndoRedoProp {
  callback: () => void;
  length: number,
}

function UndoRedo({ undo, redo }: { undo: UndoRedoProp, redo: UndoRedoProp }) {

  return (
    <div className={style.root}>
      <IconButton 
        aria-label="undo" // not sure how useful this is
        disabled={undo.length === 0} 
        size='small' 
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); undo.callback() }}
      >
        <div className={style.buttonContent}>
          <UndoIcon className={style.undoIcon}/>
          <div className={style.number + ' ' + style.undoNumber}>{undo.length > 99 ? '99+' : undo.length}</div>
        </div>
      </IconButton>
      <IconButton 
        aria-label="redo"
        disabled={redo.length === 0} 
        size='small' 
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); redo.callback() }}
      >
        <div className={style.buttonContent}>
          <RedoIcon className={style.redoIcon}/>
          <div className={style.number + ' ' + style.redoNumber}>{redo.length > 99 ? '99+' : redo.length}</div>
        </div>
      </IconButton>
    </div>
  )
}

export default UndoRedo