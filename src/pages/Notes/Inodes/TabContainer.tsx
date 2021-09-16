import React from "react";
import { AppContext } from "utils/globalContext";

import style from '../styles/index.module.scss';
import InodeTab from "./InodeTab";

function TabContainer() {
  const { notes: {allNotes, noteTabs, tabs: { rearrange }} } = React.useContext(AppContext);

  const activeTabs = React.useRef<{
    path: string, 
    staticEl: HTMLDivElement | null,
  }[]>(
    noteTabs
      .filter(note => !!allNotes[note.inodePath])
      .map(t => ({ path: t.inodePath, staticEl: null }))
  )

  React.useEffect(() => {
    activeTabs.current = noteTabs
      .filter(note => !!allNotes[note.inodePath])
      .map(t => ({ 
        path: t.inodePath, 
        staticEl: activeTabs.current.find(a => a.path === t.inodePath)?.staticEl || null, 
      }))
  }, [noteTabs, allNotes])

  const registerRef = (path: string, staticEl: HTMLDivElement | null) => {
    activeTabs.current = activeTabs.current.map(a => a.path === path 
      ? { ...a, staticEl } 
      : a 
    )
  }

  /**
   * Callback to handle the movement of a dragging tab
   * @param offset the offset from its static position
   * @param path the inode path of the tab
   * @returns void
   */
  const handleMovement = (offset: number, path: string) => {
    const index = activeTabs.current.findIndex(t => t.path === path)
    if (index === -1) {
      console.error('expected dragging tab to be in activeTabs');
      return;
    }
    const el = activeTabs.current[index].staticEl
    if (!el) {
      console.error('expected dragging tab to have valid static el');
      return;
    }
    let newIndex = index
    if (Math.abs(offset) > (el.getBoundingClientRect().width / 2)) {
      newIndex = newIndex + (offset > 0 ? 1 : -1)
    }

    if (index !== newIndex) {
      const c = activeTabs.current.map(t => t.path)
      c.splice(index, 1)
      c.splice(newIndex, 0, path)
      rearrange(c)
    }
  }

  return (
    <div className={style.tabsContainerRoot}>
      <div className={style.tabsContainer}>
        {noteTabs.map((note, i) => 
          allNotes[note.inodePath] 
          ? <InodeTab 
            key={note.inodePath} 
            index={i}
            numTabs={noteTabs.length}
            file={allNotes[note.inodePath]!} 
            inodePath={note.inodePath} 
            isOpen={note.isOpen}
            registerRef={registerRef}
            handleMovement={handleMovement}
          />
          : null
        )}
      </div>
    </div>
  )
}

export default TabContainer