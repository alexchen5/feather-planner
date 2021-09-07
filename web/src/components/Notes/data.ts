import { RawDraftContentState } from "draft-js";
import React from "react";

export interface AllNotes {
    [ inodePath: string ]: File | undefined;
}

export type File = Directory | Pinboard | Document | Sheet;
export type FileType = 'dir' | 'pinboard' | 'doc' | 'sheet';


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
        inodePaths: string[]; // array of paths to inodes
    } | null;
}

export interface Pinboard extends FileBase {
    type: 'pinboard';
    file: {
        pins: PinboardPin[],
    } | null,
}

export interface PinboardPin {
    docPath: string,
    content: string | RawDraftContentState,
    position: {
        left: number,
        top: number,
    },
    size: {
        width: number,
        height: number,
    }
    restoreData: { [field: string]: any }; // whatever we got from the db
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
    const [allNotes, setAllNotes] = React.useState<AllNotes>({
        [`users/${uid}/inodes/index`]: {
            type: 'dir',
            name: 'Home Folder',
            roles: {},
            restoreData: {},
            file: null,
        }
    });  
    const [noteTabs, setNoteTabs] = React.useState<{ inodePath: string, isOpen: boolean }[]>([])
    const [inodeListeners, setInodeListeners] = React.useState<string[]>([]); 
    const [directoryListeners, setDirectoryListeners] = React.useState<string[]>([`users/${uid}/inodes/index`])
    const [pinboardListeners, setPinboardListeners] = React.useState<string[]>([]);

    const unmountQueue = React.useRef<{ path: string, timeout: NodeJS.Timeout }[]>([])
    const addPaths = (paths: string[], setListeners: React.Dispatch<React.SetStateAction<string[]>>) => {
        unmountQueue.current = unmountQueue.current.filter(q => {
            if (paths.includes(q.path)) {
                clearTimeout(q.timeout);
                return false; // clear timeout and remove from queue
            }
            return true; // keep in queue
        });
        setListeners(listeners => paths.reduce((acc, cur) => acc.includes(cur) ? acc : [...acc, cur], listeners));
    }
    const removePath = (path: string, setListeners: React.Dispatch<React.SetStateAction<string[]>>) => {
        unmountQueue.current.push({
            path,
            timeout: setTimeout(() => {
                setListeners(listeners => listeners.filter(l => l !== path));
            }, 30000), // 30 second timeout to remove listener 
        });
    }

    const listenerReceive = React.useMemo(() => ({
        inode: (inodePath: string, filebase: FileBase) => {
            // weird type error with ts not convinced that node.file is legit 
            // @ts-ignore 
            setAllNotes(notes => {
                const node = notes[inodePath];
                if (node && node.type !== filebase.type) {
                    console.error('Detected unexpected mismatch between inode listener and file data: ' + inodePath);
                }
                return {
                    ...notes, 
                    [inodePath]: (node && node.type === filebase.type) ? { ...filebase, file: node.file } : { ...filebase, file: null },
                }
            });
        },

        directory: (inodePath: string, inodePaths: string[]) => {
            setAllNotes(notes => {
                const node = notes[inodePath];
                if (!node) {
                    console.error('Expected inode at: ' + inodePath);
                    return notes;
                }
                if (node.type !== 'dir') {
                    console.error('Expected dir type inode: ' + inodePath);
                    return notes;
                }
                return {
                    ...notes,
                    [inodePath]: { ...node, file: { inodePaths } }
                }
            });
        },

        pinboard: (inodePath: string, pins: PinboardPin[]) => {
            setAllNotes(notes => {
                const node = notes[inodePath];
                if (!node) {
                    console.error('Expected inode at: ' + inodePath);
                    return notes;
                }
                if (node.type !== 'pinboard') {
                    console.error('Expected pinboard type inode: ' + inodePath);
                    return notes;
                }
                return {
                    ...notes,
                    [inodePath]: { ...node, file: { pins } }
                }
            });
        }
    }), []);

    const tabs = React.useMemo(() => ({
        open: (inodePath: string, type: FileType) => {
            switch (type) {
                case 'dir': 
                    addPaths([inodePath], setDirectoryListeners);
                    break;
                case 'pinboard': 
                    addPaths([inodePath], setPinboardListeners);
                    break;
            }
            setNoteTabs(allTabs => {
                let tabExists = false;
                const ret = allTabs.map(t => {
                    if (t.inodePath === inodePath) {
                        tabExists = true;
                        return { ...t, isOpen: true} // open tab if it exists
                    }
                    return t.isOpen ? { ...t, isOpen: false} : t; // close all other tabs
                });
                // add the open tab if it doesnt exist
                return tabExists ? ret : [...ret, { inodePath, isOpen: true }]
            })
        },

        close: (inodePath: string, type: FileType) => {
            switch (type) {
                case 'dir': 
                    removePath(inodePath, setDirectoryListeners);
                    break;
                case 'pinboard': 
                    removePath(inodePath, setPinboardListeners);
                    break;
            }
            setNoteTabs(allTabs => {
                let removalIndex = -1;
                let hasOpen = false;
                const ret: { inodePath: string, isOpen: boolean }[] = [];
                allTabs.forEach((t, i) => {
                    if (t.inodePath === inodePath) {
                        removalIndex = i;
                    } else {
                        if (!hasOpen && t.isOpen) hasOpen = true;
                        ret.push(t);
                    }
                })
                if (removalIndex === -1) {
                    console.error('No tab to close: ' + inodePath);
                    return allTabs;
                }
                if (!hasOpen) {
                    if (ret[removalIndex]) ret[removalIndex] = { ...ret[removalIndex], isOpen: true }
                    else if (ret[removalIndex - 1]) ret[removalIndex - 1] = { ...ret[removalIndex - 1], isOpen: true }
                } 
                return ret;
            });
        }
    }), []);

    const inodes = React.useMemo(() => ({
        /**
         * add the inode path to the inode listeners, if the path is not there already
         * @param paths document paths to inodes to load
         */
        loadInodes: (paths: string[]) => {
            addPaths(paths, setInodeListeners);
        },

        /**
         * called when an inode unmounts, 
         * @param path document path to inode
         */
        declareInodeUnmount: (path: string) => {
            removePath(path, setInodeListeners);
        },
    }), []);

    return { allNotes, noteTabs, listeners: {inodeListeners, directoryListeners, pinboardListeners}, listenerReceive, tabs, inodes };
}
