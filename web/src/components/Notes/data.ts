import { RawDraftContentState } from "draft-js";
import React from "react";

export interface AllNotes {
    [ inodePath: string ]: File | undefined;
}

export type File = Directory | Pinboard | Document | Sheet;

export interface FileBase {
    type: 'dir' | 'pinboard' | 'doc' | 'sheet'; // the type of file 
    name: string; // the name of the file 
    roles: {
        // extra uids who have permissions on the file
        // admin: all read, write on both inode and file (can delete, rename, add new roles)
        // edit: update permission on file only, read permission on inode
        // read: read permission on file and inode
        [ uid: string ]: 'admin' | 'edit' | 'read',
    }
    restoreData: { [field: string]: any }; // whatever we got from the db
}

export interface Directory extends FileBase {
    type: 'dir';
    file: {
        inodes: string[]; // array of paths to inodes
    } | null;
}

export interface Pinboard extends FileBase {
    type: 'pinboard';
    file: {
        pins: {
            content: RawDraftContentState,
            position: {
                left: number,
                top: number,
            },
            size: {
                width: number,
                height: number,
            }
            restoreData: { [field: string]: any }; // whatever we got from the db
        }[]
    } | null,
}

export interface Document extends FileBase {
    type: 'doc';
    file: null;
}

export interface Sheet extends FileBase {
    type: 'sheet';
    file: null;
}

/**
 * At `users/${uid}/inodes/index/dir/index`: 
 *  {
 *      inodes: [ ...pathToInode ]
 *  }
 *  - read and edit by uid only 
 * 
 * At `users/${uid_a}/requests/${uid_b}`:
 *  {
 *      inodes: [ ...pathToInode ]
 *  }
 *  - read and edit by uid_a and uid_b
 * 
 * At `users/${uid}/inodes/inodeId`:
 *  {
 *      type: 'dir' | 'pinboard' | 'doc' | 'sheet',
 *      name: string,
 *      roles: {
 *          [ uid: string ]: 'admin', 'edit', 'read',
 *      }
 *  }
 * - read by uid, and all uid in adminPermissions, editPermissions and readPermissions
 * - edit by uid, and all uid in adminPermissions only 
 * - therefore only owner and admins can edit the document title, permissions, and 
 *      deleting the document
 * 
 * At `users/${uid}/inodes/inodeId/dir/index`:
 *  {
 *      inodes: [ ...pathToInode ],
 *  }
 * 
 * At `users/${uid}/inodes/inodeId/pinboard/pinId`
 *  {
 *      content: RawDraftContent,
 *      position: {
 *          left: number,
 *          top: number,
 *      },
 *      size: {
 *          width: number,
 *          height: number,
 *      }
 *  }
 * 
 * At `users/${uid}/inodes/inodeId/doc/index`
 *  {
 *      content: RawDraftContent
 *  }
 * 
 * At `users/${uid}/inodes/inodeId/sheet`
 *  {
 *      ?
 *  }
 * 
 * - user permissions determined by information in its corresponding inode 
 * - note file type and file title are determined from its corresponding inode
 */

/**
 * Hook for the db info on all inodes
 */
export function useAllNotes(uid: string | boolean) {
    const [allNotes, setAllNotes] = React.useState<AllNotes>({});  
    const [inodeListeners, setInodeListeners] = React.useState<string[]>([]); 
    const [directoryListeners, setDirectoryListeners] = React.useState<string[]>([`users/${uid}/inodes/index/dir/index`])

    const unmountQueue = React.useRef<{ path: string, timeout: NodeJS.Timeout }[]>([])

    const inodes = {
        giveFile: (path: string, file: File) => {
            setAllNotes(notes => ({...notes, [path]: file}));
        },

        /**
         * add the inode path to the inode listeners, if the path is not there already
         * @param paths document paths to inodes to load
         */
        loadInodes: (paths: string[]) => {
            unmountQueue.current = unmountQueue.current.filter(q => {
                if (paths.includes(q.path)) {
                    clearTimeout(q.timeout);
                    return false; // clear timeout and remove from queue
                }
                return true; // keep in queue
            });
            setInodeListeners(listeners => paths.reduce((acc, cur) => acc.includes(cur) ? acc : [...acc, cur], listeners));
        },

        /**
         * called when an inode unmounts, 
         * @param path document path to inode
         */
        declareInodeUnmount: (path: string) => {
            unmountQueue.current.push({
                path,
                timeout: setTimeout(() => {
                    setInodeListeners(listeners => listeners.filter(l => l !== path));
                }, 30000), // 30 second timeout to remove listener 
            });
        },
    }
    
    const files = {
        loadDirectory: (basePath: string) => {

        },

        loadPinboard: (basePath: string) => {

        },
    }

    return { allNotes, listeners: {inodeListeners, directoryListeners}, inodes, files };
}
