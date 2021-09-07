import { FeatherContext } from "pages/HomePage/context";
import React from "react";
import { FileBase } from "../data";

function PinboardInode({ inodePath, file } : { inodePath: string, file: FileBase }) {
  const { notes: {tabs: { open }} } = React.useContext(FeatherContext);

  const openPinboard = () => {
    open(inodePath, 'pinboard');
  }

  const deletePinboard = () => {
    console.log('unimplemented');
    
  }
  
  return (
    <div>
      {file.name}
      <button onClick={openPinboard}>Open</button>
      <button onClick={deletePinboard}>Delete</button>
    </div>
  )
}

export default PinboardInode;