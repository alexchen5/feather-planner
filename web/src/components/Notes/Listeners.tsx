import { RawDraftContentState } from "draft-js";
import { FeatherContext } from "pages/HomePage/context";
import React from "react";
import { db } from "utils/globalContext";
import { PinboardPin } from "./data";
import firebase from "firebase/app";
import "firebase/firestore";

// take a map of the inode paths to their parent directory inodes
let locked = false; 
let directoryMap: { [inodePath: string]: string | undefined } = {}

function timeout() {
  return new Promise(resolve => setTimeout(resolve, Math.random() * 50));
}
async function enterDirectoryMap() {
  while (locked) {
      console.warn('directoryMap spinlock zone entered'); // this has never been reached in testing (likely bc js runtime doesnt stack events on top of each other but im not certain)
      await timeout(); // spinlock on a random timeout for the lock 
  }
  locked = true; // enter mutex
}
async function addPaths(inodePaths: string[], parentInode: string) {
  await enterDirectoryMap();
  directoryMap = { ...directoryMap, ...inodePaths.reduce((acc, cur) => ({ ...acc, [cur]: parentInode }), {})};
  locked = false; // leave mutex
}
export async function getParentInode(inodePath: string): Promise<string> {
  await enterDirectoryMap();
  const ret = directoryMap[inodePath] || '';
  locked = false; // leave mutex
  return ret;
}
async function deleteFromParent(inodePath: string) {
  const parInode = await getParentInode(inodePath);
  if (!parInode) {
    console.error('No parent dir was found for '+ inodePath);
    return;
  }
  db.doc(parInode + '/dir/index').update('inodePaths', firebase.firestore.FieldValue.arrayRemove(inodePath));
}

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
        } else {
          console.error('Inode ' + inodePath + ' does not exist. Now deleting from parent.');
          deleteFromParent(inodePath)
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
          addPaths(inodePaths, inodePath)
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
          const lastEdited = d.lastEdited as number;
          const position = d.position as { left: number, top: number };
          const size = d.size as { width: number, height: number };
          
          pins.push({ docPath: doc.ref.path, inodePath, content, lastEdited, position, size, restoreData: d })
        })
        listenerReceive.pinboard(inodePath, pins.sort((a, b) => a.lastEdited - b.lastEdited));
      })

    return () => detach();
  }, [inodePath, listenerReceive])

  return null;
}