import React from "react";
import { ReactNode } from "react";

interface FocusedComponent {
  id: string; // focus id 
  listeners: FocusListener<ListenerKey>[];
  onUnmount: (newId: string) => void; // callback when the focused component leaves the stack
}

export type ListenerKey = keyof DocumentEventMap;

export type FocusListener<K extends ListenerKey> = K extends any ? {
  key: K;
  callback: (e: DocumentEventMap[K]) => void; // map to a listener function
} : never;

export type DocumentFocus = {
  mountFocus: (id: string, parentId: string | string[], listeners?: FocusListener<ListenerKey>[], onUnmount?: (newId: string) => void) => void;
  unmountFocus: (id: string | string[]) => void;
}

export const DocumentFocusContext = React.createContext<DocumentFocus>({
  mountFocus: () => { console.error('Unexpected usage of default DocumentFocusContext'); return []},
  unmountFocus: () => { console.error('Unexpected usage of default DocumentFocusContext'); return []},
});

function DocumentFocusStack({ children }: { children: ReactNode }) {
  const [stack, setStack] = React.useState<FocusedComponent[]>([]);

  /**
   * Mount the focus of a component onto the stack. Declare the parent which the component
   * should sit on. The unmount function will be called on all unmounted components
   * @param id id of our focus
   * @param parentId the parent id, or 'base' if we require to sit on the base. Array if multiple parents are allowed, with priority on first elements in array
   * @param listeners array of event listeners
   * @param onUnmount callback function when unmounted, called asynchronously
   */
  const mountFocus = React.useCallback((id: string, parentId: string | string[], listeners?: FocusListener<ListenerKey>[], onUnmount?: (newId: string) => void) => {
    setStack((stack) => {
      const newStack = [...stack];
      const insertionIndex = typeof parentId === 'string' 
        ? (stack.findIndex(focus => focus.id === parentId) + 1)
        : (parentId.reduce((i, cur) => i === -1 ? stack.findIndex(focus => focus.id === cur) : i, -1) + 1);
      if (parentId !== 'root' && insertionIndex === 0) {
        console.warn('No-op - unable to find insertion parent: ' + parentId);
        return stack;
      }
      const removal = newStack.splice(insertionIndex);
      setStack([...newStack, { id, listeners: listeners || [], onUnmount: onUnmount || (() => {}) }])
  
      removal.forEach(r => setTimeout(() => {
        r.onUnmount(id)
      }))

      return [...newStack, { id, listeners: listeners || [], onUnmount: onUnmount || (() => {}) }]
    })
  }, []);

  /**
   * Unmount the focus of a component from the stack. Will unmount all components 
   * on top of the given component, and call all unmount calback functions.
   * 
   * @param id id of the component to unmount, or array, finding first component in array to unmount
   */
  const unmountFocus = React.useCallback((id: string | string[]) => {
    setStack((stack) => {
      const newStack = [...stack];
      const removalIndex = typeof id === 'string' 
        ? stack.findIndex(focus => focus.id === id)
        : id.reduce((i, cur) => i === -1 ? stack.findIndex(focus => focus.id === cur) : i, -1);
      if (removalIndex === -1) {
        // this should happen very safely
        // console.warn('No-op - component is not focused: ' + id);
        return stack;
      }
      const removal = newStack.splice(removalIndex);
  
      removal.forEach(r => setTimeout(() => {
        r.onUnmount(stack[removalIndex - 1]?.id || 'root')
      }))

      return newStack
    })
  }, []);

  React.useEffect(() => {
    const cleanup: Array<() => void> = [];
    const focused = stack[stack.length - 1];
    if (focused) {
      focused.listeners.forEach((l) => {
        const cur = { handleEvent: l.callback}
        document.addEventListener(l.key, cur);
        cleanup.push(() => document.removeEventListener(l.key, cur))
      })
    }
    return () => cleanup.forEach(c => c())
  }, [stack])

  return (
    <DocumentFocusContext.Provider value={ React.useMemo(() => ({ mountFocus, unmountFocus }), [mountFocus, unmountFocus])}>
      { children }
    </DocumentFocusContext.Provider>
  )
}

export default DocumentFocusStack;