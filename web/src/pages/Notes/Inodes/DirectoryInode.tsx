import { Editor } from "draft-js";
import React, { MouseEventHandler } from "react";
import { FileBase } from "../data";

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { IconButton } from "@material-ui/core";
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import EditIcon from '@material-ui/icons/Edit';


import style from './inodes.module.scss';
import { DocumentFocusContext } from "components/DocumentFocusStack";

function DirectoryInode({ editor } : { inodePath: string, file: FileBase, editor: { ref: React.RefObject<Editor>, setForceOpen: React.Dispatch<React.SetStateAction<boolean>>, component: JSX.Element } }) {
  const { mountFocus, unmountFocus } = React.useContext(DocumentFocusContext);
  // const { notes: { noteTabs } } = React.useContext(AppContext);
  const [state, setState] = React.useState<'collapsed' | 'expanded'>('collapsed')
  const [ menuState, setMenuState ] = React.useState<'open' | 'closed'>('closed');
  const renderRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDownMenu: MouseEventHandler = (e) => {
    e.stopPropagation()
    if (menuState === 'closed') {
      setMenuState('open')
      mountFocus('inode-menu-open', 'notes-root', [
        {
          key: 'mousedown',
          callback: () => unmountFocus('inode-menu-open'),
        }
      ], () => {
        if (renderRef.current) setMenuState('closed')
      })
    } else {
      unmountFocus('inode-menu-open')
    }
  }

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
      fp-menustate={menuState}
      ref={renderRef}
      onMouseDown={handleMouseDown}
    >
      <div className={style.icon}>
        <ExpandMoreIcon/>
      </div>
      {editor.component}
      <div
        className={style.inodeMenu}
        fp-state={menuState}
      >
        <div style={{ position: 'absolute', zIndex: menuState === 'open' ? 3 : 1, left: '2px' }}>
          <IconButton 
            size='small' 
            onMouseDown={handleMouseDownMenu}
          >
            <MoreHorizIcon/>
          </IconButton>
          {
            menuState === 'open' && 
            <>
              <IconButton 
                size='small' 
                onMouseDown={(e) => e.stopPropagation()}
              >
                <EditIcon/>
              </IconButton>
              <IconButton 
                size='small' 
                // onClick={() => deletePinboardHelper()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <DeleteForeverIcon/>
              </IconButton>
            </>
          }
        </div>
      </div>
    </div>
  )
}

export default DirectoryInode;