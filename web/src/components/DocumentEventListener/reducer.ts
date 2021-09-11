import { DocumentListenerReducer } from "types/components/DocumentEventListener/reducer";

export const reducer: DocumentListenerReducer<keyof DocumentEventMap> = (state, action) => {
    if (action.type === 'register-focus') {
        return {
            ...state,
            focusIdStack: [...state.focusIdStack, action.focusId],
            documentEventListeners: action.listeners 
                ? [...state.documentEventListeners, ...action.listeners] 
                : state.documentEventListeners,
        }
    } else if (action.type === 'deregister-focus') {
        return {
            ...state,
            focusIdStack: state.focusIdStack.filter(id => id !== action.focusId),
            documentEventListeners: action.removeListeners
                ? state.documentEventListeners.filter(l => l.focusId !== action.focusId)
                : state.documentEventListeners,
        }
    } else if (action.type === 'trigger-event-listeners') {
        state.documentEventListeners.forEach(l => {
            // @ts-ignore
            if (l.focusId === action.focusId && l.type === action.eventType) l.callback(action.event)
        })
        return state;
    } else if (action.type === 'add-document-event-listener') {
        return {
            ...state,
            documentEventListeners: [...state.documentEventListeners, { ...action.listener }],
        }
    } else if (action.type === 'remove-document-event-listener') {
        return {
            ...state,
            documentEventListeners: state.documentEventListeners.filter(l => 
                !(l.type === action.listener.type  // remove listeners matching event type, component, and callback function
                && l.focusId === action.listener.focusId
                && l.callback === action.listener.callback)
            ),
        }
    } else {
        const _exhaustiveCheck: never = action;
        return _exhaustiveCheck;
    }
}