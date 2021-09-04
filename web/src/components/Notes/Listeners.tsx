import React from "react";
import { db } from "utils/globalContext";
import { File } from "./data";

export function InodeListener({ path, giveFile } : { path: string, giveFile: (path: string, file: File) => void }) {
  React.useEffect(() => {
    const detach = db.doc(path)
      .onSnapshot((snapshot) => {
        const d = snapshot.data();
        if (d) {
          const type = d.type as 'dir' | 'pinboard' | 'doc' | 'sheet';
          const name = d.name as string;
          const roles = d.roles as {
            [ uid: string ]: 'admin' | 'edit' | 'read',
          };
          
          giveFile(path, {
            type,
            name,
            roles,
            restoreData: d,
            file: null,
          })
        }
      })

    return () => detach();
  }, [path])

  return <></>
}
