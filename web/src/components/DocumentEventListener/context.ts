import React from "react";
import { DocumentEventListeners } from "types/components/DocumentEventListener";
import { DocumentListenerAction } from "types/components/DocumentEventListener/reducer";

export const DocumentListenerContext = React.createContext({} as {
    listeners: DocumentEventListeners, 
    dispatch: React.Dispatch<DocumentListenerAction<keyof DocumentEventMap>> 
})
