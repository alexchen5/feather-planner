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
    inodePath: string,
    content: string | RawDraftContentState,
    lastEdited: number, // timestamp
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

export interface NotesData {
    allNotes: AllNotes;
    noteTabs: { inodePath: string, isOpen: boolean }[];
    listeners: {
        inodeListeners: string[];
        directoryListeners: string[];
        pinboardListeners: string[];
    };
    listenerReceive: {
        inode: (inodePath: string, filebase: FileBase) => void;
        directory: (inodePath: string, inodePaths: string[]) => void;
        pinboard: (inodePath: string, pins: PinboardPin[]) => void;
    }
    tabs: {
        open: (inodePath: string, type: FileType) => void;
        rearrange: (inodePaths: string[]) => void;
        close: (inodePath: string, type: FileType, immediate?: boolean) => void;
    }
    inodes: {
        open: (paths: string[]) => void;
        close: (path: string) => void;
        delete: (inodePath: string, parent: string) => void;
    };
}

/**
 * Hook for the db info on all inodes
 */
export function useNotes(uid: string | boolean): NotesData {
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
    // remove listener without timeout
    const deletePath = (path: string, setListeners: React.Dispatch<React.SetStateAction<string[]>>) => {
        setListeners(listeners => listeners.filter(l => l !== path));
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

        rearrange: (inodePaths: string[]) => {
            setNoteTabs(allTabs => inodePaths.map(p => allTabs.find(t => t.inodePath === p)!));
        },

        close: (inodePath: string, type: FileType, immediate = false) => {
            switch (type) {
                case 'dir': 
                    immediate ? deletePath(inodePath, setDirectoryListeners) : removePath(inodePath, setDirectoryListeners);
                    break;
                case 'pinboard': 
                    immediate ? deletePath(inodePath, setPinboardListeners) : removePath(inodePath, setPinboardListeners);
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
                    // No tab to close
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
         * Call when mounting an inode. 
         * We add the inode path to the inode listeners, if the path is not there already
         * @param paths document paths to inodes to load
         */
        open: (paths: string[]) => {
            addPaths(paths, setInodeListeners);
        },

        /**
         * Called when the parent folder of an inode is collapsed, and the inode is unmounted
         * @param path document path to inode
         */
        close: (path: string) => {
            removePath(path, setInodeListeners);
        },

        /**
         * Use for deleting an inode, i.e. deleting a file. 
         * Note that tab.close must be called separately to clear the file specific listener
         * Removes the inode from its parent directory, and clears inode listeners
         * @param inodePath 
         * @param parentInode 
         */
        delete: (inodePath: string, parentInode: string) => {
            deletePath(inodePath, setInodeListeners);
            setAllNotes(notes => {
                const parentDir = notes[parentInode];
                // do nothing if parent dir doesnt exist, parent isnt a dir, or file doesnt exist
                if (!parentDir || parentDir.type !== 'dir' || !parentDir.file) return notes;
                return {
                    ...notes,
                    [parentInode]: {
                        ...parentDir,
                        file: {
                            inodePaths: parentDir.file.inodePaths.filter(path => path !== inodePath),
                        }
                    } 
                }
            })
        },
    }), []);

    return { allNotes, noteTabs, listeners: {inodeListeners, directoryListeners, pinboardListeners}, listenerReceive, tabs, inodes };
}
