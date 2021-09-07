import { AllNotes, FileBase, FileType, PinboardPin } from "components/Notes/data";
import React from "react";
import { FeatherPlanner } from "types/pages/HomePage";
import { FeatherPlannerAction } from "types/pages/HomePage/reducer";

export const FeatherContext = React.createContext({} as { 
    featherPlanner: FeatherPlanner, 
    dispatch: React.Dispatch<FeatherPlannerAction>,
    notes: {
        allNotes: AllNotes;
        noteTabs: { inodePath: string, isOpen: boolean }[];
        listeners: {
            inodeListeners: string[];
            directoryListeners: string[];
        };
        listenerReceive: {
            inode: (inodePath: string, filebase: FileBase) => void;
            directory: (inodePath: string, inodePaths: string[]) => void;
            pinboard: (inodePath: string, pins: PinboardPin[]) => void;
        }
        tabs: {
            open: (inodePath: string, type: FileType) => void;
            close: (inodePath: string, type: FileType) => void;
        }
        inodes: {
            loadInodes: (paths: string[]) => void;
            declareInodeUnmount: (path: string) => void;
        };
    }
});
