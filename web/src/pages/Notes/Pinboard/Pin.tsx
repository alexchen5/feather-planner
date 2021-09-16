import { convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RichUtils } from "draft-js";
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
import { DocumentFocusContext } from "components/DocumentFocusStack";
import { animated, useSpring } from "react-spring";

type ResizeStyle = 'ns' | 'ew' | 'nwse' | 'nesw';
type ResizeDirections = 'n' | 'e' | 's' | 'w';
let clientDx: number, clientDy: number, clientX: number, clientY: number // track drag positions

function Pin({ pin, updateCurrentPin, onPositionBlink }: {pin: PinboardPin, updateCurrentPin: (pin: PinStyling | null) => void, onPositionBlink: () => void}) {
  const { notes: { tabs } } = React.useContext(AppContext);
  const { mountFocus, unmountFocus } = React.useContext(DocumentFocusContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);

  const pinRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<'normal' | 'edit' | 'dragging' | 'resizing'>('normal');

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(pin.content, (newState) => {
    if (state === 'edit') {
      editStart(newState)
    }
  });
  const { editStart, editChange, editEnd } = useEditorChangeLogger(React.useCallback((editorState: EditorState) => {
    submitContentChanges.current(editorState)
  }, []));

  const [spring, springApi] = useSpring(() => ({ 
    from: { left: pin.position.left, top: pin.position.top, width: pin.size.width, height: pin.size.height }, 
    config: { mass: 0.2, tension: 320 },
  }), []);
  const [mod, setMod] = React.useState({ left: 0, top: 0, width: 0, height: 0 })

  React.useLayoutEffect(() => {
    // our pin positions have changed
    if (pinRef.current) {
      // get spring values 
      const x = spring.left.get(), y = spring.top.get(), w = spring.width.get(), h = spring.height.get();
      // get our current styles
      const cx = x + mod.left, cy = y + mod.top, cw = w + mod.width, ch = h + mod.height;
      // calculate difference in movement
      const dx = pin.position.left - cx, dy = pin.position.top - cy, dw = pin.size.width - cw, dh = pin.size.height - ch;
      // update springs if theres a change
      if (dx || dy || dw || dh) {
        springApi.start({
          to: { left: x + dx, top: y + dy, width: w + dw, height: h + dh },
          onRest: () => onPositionBlink(),
        })
      }
    }
    // eslint-disable-next-line
  }, [pin])

  /**
   * Helper function to take the necessary steps to delete self
   */
  const deleteSelf = React.useRef(() => {}) 
  React.useEffect(() => {
    deleteSelf.current = () => {
      // ensure edit listeners are cleaned up
      unmountFocus('pin-edit');

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
  })

  /**
   * Take the necessary steps to submit content changes to the db
   * @param val the current text content
   */
  const submitContentChanges = React.useRef<(editorState: EditorState) => void>(() => {})
  React.useEffect(() => {
    submitContentChanges.current = (editorState: EditorState) => {
      const val = editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent());

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
  })

  // our edit end handler function
  const handleEditStart = () => {
    editStart(editorState);
    mountFocus('pin-edit', 'notes-root', [
      {
        key: 'keydown',
        callback: (e: KeyboardEvent) => handleKeyDown.current(e),
      },
      {
        key: 'mousedown',
        callback: (e) => {
          const target = e.target as HTMLDivElement;
          if (!target?.closest(`[fp-role="pin"][data-path="${pin.docPath}"]`)) {
            unmountFocus('pin-edit')
          }
        },
      }
    ], () => handleEditEnd.current())
  }

  /**
   * our edit end handler function
   */
  const handleEditEnd = React.useRef(() => {});
  React.useEffect(() => {
    handleEditEnd.current = () => {
      if (pinRef.current) setState('normal')
      updateCurrentPin(null)
      editEnd()
    }
  })

  const handleClick: MouseEventHandler = (e) => {
    if (state === 'normal') { 
      // register edit state after the completion of a click
      setState('edit')
      handleEditStart()
    } else if (state === 'edit') {
      // ensure focus if we have declared focus
      editor.current?.focus();
    } 
  }

  const handleMouseDown: MouseEventHandler = (e) => {
    if (state === 'normal') {
      mousedownDragInitiate(e); // potentially start drag
    }
  }

  /**
   * Helper function to set up drag from mousedown
   * @param e 
   */
  const mousedownDragInitiate = (e: React.MouseEvent<Element, MouseEvent>) => {
    clientX = e.clientX;
    clientY = e.clientY;

    setTimeout(() => { 
      // timeout in order to let the mousedown event propagate before 
      // overiding the focus state
      mountFocus('pin-try-drag', 'notes-root', [
        {
          key: 'mousemove',
          callback: (e: MouseEvent) => mousemoveTryStartDrag.current(e),
        },
        {
          key: 'mouseup',
          // cancel try drag focus on mouseup
          callback: () => unmountFocus('pin-try-drag'),
        }
      ])
    });
  }

  const mousemoveTryStartDrag = React.useRef<(e: MouseEvent) => void>((e) => {});
  React.useEffect(() => {
    mousemoveTryStartDrag.current = (e: MouseEvent) => {
      // ensure mouse moved enough for a drag
      if (!pinRef.current) {
        console.error('Expected pinRef during drag');
        return;
      }

      if (!(Math.abs(e.clientX - clientX) > 2 || Math.abs(e.clientY - clientY) > 2)) return;

      // Can start the drag now
      setState('dragging'); // set state to dragging

      // reg actual dragging listeners
      mountFocus('pin-drag', 'notes-root', [
        {
          key: 'mousemove',
          callback: (e) => mousemoveHandleDrag.current(e),
        },
        {
          key: 'mouseup',
          callback: () => unmountFocus('pin-drag'),
        }
      ], () => {
        mouseupEndDrag()
      })
    }
  })

  const handleMouseDownResize = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, directions: ResizeDirections[], style: ResizeStyle) => {
    e.stopPropagation();
    // set document cursor style
    document.documentElement.style.cursor = style + '-resize';
    setState('resizing'); // set state to resizing

    clientX = e.clientX;
    clientY = e.clientY;

    // reg resize listeners
    mountFocus('pin-resize', 'notes-root', [
      {
        key: 'mousemove',
        callback: (e: MouseEvent) => mousemoveResize.current(e, directions)
      },
      {
        key: 'mouseup',
        callback: () => unmountFocus('pin-resize'),
      }
    ], () => mouseupResize.current())
  }

  const mousemoveHandleDrag = React.useRef<(e: MouseEvent) => void>(() => {});
  React.useEffect(() => {
    mousemoveHandleDrag.current = (e: MouseEvent) => {
      e.preventDefault();
      clientDx = clientX - e.clientX;
      clientDy = clientY - e.clientY;
      if (!pinRef.current) {
        console.error('Expected pinRef during drag');
        return;
      }
      const targetT = pinRef.current.offsetTop - clientDy;
      const offT = Math.max(0, 6 - targetT);// target is not off if ≥ 6
      const targetL = pinRef.current.offsetLeft - clientDx;
      const offL = Math.max(0, 6 - targetL) // target is not off if ≥ 6
  
      clientY = e.clientY + offT
      clientX = e.clientX + offL
      
      setMod(mod => ({
        ...mod,
        left: mod.left - clientDx + offL,
        top: mod.top - clientDy + offT,
      }))
    }
  })

  const mousemoveResize = React.useRef<(e: MouseEvent, directions: ResizeDirections[]) => void>((a, b) => {})
  React.useEffect(() => {
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
        const targetH = parseInt(getComputedStyle(pinRef.current).height) + clientDy;
        const offH = Math.max(0, 25 - targetH); // target is not off if ≥ 25
        const targetT = pinRef.current.offsetTop - clientDy;
        const offT = Math.max(0, 6 - targetT);// target is not off if ≥ 6
        // true for the 3 cases: offH = offT = 0, offH > 0 & offT = 0, offT > 0 & offH = 0
        clientY = e.clientY - offH + offT;
        setMod(mod => ({
          ...mod,
          top: mod.top - clientDy - offH + offT,
          height: mod.height + clientDy + offH - offT,
        }))
      }
      if (directions.includes('s')) {
        const targetH = parseInt(getComputedStyle(pinRef.current).height) - clientDy;
        const offH = Math.max(0, 25 - targetH); // target is not off if ≥ 25
        clientY = e.clientY + offH;
        setMod(mod => ({
          ...mod,
          height: mod.height - clientDy + offH,
        }))
      }
      if (directions.includes('e')) {
        const targetW = parseInt(getComputedStyle(pinRef.current).width) - clientDx;
        const offW = Math.max(0, 25 - targetW); // target is not off if ≥ 25
        clientX = e.clientX + offW;
        setMod(mod => ({
          ...mod,
          width: mod.width - clientDx + offW,
        }))
      }
      if (directions.includes('w')) {
        const targetW = parseInt(getComputedStyle(pinRef.current).width) + clientDx;
        const offW = Math.max(0, 25 - targetW); // target is not off if ≥ 25
        const targetL = pinRef.current.offsetLeft - clientDx;
        const offL = Math.max(0, 6 - targetL) // target is not off if ≥ 6

        clientX = e.clientX - offW + offL
        setMod(mod => ({
          ...mod,
          width: mod.width + clientDx - offL + offW,
          left: mod.left - clientDx + offL - offW,
        }))
      }
    }
  })

  const mouseupEndDrag = () => {
    if (!pinRef.current) {
      console.error('Expected pinRef at drag end');
      return;
    }

    // set state back to normal when the click registers after drag 
    // with timeout so we dont get flashing with z-index changes
    setTimeout(() => {
      if (pinRef.current) setState('normal')
    }, 50);
    
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
  React.useEffect(() => {
    mouseupResize.current = () => {
      // reset document cursor style
      document.documentElement.style.cursor = '';

      setTimeout(() => {
        if (pinRef.current) setState('normal')
      }, 50);
      
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
        setTimeout(() => {
          tabs.open(pin.inodePath, 'pinboard')
          db.doc(pin.docPath).set({ size: { width, height }, position: { left, top } }, { merge: true });
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
  })

  /**
   * Function to handle the key interactions. This is added to document through declareFocus
   */
  const handleKeyDown = React.useRef<(e: KeyboardEvent) => void>(() => {})
  React.useEffect(() => {
    handleKeyDown.current = (e: KeyboardEvent) => { 
      if (key.isDelete(e)) {
        e.stopPropagation();
        deleteSelf.current();
      } else if (e.key === 'Enter') {
        handleEditEnd.current();
      }
    }
  })

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
  React.useEffect(() => {
    handleChange.current = (newState: EditorState) => {
      editChange(newState);
      setEditorState(newState);
      handleUpdateCurrentPin.current(newState)
    }
  })

  const handleUpdateCurrentPin = React.useRef<(newState: EditorState) => void>(() => {});
  React.useEffect(() => {
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
  })

  const handleFocus = () => {
    handleUpdateCurrentPin.current(editorState)
  }

  const handleBlur = () => {
    updateCurrentPin(null)
  }
  
  return <animated.div
    ref={pinRef}
    className={style.pin}
    data-state={state}
    fp-role={'pin'}
    data-path={pin.docPath}
    onClick={handleClick}
    onMouseDown={handleMouseDown}
    onKeyDown={(e) => {e.stopPropagation()}} // stop key events from within bubble out
    style={{
      left: spring.left.to(o => o + mod.left), 
      top: spring.top.to(o => o + mod.top), 
      height: spring.height.to(o => o + mod.height), 
      width: spring.width.to(o => o + mod.width), 
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
    <div className={style.pinSizer}/>
  </animated.div>
}

export default Pin;