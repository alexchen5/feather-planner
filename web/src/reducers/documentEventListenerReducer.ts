import { DocumentEventListeners, DocumentListenerAction } from "types";

export const reducer = <K extends keyof DocumentEventMap>(
    state: DocumentEventListeners, 
    action: DocumentListenerAction<K>
): DocumentEventListeners => 
{
    if (action.type === 'register-focus') {
        return {
            ...state,
            componentIdStack: [...state.componentIdStack, action.componentId],
            documentEventListeners: action.listeners 
                ? [...state.documentEventListeners, ...action.listeners] 
                : state.documentEventListeners,
        }
    } else if (action.type === 'deregister-focus') {
        return {
            ...state,
            componentIdStack: state.componentIdStack.filter(id => id !== action.componentId),
            documentEventListeners: action.removeListeners
                ? state.documentEventListeners.filter(l => l.componentId !== action.componentId)
                : state.documentEventListeners,
        }
    } else if (action.type === 'add-document-event-listener') {
        // cast callback generic constraint to any keyof DocumentEventMap
        const callback = action.listener.callback as (ev: DocumentEventMap[keyof DocumentEventMap]) => void;
        return {
            ...state,
            documentEventListeners: [...state.documentEventListeners, { ...action.listener, callback }],
        }
    } else if (action.type === 'remove-document-event-listener') {
        return {
            ...state,
            documentEventListeners: state.documentEventListeners.filter(l => 
                !(l.type === action.listener.type  // remove listeners matching event type, component, and callback function
                && l.componentId === action.listener.componentId
                && l.callback === action.listener.callback)
            ),
        }
    } else {
        const _exhaustiveCheck: never = action;
        return _exhaustiveCheck;
    }
}