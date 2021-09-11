import { DocumentListenerContext } from "components/DocumentEventListener/context";
import { useDocumentEventListeners } from "components/DocumentEventListener/useDocumentEventListeners";
import { convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RawDraftContentState, RichUtils } from "draft-js";
import React, { MouseEventHandler, KeyboardEvent as ReactKeyboardEvent } from "react";
import { AppContext, db } from "utils/globalContext";
import { key } from "utils/keyUtil";
import { useEditorChangeLogger, useEditorUpdater } from "utils/useEditorUtil";
import { UndoRedoContext } from "utils/useUndoRedo";
import { PinboardPin } from "../data";

import 'draft-js/dist/Draft.css';
import style from './pinboard.module.scss';
import borderStyle from './borderCapture.module.scss';
import { PinStyling } from ".";

type ResizeStyle = 'ns' | 'ew' | 'nwse' | 'nesw';
type ResizeDirections = 'n' | 'e' | 's' | 'w';
let clientDx: number, clientDy: number, clientX: number, clientY: number // track drag positions

function Pin({ pin, updateCurrentPin }: {pin: PinboardPin, updateCurrentPin: (pin: PinStyling | null) => void}) {
  const { notes: { tabs } } = React.useContext(AppContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { registerFocus, deregisterFocus, triggerListener } = useDocumentEventListeners(dispatchListeners);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);

  const pinRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<'normal' | 'edit' | 'dragging' | 'resizing'>('normal');

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(pin.content);
  const [ didChange, logChange, reset ] = useEditorChangeLogger(editorState);

  /**
   * Helper function to take the necessary steps to delete self
   */
  const deleteSelf = React.useRef(() => {}) 
  deleteSelf.current = () => {
    // ensure edit listeners are cleaned up
    deregisterFocus('pin-edit');

    // execute delete
    db.doc(pin.docPath).delete();

    const redo = async () => {
      setTimeout(() => {
        tabs.open(pin.inodePath, 'pinboard')
        db.doc(pin.docPath).delete();
      }, 50);
    }
    const undo = async () => {
      setTimeout(() => {
        tabs.open(pin.inodePath, 'pinboard')
        db.doc(pin.docPath).set({...pin.restoreData});
      }, 50);
    }
    addUndo({undo, redo})
  }

  /**
   * Take the necessary steps to submit content changes to the db
   * @param val the current text content
   */
  const submitContentChanges = React.useRef<(val: RawDraftContentState | false) => void>(() => {});
  submitContentChanges.current = (val: RawDraftContentState | false) => {
    if (!didChange) return;

    if (!val) { // run delete first
      deleteSelf.current();
      return;
    }
    
    // execute update
    db.doc(pin.docPath).set({ content: val, lastEdited: Date.now() }, { merge: true });

    const redo = async () => {
      setTimeout(() => {
        tabs.open(pin.inodePath, 'pinboard')
        db.doc(pin.docPath).set({ content: val, lastEdited: Date.now() }, { merge: true });
      }, 50);
    };
    const undo = async () => {
      setTimeout(() => {
        tabs.open(pin.inodePath, 'pinboard')
        db.doc(pin.docPath).set({...pin.restoreData});
      }, 50);
    }
    addUndo({undo, redo})
  }

  // our edit end handler function
  const handleEditStart = React.useRef(() => {});
  handleEditStart.current = () => {
    reset(editorState);
    triggerListener('pin-edit', 'mousedown', new MouseEvent('mousedown'))
    setTimeout(() => // set timeout to let the above trigger
      registerFocus('pin-edit', [
        {
          type: 'keydown',
          callback: (e: KeyboardEvent) => handleKeyDown.current(e)
        },
        {
          type: 'mousedown',
          // edit end function contained in a ref so its value is mutable
          callback: () => { 
            deregisterFocus('pin-edit');
            if (pinRef.current) setState('normal') 
          },
        }
      ])
    ); 
  }

  /**
   * our edit end handler function
   */
  const handleEditEnd = React.useRef(() => {});
  handleEditEnd.current = () => {
    setState('normal')
    updateCurrentPin(null)
    deregisterFocus('pin-edit');
    submitContentChanges.current(
      editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
    );
  }

  React.useEffect(() => {
    if (state === 'normal') {

    } else if (state === 'edit') {
      handleEditStart.current()
      return () => handleEditEnd.current()
    }
    return () => {}
  }, [state]);

  const handleClick: MouseEventHandler = (e) => {
    if (state === 'normal') { 
      // register edit state after the completion of a click
      setState('edit')
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
        callback: (e: MouseEvent) => mousemoveTryStartDrag.current(e),
      },
      {
        type: 'mouseup',
        // cancel try drag focus on mouseup
        callback: () => deregisterFocus('pin-try-drag'),
      }
    ])
  }

  const mousemoveTryStartDrag = React.useRef<(e: MouseEvent) => void>((e) => {});
  mousemoveTryStartDrag.current = (e: MouseEvent) => {
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
    if (state === 'normal') e.stopPropagation();
    // set document cursor style
    document.documentElement.style.cursor = style + '-resize';
    setState('resizing'); // set state to resizing

    clientX = e.clientX;
    clientY = e.clientY;

    // reg resize listeners
    registerFocus('pin-resize', [
      {
        type: 'mousemove',
        callback: (e: MouseEvent) => mousemoveResize.current(e, directions)
      },
      {
        type: 'mouseup',
        callback: () => mouseupResize.current(),
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

  const mousemoveResize = React.useRef<(e: MouseEvent, directions: ResizeDirections[]) => void>((a, b) => {})
  mousemoveResize.current = (e: MouseEvent, directions: ResizeDirections[]) => {
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
      if (newH !== pinRef.current.style.height && pinRef.current.offsetTop - clientDy >= 6) {
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
      if (newW !== pinRef.current.style.width && pinRef.current.offsetLeft - clientDx >= 6) {
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

    // execute update
    db.doc(pin.docPath).set({ position: { top, left }, lastEdited: Date.now() }, { merge: true });

    const redo = async () => {
      setTimeout(() => {
        tabs.open(pin.inodePath, 'pinboard')
        db.doc(pin.docPath).set({ position: { top, left }, lastEdited: Date.now() }, { merge: true });
      }, 50);
    };
    const undo = async () => {
      setTimeout(() => {
        tabs.open(pin.inodePath, 'pinboard')
        db.doc(pin.docPath).set({...pin.restoreData});
      }, 50);
    }
    addUndo({undo, redo})
  }

  const mouseupResize = React.useRef<() => void>(() => {})
  mouseupResize.current = () => {
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

    // execute update
    db.doc(pin.docPath).set({ size: { width, height }, position: { left, top } }, { merge: true });

    const redo = async () => {
      db.doc(pin.docPath).set({ size: { width, height }, position: { left, top } }, { merge: true });
    };
    const undo = async () => {
      db.doc(pin.docPath).set({...pin.restoreData});
    }
    addUndo({undo, redo})
  }

  /**
   * Function to handle the key interactions. This is added to document through declareFocus
   */
  const handleKeyDown = React.useRef<(e: KeyboardEvent) => void>(() => {})
  handleKeyDown.current = (e: KeyboardEvent) => { 
    if (key.isDelete(e)) {
      e.stopPropagation();
      deleteSelf.current();
    } else if (e.key === 'Enter') {
      handleEditEnd.current();
    }
  }

  const handleKeyBinding = (e: ReactKeyboardEvent): string | null => {
    if (e.key === 'Tab' ) {
      console.log('xd');
      
      const newState = RichUtils.onTab(e, editorState, 4);
      handleChange.current(newState);
      return 'tab';
    }
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
      handleChange.current(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  /**
   * Wrapper function to set editor state. Used to log changes so that db writes 
   * are not wasted
   * @param {EditorState} newState 
   */
  const handleChange = React.useRef<(newState: EditorState) => void>(() => {})
  handleChange.current = (newState: EditorState) => {
    logChange(newState);
    setEditorState(newState);
    handleUpdateCurrentPin.current(newState)
  }

  const handleUpdateCurrentPin = React.useRef<(newState: EditorState) => void>(() => {});
  handleUpdateCurrentPin.current = (newState) => {
    updateCurrentPin({
      editorState: newState,
      onBlockToggle: (blockType: string) => {
        handleChange.current(
          RichUtils.toggleBlockType(
            newState,
            blockType
          )
        )
      },
      onInlineToggle: (inlineStyle: string) => {
        handleChange.current(
          RichUtils.toggleInlineStyle(
            newState,
            inlineStyle
          )
        )
      },
    })
  }

  const handleFocus = () => {
    // handleUpdateCurrentPin.current(editorState)
  }

  const handleBlur = () => {
    updateCurrentPin(null)
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
        onChange={(state) => handleChange.current(state)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyBindingFn={handleKeyBinding}
      />
    </div>
  </div>
}

export default Pin;