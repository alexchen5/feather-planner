import { RawDraftContentState } from "draft-js";
import { FeatherContext } from "pages/HomePage/context";
import React from "react";
import { db } from "utils/globalContext";
import { PinboardPin } from "./data";

export function InodeListener({ inodePath } : { inodePath: string }) {
  const { notes: { listenerReceive } } = React.useContext(FeatherContext);

  React.useEffect(() => {
    const detach = db.doc(inodePath)
      .onSnapshot((snapshot) => {
        const d = snapshot.data();
        if (d) {
          const type = d.type as 'dir' | 'pinboard' | 'doc' | 'sheet';
          const name = d.name as string;
          const roles = d.roles as {
            [ uid: string ]: 'admin' | 'edit' | 'read',
          };
          
          listenerReceive.inode(inodePath, {
            type,
            name,
            roles,
            restoreData: d,
          })
        }
      })

    return () => detach();
  }, [inodePath, listenerReceive])

  return null;
}

export function DirectoryListener({ inodePath } : { inodePath: string }) {
  const { notes: { listenerReceive } } = React.useContext(FeatherContext);

  React.useEffect(() => {
    const detach = db.doc(inodePath + '/dir/index')
      .onSnapshot((snapshot) => {
        const d = snapshot.data();
        if (d) {
          const inodePaths = d.inodePaths as string[];
          
          listenerReceive.directory(inodePath, inodePaths);

        } else {
          console.error('Directory does not exist: ' + inodePath + '/dir/index');
        }
      })

    return () => detach();
  }, [inodePath, listenerReceive])

  return null;
}

export function PinboardListener({ inodePath } : { inodePath: string }) {
  const { notes: { listenerReceive } } = React.useContext(FeatherContext);

  React.useEffect(() => {
    const detach = db.collection(inodePath + '/pinboard')
      .onSnapshot((snapshot) => {
        const pins: PinboardPin[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          const content = d.content as string | RawDraftContentState;
          const position = d.position as { left: number, top: number };
          const size = d.size as { width: number, height: number };
          
          pins.push({ docPath: doc.ref.path, content, position, size, restoreData: d })
        })
        listenerReceive.pinboard(inodePath, pins);
      })

    return () => detach();
  }, [inodePath, listenerReceive])

  return null;
}