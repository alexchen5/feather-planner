import React, { ReactNode } from "react";
import { DocumentEventListeners, DocumentListenerAction } from "types";
import { reducer as listenerReducer } from 'reducers/documentEventListenerReducer';

export const DocumentListenerContext = React.createContext({} as {listeners: DocumentEventListeners, dispatch: React.Dispatch<DocumentListenerAction<keyof DocumentEventMap>> })

function DocumentEventListener({children}: {children: ReactNode}) {
  const [listeners, dispatch] = React.useReducer(listenerReducer, { focusIdStack: [], documentEventListeners: [] });

  React.useEffect(() => {
    const cleanup: Array<() => void> = [];
    const focusedComponent = listeners.focusIdStack[listeners.focusIdStack.length - 1] || 'homepage';
    listeners.documentEventListeners.forEach(l => {
      if (l.focusId === focusedComponent) {
        document.addEventListener(l.type, l.callback);
      }
      cleanup.push(() => {document.removeEventListener(l.type, l.callback)});
    });

    return () => {
      cleanup.forEach(c => c());
    }
  }, [listeners]);

  return (
    <DocumentListenerContext.Provider value={{listeners, dispatch}}>
      { children }
    </DocumentListenerContext.Provider>
  )
}

export default DocumentEventListener;