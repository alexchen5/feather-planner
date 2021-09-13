import { DocumentListenerContext } from "components/DocumentEventListener/context";
import { ContentState, Editor, EditorState, getDefaultKeyBinding } from "draft-js";
import React, { MouseEventHandler } from "react";
import { AppContext, db } from "utils/globalContext";
import { useEditorUpdater } from "utils/useEditorUtil";
import { UndoRedoContext } from "utils/useUndoRedo";
import { File } from "../data";

import CloseIcon from '@material-ui/icons/Close';

import 'draft-js/dist/Draft.css';
import style from './inodes.module.scss';
import { IconButton } from "@material-ui/core";
import { useDocumentEventListeners } from "components/DocumentEventListener/useDocumentEventListeners";
import { animated, useSpring } from "react-spring";
import { useMeasure } from "react-use";

let clientDx: number, clientX: number // track drag positions

function InodeTab({ index, numTabs, file, inodePath, isOpen, registerRef, handleMovement }: { 
  index: number,
  numTabs: number,
  file: File, 
  inodePath: string, 
  isOpen: boolean,
  registerRef: (path: string, staticEl: HTMLDivElement | null) => void,
  handleMovement: (offset: number, path: string) => void,
}) {
  const { notes: { tabs } } = React.useContext(AppContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { addAction: addUndo } = React.useContext(UndoRedoContext);

  const [measureStatic, { width: staticWidth }] = useMeasure() 
  const staticRef = React.useRef<HTMLDivElement | null>(null);
  const tabRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<'normal' | 'edit' | 'dragging'>('normal');
  const { registerFocus, deregisterFocus } = useDocumentEventListeners(dispatchListeners);

  const editor = React.useRef<Editor>(null);
  const [editorState, setEditorState] = useEditorUpdater(file.name);

  const editorStateRef = React.useRef<EditorState>(editorState);
  React.useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState])

  const [leftSpring, leftSpringApi] = useSpring(() => ({ from: {left: 0}, config: { mass: 0.4 } }), []);
  const [widthSpring, widthSpringApi] = useSpring(() => ({ from: {width: numTabs > 5 ? 0 : 60}, config: { mass: 0.2, tension: 480 } }), []);
  const [leftMod, setLeftMod] = React.useState(0)
  const leftModRef = React.useRef(0)
  const prvLeft = React.useRef<number | null>(null); // clientLeft

  const curIndex = React.useRef(index)

  React.useLayoutEffect(() => {
    curIndex.current = index
    if (prvLeft.current && staticRef.current) {
      // get current spring x
      const x = leftSpring.left.get();

      // get current style.left
      const cx = x + leftModRef.current;

      const staticDiff = staticRef.current.getBoundingClientRect().left - prvLeft.current

      // calculate movement required
      const dx = staticDiff - cx 

      if (state !== 'dragging') {
        // move spring with cur position + position diff
        leftSpringApi.start({ left: x + dx });
  
        // store the new modifier positions 
        setLeftMod(-(x + dx))
        leftModRef.current = -(x + dx)
      } else {
        // adjust our modifier by the difference in static positions
        setLeftMod(l => {
          leftModRef.current = l - staticDiff 
          return l - staticDiff 
        })
      }
    }
    prvLeft.current = staticRef.current ? staticRef.current.getBoundingClientRect().left : null
  // eslint-disable-next-line
  }, [index, numTabs])

  React.useLayoutEffect(() => {
    if (staticRef.current) {
      widthSpringApi.start({ width: staticWidth });
    }
    // eslint-disable-next-line
  }, [staticWidth])

  /**
   * Take the necessary steps to submit content changes to the db
   * @param val the current text content
   */
  const submitContentChanges = React.useRef<(newName: string) => void>((a) => {})
  submitContentChanges.current = React.useCallback((newName: string) => {
    if (!newName || newName === file.name) { // reset editor state and do nothing if we have an empty title
      // weird glitch where text isnt updated solved with timeout
      setTimeout(() => {
        if (editor.current)
          setEditorState(EditorState.createWithContent(ContentState.createFromText(file.name)));
      }, 150);
      return;
    }
    
    const redo = async () => {
      db.doc(inodePath).set({ name: newName }, { merge: true });
    };
    const undo = async () => {
      db.doc(inodePath).set({...file.restoreData});
    }
    
    redo(); // execute update
    addUndo({undo, redo})
  }, [addUndo, setEditorState, file.name, file.restoreData, inodePath]);

  // Use effect to submit potential changes when the state leaves edit
  React.useEffect(() => {
    if (state === 'edit') {
      return () => {
        const text = editorStateRef.current.getCurrentContent().getPlainText(' ').replace('\n', ' ').trim();
        submitContentChanges.current(text);
      }
    }
    return () => {}
  }, [state])

  const handleMouseDown: MouseEventHandler = (e) => {
    if (state === 'normal') {
      if (!isOpen) tabs.open(inodePath, file.type); // open tab
      mousedownDragInitiate(e); // potentially start drag
    } 
  }

  /**
   * Helper function to set up drag from mousedown
   * @param e 
   */
  const mousedownDragInitiate = (e: React.MouseEvent<Element, MouseEvent>) => {
    clientX = e.clientX;

    registerFocus('tab-try-drag', [
      {
        type: 'mousemove',
        callback: mousemoveTryStartDrag,
      },
      {
        type: 'mouseup',
        // cancel try drag focus on mouseup
        callback: () => deregisterFocus('tab-try-drag'),
      }
    ])
  }

  const mousemoveTryStartDrag = (e: MouseEvent) => {
    // ensure mouse moved enough for a drag
    if (!tabRef.current) {
      console.error('Expected tabRef during drag');
      return;
    }

    if (!(Math.abs(e.clientX - clientX) > 2)) return;

    // Can start the drag now
    setState('dragging'); // set state to dragging

    // dereg previous focus
    deregisterFocus('tab-try-drag');
    deregisterFocus('tab-edit')

    // reg actual dragging listeners
    registerFocus('tab-drag', [
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

  const mousemoveHandleDrag = (e: MouseEvent) => {
    e.preventDefault();
    clientDx = clientX - e.clientX;
    if (!tabRef.current) {
      console.error('Expected tabRef during drag');
      return;
    }

    // error left is how far from the parent container's left we end up 
    // notice no error if we are a positive number, i.e. within the container
    const errLeft = curIndex.current === 0 ? Math.min(tabRef.current.offsetLeft - clientDx, 0) : 0
    clientX = e.clientX - errLeft;
    setLeftMod(l => {
      leftModRef.current = l - clientDx - errLeft
      return l - clientDx - errLeft
    })
    handleMovement(leftSpring.left.get() + leftModRef.current, inodePath)
  }

  const mouseupEndDrag = (e: MouseEvent) => {
    deregisterFocus('tab-drag')
    if (!tabRef.current) {
      console.error('Expected tabRef at drag end');
      return;
    }
    setTimeout(() => {
      // timeout because we are calling from a callback
      leftSpringApi.start({ left: -leftModRef.current })
      if (tabRef.current) setState('normal')
    }, 0);
  }

  const handleClickEdit = () => {
    // expect that pointer event none if tab not open
    if (state === 'normal') {
      setState('edit')
      registerFocus('tab-focus', [
        {
          type: 'mousedown',
          callback: () => {
            if (tabRef.current) setState('normal')
            deregisterFocus('tab-focus')
          }
        }
      ])
    } else if (state === 'edit') {
      editor.current?.focus();
    }
  }

  const handleMouseDownEdit: MouseEventHandler = (e) => {
    // expect that pointer event none if tab not open
    if (state === 'edit') {
      e.stopPropagation();
    }
  }

  const handleCloseClick: MouseEventHandler = (e) => {
    e.stopPropagation();
    tabs.close(inodePath, file.type)
  }

  const handleBlur = () => {
    setState('normal')
    deregisterFocus('tab-focus')
  }

  /**
   * Callback on every key, to check that no new line characters are entered
   * @param e 
   * @returns 
   */
   const checkKey = (e: React.KeyboardEvent): string | null => {
    if (e.key === 'Enter' && !e.shiftKey) {
      editor.current?.blur(); 
      return 'submit';
    } else if (e.key === 'Enter') {
      return 'none';
    }
    return getDefaultKeyBinding(e);
  }

  return (
    <div 
      ref={(r: HTMLDivElement) => {
        registerRef(inodePath, r)
        staticRef.current = r
        measureStatic(r)
      }}
      fp-state={isOpen ? 'open' : 'closed'}
      fp-drag-state={state}
      className={style.tabWrapper}
      style={{
        display: 'flex',
        justifyContent: numTabs > 5 ? 'right' : 'left',
        width: numTabs > 5 ? `calc(100% / ${numTabs})` : '20%',
      }}
    >
      <animated.div
        ref={tabRef}
        className={style.tab}
        fp-state={isOpen ? 'open' : 'closed'}
        fp-drag-state={state}
        style={{
          left: leftSpring.left.to(o => o + leftMod), 
          width: false ? widthSpring.width : '100%', // TODO: animate width properly
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={!isOpen ? {pointerEvents: 'none'} : {}}
          className={style.editorContainer}
          fp-state={state}
          onClick={handleClickEdit}
          onMouseDown={handleMouseDownEdit}
        >
          <Editor
            ref={editor}
            readOnly={!isOpen || state !== 'edit'}
            editorState={editorState} 
            onChange={setEditorState}
            keyBindingFn={checkKey}
            onBlur={handleBlur}
          />
        </div>
        <IconButton 
          size='small' 
          onClick={handleCloseClick}
          onMouseDown={e => e.stopPropagation()}
        >
          <CloseIcon/>
        </IconButton>
      </animated.div>
    </div>
  )
}

export default InodeTab;