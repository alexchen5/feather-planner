import { AllNotes, File } from "components/Notes/data";
import React from "react";
import { FeatherPlanner } from "types/pages/HomePage";
import { FeatherPlannerAction } from "types/pages/HomePage/reducer";

export const FeatherContext = React.createContext({} as { 
    featherPlanner: FeatherPlanner, 
    dispatch: React.Dispatch<FeatherPlannerAction>,
    notes: {
        allNotes: AllNotes;
        listeners: {
            inodeListeners: string[];
            directoryListeners: string[];
        };
        inodes: {
            giveFile: (path: string, file: File) => void;
            loadInodes: (paths: string[]) => void;
            declareInodeUnmount: (path: string) => void;
        };
        files: {
            loadDirectory: (basePath: string) => void;
            loadPinboard: (basePath: string) => void;
        };
    }
});
