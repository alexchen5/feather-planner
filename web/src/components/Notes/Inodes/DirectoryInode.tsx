import { FeatherContext } from "pages/HomePage/context";
import React from "react";
import { Directory, FileBase } from "../data";

function DirectoryInode({ inodePath, file } : { inodePath: string, file: FileBase }) {
  
  return (
    <div>
      {file.name}
    </div>
  )
}

export default DirectoryInode;