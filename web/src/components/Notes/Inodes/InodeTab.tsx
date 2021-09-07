import { FeatherContext } from "pages/HomePage/context";
import React from "react";

function InodeTab({ inodePath, isOpen }: { inodePath: string, isOpen: boolean }) {
  const { notes: {allNotes, tabs } } = React.useContext(FeatherContext);

  const file = allNotes[inodePath];

  const closeTab = () => file ? tabs.close(inodePath, file.type) : {};
  const openTab = () => file ? tabs.open(inodePath, file.type) : {};

  return (
  <>{
    file ?
    <div>
      {inodePath + ' ' + file.name + ' open=' + isOpen}
      <button onClick={openTab}>open</button>
      <button onClick={closeTab}>close</button>
    </div>
    : null
  }</>
  )
}

export default InodeTab;