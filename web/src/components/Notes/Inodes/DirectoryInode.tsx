import { FileBase } from "../data";

function DirectoryInode({ inodePath, file } : { inodePath: string, file: FileBase }) {
  
  return (
    <div>
      {file.name}
    </div>
  )
}

export default DirectoryInode;