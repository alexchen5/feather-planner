import { Editor } from "draft-js";
import React, { MouseEventHandler } from "react";
import { FileBase } from "../data";

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import style from './inodes.module.scss';

function DirectoryInode({ editor } : { inodePath: string, file: FileBase, editor: { ref: React.RefObject<Editor>, setForceOpen: React.Dispatch<React.SetStateAction<boolean>>, component: JSX.Element } }) {
  // const { notes: { noteTabs } } = React.useContext(AppContext);
  const [state, setState] = React.useState<'collapsed' | 'expanded'>('collapsed')

  const handleMouseDown: MouseEventHandler = (e) => {
    e.preventDefault()
    setState(state => {
      if (state === 'collapsed') {
        // setTimeout(() => {
        //   editor.setForceOpen(true)
        // }, 50);
        return 'expanded'
      } else {
        // setTimeout(() => {
        //   editor.setForceOpen(false)
        // }, 50);
        return 'collapsed'
      }
    })
  }

  return (
    <div 
      className={style.inode + ' ' + style.directory} 
      fp-state={state}
      onMouseDown={handleMouseDown}
    >
      <div className={style.icon}>
        <ExpandMoreIcon/>
      </div>
      {editor.component}
    </div>
  )
}

export default DirectoryInode;