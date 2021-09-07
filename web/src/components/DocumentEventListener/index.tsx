import React, { ReactNode } from "react";
import { reducer } from './reducer';
import { DocumentListenerContext } from "./context";

function DocumentEventListener({children}: {children: ReactNode}) {
  const [listeners, dispatch] = React.useReducer(reducer, { focusIdStack: [], documentEventListeners: [] });

  React.useEffect(() => {
    const cleanup: Array<() => void> = [];
    const focusedComponent = listeners.focusIdStack[listeners.focusIdStack.length - 1] || 'homepage';
    listeners.documentEventListeners.forEach(l => {
      if (l.focusId === focusedComponent) {
        // TODO: convince ts this is okay
        // @ts-ignore
        document.addEventListener(l.type, l.callback);
      }
      // TODO: convince ts this is okay
      // @ts-ignore
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