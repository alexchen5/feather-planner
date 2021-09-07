// api hooks for using document event listeners 

import React from "react"
import { DocumentEventListener } from "types/components/DocumentEventListener";
import { DocumentListenerAction } from "types/components/DocumentEventListener/reducer"

export function useDocumentEventListeners(dispatchListeners: React.Dispatch<DocumentListenerAction<keyof DocumentEventMap>>) {
    /**
     * Wrapper for registering focus to document. 
     */
    const registerFocus = React.useCallback<(focusId: string, listeners?: Omit<DocumentEventListener<keyof DocumentEventMap>, 'focusId'>[]) => void>((focusId, listeners = []) => {
        // TODO: convince ts this is okay
        // @ts-ignore
        dispatchListeners({ type: 'register-focus', focusId, listeners: listeners.map(l => ({ focusId, ...l })) });
    }, [dispatchListeners])

    /**
     * Wrapper for deregistering focus to document. Default value of removeListeners to true.
     */
    const deregisterFocus = React.useCallback<(focusId: string, removeListeners?: boolean) => void>((focusId, removeListeners = true) => {
        dispatchListeners({ type: 'deregister-focus', focusId, removeListeners })
    }, [dispatchListeners])

    return { registerFocus, deregisterFocus }
}
