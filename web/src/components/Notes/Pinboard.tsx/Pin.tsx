import { DocumentListenerContext } from "components/DocumentEventListener/context";
import { useDocumentEventListeners } from "components/DocumentEventListener/useDocumentEventListeners";
import { convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RawDraftContentState, RichUtils } from "draft-js";
import React, { MouseEventHandler, KeyboardEvent as ReactKeyboardEvent } from "react";
import { db } from "utils/globalContext";
import { key } from "utils/keyUtil";
import { useEditorChangeLogger, useEditorUpdater } from "utils/useEditorUtil";
import { UndoRedoContext } from "utils/useUndoRedo";
import { PinboardPin } from "../data";

import 'draft-js/dist/Draft.css';
import style from './pinboard.module.scss';
import borderStyle from './borderCapture.module.scss';

type ResizeStyle = 'ns' | 'ew' | 'nwse' | 'nesw';
type ResizeDirections = 'n' | 'e' | 's' | 'w';
let clientDx: number, clientDy: number, clientX: number, clientY: number // track drag positions

function Pin({ pin }: {pin: PinboardPin}) {
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { registerFocus, deregisterFocus } = useDocumentEventListeners(dispatchListeners);
  const { addUndo } = React.useContext(UndoRedoContext);

  const pinRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<'normal' | 'edit' | 'dragging' | 'resizing'>('normal');

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(pin.content);
  const [ didChange, logChange, reset ] = useEditorChangeLogger(editorState);

  /**
   * Ref wrapper for the edit end function. We use a ref so its mutable in a callback
   */
  const handleEditEnd = React.useRef(() => {});

  /**
   * Helper function to take the necessary steps to delete self
   */
  const deleteSelf = React.useCallback(() => {
    // ensure edit listeners are cleaned up
    deregisterFocus('pin-edit');

    const redo = async () => {
      db.doc(pin.docPath).delete();
    }
    const undo = async () => {
      db.doc(pin.docPath).set({...pin.restoreData});
    }
    
    redo(); // execute delete
    addUndo({undo, redo})
    // expect addUndo, declareBlur are memoised 
  }, [ addUndo, deregisterFocus, pin.docPath, pin.restoreData ]);

  /**
   * Take the necessary steps to submit content changes to the db
   * @param val the current text content
   */
  const submitContentChanges = React.useCallback((val: RawDraftContentState | false) => {
    if (!didChange) return;

    if (!val) { // run delete first
      deleteSelf();
      return;
    }
    
    const redo = async () => {
      db.doc(pin.docPath).set({ content: val, lastEdited: Date.now() }, { merge: true });
    };
    const undo = async () => {
      db.doc(pin.docPath).set({...pin.restoreData});
    }
    
    redo(); // execute update
    addUndo({undo, redo})
    // expect addUndo, deleteSelf are memoised 
  }, [addUndo, deleteSelf, didChange, pin.docPath, pin.restoreData]);

  // update our handleEditEnd function whenever its dependancies change
  React.useEffect(() => {
    // our edit end handler function
    handleEditEnd.current = () => {
      setState('normal')
      deregisterFocus('pin-edit');
      submitContentChanges(
        editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
      );
    }
    // expect deregisterFocus, submitContentChanges are memoised
  }, [deregisterFocus, submitContentChanges, editorState])

  const handleClick: MouseEventHandler = (e) => {
    if (state === 'normal') { 
      // register edit state after the completion of a click
      setState('edit')
      reset(editorState);
      registerFocus('pin-edit', [
        {
          type: 'keydown',
          // TODO: figure out how to convince ts that this is okay without type assertion
          callback: handleKeyDown as (ev: DocumentEventMap[keyof DocumentEventMap]) => void, // handle document keydowns
        },
        {
          type: 'mousedown',
          // edit end function contained in a ref so its value is mutable
          callback: () => handleEditEnd.current(),
        }
      ]); 
    } else if (state === 'edit') {
      // ensure focus if we have declared focus
      editor.current?.focus();
    } else if (state === 'dragging') {
      // set state back to normal when the click registers after drag 
      // with timeout so we dont get flashing with z-index changes
      setTimeout(() => {
        if (pinRef.current) setState('normal')
      }, 50);
    }
  }

  const handleMouseDown: MouseEventHandler = (e) => {
    if (state === 'normal') {
      mousedownDragInitiate(e); // potentially start drag
    } else if (state === 'edit') {
      e.stopPropagation() // stop mousedown from going to document
    }
  }

  /**
   * Helper function to set up drag from mousedown
   * @param e 
   */
  const mousedownDragInitiate = (e: React.MouseEvent<Element, MouseEvent>) => {
    clientX = e.clientX;
    clientY = e.clientY;

    registerFocus('pin-try-drag', [
      {
        type: 'mousemove',
        callback: mousemoveTryStartDrag,
      },
      {
        type: 'mouseup',
        // cancel try drag focus on mouseup
        callback: () => deregisterFocus('pin-try-drag'),
      }
    ])
  }

  const mousemoveTryStartDrag = (e: MouseEvent) => {
    // ensure mouse moved enough for a drag
    if (!pinRef.current) {
      console.error('Expected pinRef during drag');
      return;
    }

    if (!(Math.abs(e.clientX - clientX) > 2 || Math.abs(e.clientY - clientY) > 2)) return;

    // Can start the drag now
    setState('dragging'); // set state to dragging

    // dereg previous focus
    deregisterFocus('pin-try-drag');
    deregisterFocus('pin-edit')

    // reg actual dragging listeners
    registerFocus('pin-drag', [
      {
        type: 'mousemove',
        callback: mousemoveHandleDrag
      },
      {
        type: 'mouseup',
        callback: mouseupEndDrag,
      }
    ])
  }

  const handleMouseDownResize = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, directions: ResizeDirections[], style: ResizeStyle) => {
    e.stopPropagation();
    // set document cursor style
    document.documentElement.style.cursor = style + '-resize';
    setState('resizing'); // set state to resizing

    clientX = e.clientX;
    clientY = e.clientY;

    // reg resize listeners
    registerFocus('pin-resize', [
      {
        type: 'mousemove',
        callback: (e: MouseEvent) => mousemoveResize(e, directions)
      },
      {
        type: 'mouseup',
        callback: () => mouseupResize(),
      }
    ])
  }

  const mousemoveHandleDrag = (e: MouseEvent) => {
    e.preventDefault();
    clientDx = clientX - e.clientX;
    clientDy = clientY - e.clientY;
    if (!pinRef.current) {
      console.error('Expected pinRef during drag');
      return;
    }
    if (pinRef.current.offsetTop - clientDy >= 6) clientY = e.clientY;
    if (pinRef.current.offsetLeft - clientDx >= 6) clientX = e.clientX;
    pinRef.current.style.top = Math.max(6, pinRef.current.offsetTop - clientDy) + "px";
    pinRef.current.style.left = Math.max(6, pinRef.current.offsetLeft - clientDx) + "px";
  }

  const mousemoveResize = (e: MouseEvent, directions: ResizeDirections[]) => {
    e.preventDefault();
    clientDx = clientX - e.clientX;
    clientDy = clientY - e.clientY;
    if (!pinRef.current) {
      console.error('Expected pinRef during resize');
      return;
    }

    // change height/width/left/top depending on direction of resize
    if (directions.includes('n')) {
      const newH = Math.max(25, parseInt(getComputedStyle(pinRef.current).height) + clientDy) + "px"
      if (newH !== pinRef.current.style.height) {
        clientY = e.clientY;
        pinRef.current.style.height = newH;
        pinRef.current.style.top = pinRef.current.offsetTop - clientDy + 'px';
      }
    }
    if (directions.includes('s')) {
      const newH = Math.max(25, parseInt(getComputedStyle(pinRef.current).height) - clientDy) + "px";
      if (newH !== pinRef.current.style.height) {
        clientY = e.clientY;
        pinRef.current.style.height = newH
      }
    }
    if (directions.includes('e')) {
      const newW = Math.max(25, parseInt(getComputedStyle(pinRef.current).width) - clientDx) + "px";
      if (newW !== pinRef.current.style.width) {
        clientX = e.clientX
        pinRef.current.style.width = newW
      }
    }
    if (directions.includes('w')) {
      const newW = Math.max(25, parseInt(getComputedStyle(pinRef.current).width) + clientDx) + "px";
      if (newW !== pinRef.current.style.width) {
        clientX = e.clientX
        pinRef.current.style.width = newW
        pinRef.current.style.left = pinRef.current.offsetLeft - clientDx + 'px';
      }
    }
  }

  const mouseupEndDrag = (e: MouseEvent) => {
    deregisterFocus('pin-drag')
    if (!pinRef.current) {
      console.error('Expected pinRef at drag end');
      return;
    }

    const top = parseInt(pinRef.current.style.top);
    const left = parseInt(pinRef.current.style.left);

    const redo = async () => {
      db.doc(pin.docPath).set({ position: { top, left }, lastEdited: Date.now() }, { merge: true });
    };
    const undo = async () => {
      db.doc(pin.docPath).set({...pin.restoreData});
    }
    
    redo(); // execute update
    addUndo({undo, redo})
  }

  const mouseupResize = () => {
    // reset document cursor style
    document.documentElement.style.cursor = '';

    setState('normal')
    deregisterFocus('pin-resize')
    if (!pinRef.current) {
      console.error('Expected pinRef at resize end');
      return;
    }

    const width = parseInt(pinRef.current.style.width);
    const height = parseInt(pinRef.current.style.height);
    const top = parseInt(pinRef.current.style.top);
    const left = parseInt(pinRef.current.style.left);

    const redo = async () => {
      db.doc(pin.docPath).set({ size: { width, height }, position: { left, top } }, { merge: true });
    };
    const undo = async () => {
      db.doc(pin.docPath).set({...pin.restoreData});
    }
    
    redo(); // execute update
    addUndo({undo, redo})
  }

  /**
   * Function to handle the key interactions. This is added to document through declareFocus
   */
  const handleKeyDown = React.useCallback((e: KeyboardEvent) => { // useCallback to preserve referential equality between renders 
    if (key.isDelete(e)) {
      e.stopPropagation();
      console.log('delete from backspace');
      
      deleteSelf();
    } else if (e.key === 'Enter') {
      handleEditEnd.current();
    }
  }, [deleteSelf]);

  /**
   * Callback on every key, to check if submit was called
   * @param {KeyboardEvent} e 
   * @returns 
   */
   const checkSubmit = (e: ReactKeyboardEvent): string | null => {
    // if (e.key === 'Enter' && !e.shiftKey) {
    //   handleEditEnd.current();
    //   return 'submit';
    // }
    return getDefaultKeyBinding(e);
  }

  /**
   * Handle key-styling command for text edit
   * @param {string} command 
   * @returns 
   */
   const handleKeyCommand = (command: string): DraftHandleValue => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      handleChange(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  /**
   * Wrapper function to set editor state. Used to log changes so that db writes 
   * are not wasted
   * @param {EditorState} newState 
   */
  const handleChange = (newState: EditorState) => {
    logChange(newState);
    setEditorState(newState);
  }
  
  return <div
    ref={pinRef}
    className={style.pin}
    data-state={state}
    onClick={handleClick}
    onMouseDown={handleMouseDown}
    onKeyDown={(e) => {e.stopPropagation()}} // stop key events from within bubble out
    style={{
      left: pin.position.left + 'px', 
      top: pin.position.top + 'px',
      width: pin.size.width + 'px', 
      height: pin.size.height + 'px',
    }}
  > 
    { (state === 'normal' || state === 'edit') && 
      <>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['n'],'ns')} className={borderStyle.borderCapture + ' ' + borderStyle.top} style={{cursor: 'ns-resize'}}/>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['e'],'ew')} className={borderStyle.borderCapture + ' ' + borderStyle.right} style={{cursor: 'ew-resize'}}/>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['s'],'ns')} className={borderStyle.borderCapture + ' ' + borderStyle.bottom} style={{cursor: 'ns-resize'}}/>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['w'],'ew')} className={borderStyle.borderCapture + ' ' + borderStyle.left} style={{cursor: 'ew-resize'}}/>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['s', 'e'],'nwse')} className={borderStyle.borderCapture + ' ' + borderStyle.bottomRight} style={{cursor: 'nwse-resize'}}/>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['n', 'w'],'nwse')} className={borderStyle.borderCapture + ' ' + borderStyle.topLeft} style={{cursor: 'nwse-resize'}}/>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['n', 'e'],'nesw')} className={borderStyle.borderCapture + ' ' + borderStyle.topRight} style={{cursor: 'nesw-resize'}}/>
        <div onMouseDown={(e) => handleMouseDownResize(e, ['s', 'w'],'nesw')} className={borderStyle.borderCapture + ' ' + borderStyle.bottomLeft} style={{cursor: 'nesw-resize'}}/>
      </>
    }
    <div style={{overflow: 'hidden', height: '100%', width: '100%'}}>
      <Editor
        ref={editor}
        placeholder={'Empty note'}
        readOnly={state !== 'edit'}
        editorState={editorState} 
        handleKeyCommand={handleKeyCommand}
        onChange={handleChange}
        keyBindingFn={checkSubmit}
      />
    </div>
  </div>
}

export default Pin;