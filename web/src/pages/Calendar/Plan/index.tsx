import { Delete, FormatBold, FormatItalic, FormatUnderlined, MoreVert } from "@material-ui/icons";
import { ContentState, convertFromRaw, convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RawDraftContentState, RichUtils, SelectionState } from "draft-js";
import React, { KeyboardEvent as ReactKeyboardEvent, useState } from "react";
import PlanStyles from "./PlanStyles";
import { CalendarPlanProp } from "types/components/Calendar";
import { db, UidContext } from "utils/globalContext";
import { MouseEventHandler } from "react";
import { getPlanIds } from "utils/dateUtil";

import style from './plan.module.scss';
import panelStyle from './editPanel.module.scss';
import { key } from "utils/keyUtil";
import { DraggingPlansContext } from "../PlanDragHandler/context";
import { DocumentListenerContext } from "components/DocumentEventListener/context";
import { CalendarContext } from "../context";
import { UndoRedoContext } from "utils/useUndoRedo";

/**
 * Describes the state of the plan. Note that text values are connected to stylesheets.
 */
type PlanState = 'normal' | 'edit' | 'edit-expand' | 'dragging';

function isEdit(state: PlanState): boolean {
  return state === "edit" || state === "edit-expand";
}

/**
 * Context for if the plan style menu is open. Boolean.
 */
export const StyleOpenContext = React.createContext({} as { styleOpen: boolean; setStyleOpen: React.Dispatch<React.SetStateAction<boolean>>; });

const timeOutSubscriptions: NodeJS.Timeout[] = []; // track any timeout functions being used
let pos3: number, pos4 = 0; // track drag positions

function Plan({plan: {dateStr, restoreData, planId, styleId, isDone, content, nxt, prv}}: { plan: CalendarPlanProp }) {
  const { calendar } = React.useContext(CalendarContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  const { dragPlans, isDragging, startDrag } = React.useContext(DraggingPlansContext);

  const planRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = useState(dragPlans.some(e => e.planId === planId) ? 'dragging' : 'normal' as PlanState);
  const [styleOpen, setStyleOpen] = useState(false);

  const {uid} = React.useContext(UidContext);
  const { stack, addUndo, undo, redo } = React.useContext(UndoRedoContext);
  const editChangeCount = React.useRef<number>(0);
  const editUndoCount = React.useRef<number>(0);

  // text editor management
  const textEdit = React.useRef<Editor>(null);
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
    ),
  );
  const [originalState, setOriginalState] = useState(editorState);
  const [didChange, setDidChange] = React.useState(false);

  // updating editorState when content changes
  React.useEffect(() => {
    const currentContent = editorState.getCurrentContent();
    const firstBlock = currentContent.getBlockMap().first();
    const lastBlock = currentContent.getBlockMap().last();
    const firstBlockKey = firstBlock.getKey();
    const lastBlockKey = lastBlock.getKey();
    const lengthOfLastBlock = lastBlock.getLength();
    
    const selection = new SelectionState({
      anchorKey: firstBlockKey,
      anchorOffset: 0,
      focusKey: lastBlockKey,
      focusOffset: lengthOfLastBlock,
    });

    setEditorState(
      EditorState.acceptSelection(
        EditorState.createWithContent(
          typeof content === 'string' ? ContentState.createFromText(content) : convertFromRaw(content)
        ), 
        selection
      )
    );
    // eslint-disable-next-line
  }, [content]);

  /**
   * Helper function to take the necessary steps to delete self
   */
  const deleteSelf = React.useCallback(() => {
    // ensure edit listeners are cleaned up
    dispatchListeners({ type: 'deregister-focus', focusId: 'plan-edit', removeListeners: true });

    // delete plan from db
    const ids = getPlanIds(calendar.dates, dateStr); // TODO: change to use allDates api
    const p = ids.indexOf(planId);

    const undo = async () => {
      const restoreBatch = db.batch();
      if (ids[p+1]) restoreBatch.update(db.doc(`users/${uid}/plans/${ids[p+1]}`), 'prv', planId);
      restoreBatch.set(db.doc(`users/${uid}/plans/${planId}`), {...restoreData})
      restoreBatch.commit();
    }
    const action = async () => {
      const delBatch = db.batch();
      if (ids[p+1]) delBatch.update(db.doc(`users/${uid}/plans/${ids[p+1]}`), 'prv', ids[p-1] || '');
      delBatch.delete(db.doc(`users/${uid}/plans/${planId}`));
      delBatch.commit();
    }
    action();
    addUndo({ undo, redo: action })

  }, [uid, calendar.dates, dateStr, planId, restoreData, addUndo, dispatchListeners]);

  /**
   * Take the necessary steps to deregister current plan as edit
   */
   const deregisterPlanEdit = React.useCallback(() => {
    dispatchListeners({ type: 'deregister-focus', focusId: 'plan-edit', removeListeners: true });
    // TODO: remove unsafe timeout
    timeOutSubscriptions.push(setTimeout(() => setState('normal'), 0)); // set normal state, with timeout so that the editor blur event has time to fire 
  }, [dispatchListeners]);

  /**
   * Take the necessary steps to submit plan changes to the db
   * @param val the current text content
   * @param shouldClose true if we want to lose edit state
   * @param hasChange true if the submission contains meaningful content changes
   */
  const submitPlanChanges = React.useCallback((val: RawDraftContentState | false, shouldClose: boolean, hasChange: boolean) => {
    if (!val) { // run delete first
      deleteSelf();
      return;
    }
    if (shouldClose) deregisterPlanEdit(); // turn off edit state if need
    if (hasChange) { // dispatch changes to the plan content
      editChangeCount.current = editChangeCount.current + 1; // increment change counter

      const action = async () => {
        db.doc(`users/${uid}/plans/${planId}`).update('header', val);
      };
      const undo = async () => {
        db.doc(`users/${uid}/plans/${planId}`).update('header', typeof content === 'string' ? content : {...content});
      }
      addUndo({ undo, redo: action })
      action();
    } else {
      // no changes to dispatch
    }
  }, [addUndo, content, deleteSelf, deregisterPlanEdit, planId, uid])

  /**
   * Handle the click event of a plan. 
   * @param e 
   */
  const handleClick: MouseEventHandler = (e) => {
    if (state === 'normal') { 
      // register edit state after the completion of a click
      e.stopPropagation(); // prevent event from propagating further
      registerPlanEdit(); // register edit
    }
  }

  /**
   * Handle the mousedown event of a plan
   * @param e 
   */
  const handleMouseDown: MouseEventHandler = (e) => {
    const dragInitiate = () => { // helper function to set up drag from mousedown
      pos3 = e.clientX;
      pos4 = e.clientY;

      // set up drag listeners
      dispatchListeners({ 
        type: 'register-focus', 
        focusId: 'plan-try-drag',
        listeners: [
          { 
            focusId: 'plan-try-drag', 
            type: 'mousemove', 
            callback: tryStartDrag, 
          },
          {
            focusId: 'plan-try-drag', 
            type: 'mouseup', 
            callback: cancelTryStartDrag,
          }
        ],
      });
    }

    const target = e.target as HTMLElement; // assume target is html element
    if (state === 'normal') {
      dragInitiate(); // potentially start a drag 
    } else if (isEdit(state) && target.getAttribute('fp-role') === 'edit-panel') {
      e.stopPropagation(); // stop mousedown from going to document
      dragInitiate(); // potentially start a drag 
    } else if (isEdit(state)) {
      e.stopPropagation(); // stop mousedown from going to document
    }
  }
  
  /**
   * Take the necessary steps to register current plan as edit
   */
  const registerPlanEdit = () => {
    dispatchListeners({ 
      type: 'register-focus', 
      focusId: 'plan-edit',
      listeners: [
        { 
          // keydown events to be handled by this plan
          focusId: 'plan-edit', 
          type: 'keydown', 
          callback: (e) => handleKeyDown.current(e), 
        },
        {
          // add own deregister event
          focusId: 'plan-edit', 
          type: 'mousedown', 
          callback: deregisterPlanEdit,
        }
      ],
    });

    editChangeCount.current = 0; // reset change counters
    editUndoCount.current = 0; 
    setState('edit'); // set edit state
    selectAllText();
  }

  /**
   * Callback to start drag on the plan
   */
  const tryStartDrag = React.useCallback((e) => {
    e.preventDefault(); // prevent weird highlighting of text due to drag

    if (!planRef.current) {
      console.error('Expected planRef during drag');
      return;
    }
    
    // ensure mouse moved enough for a drag
    if (!(Math.abs(e.clientX - pos3) > 2 || Math.abs(e.clientY - pos4) > 2)) return;
        
    // Can start the drag now
    setState('dragging'); // set state to dragging

    dispatchListeners({ type: 'deregister-focus', focusId: 'plan-edit', removeListeners: true }); // remove edit listeners
    dispatchListeners({ type: 'deregister-focus', focusId: 'plan-try-drag', removeListeners: true }); // remove try drag listeners

    const el = planRef.current.cloneNode(true) as HTMLDivElement;
    el.className = style.placeholder;
    el.style.width = planRef.current.getBoundingClientRect().width + 'px';
    el.style.height = planRef.current.getBoundingClientRect().height + 'px';

    startDrag({ planId, restoreData, isDone, content, styleId }, dateStr, el, e.clientX, e.clientY );
  }, [planId, dateStr, restoreData, isDone, content, styleId, startDrag, dispatchListeners]);

  /**
   * Callback to cancel the start drag listener
   */
  const cancelTryStartDrag = React.useCallback(() => {
    dispatchListeners({ type: 'deregister-focus', focusId: 'plan-try-drag', removeListeners: true });
  }, [dispatchListeners]);

  // Update dragging state when isDragging trigger changes
  React.useEffect(() => {
    if (!isDragging) {
      setState(state => state === 'dragging' ? 'normal' : state)
    } else {
      dragPlans.some(e => e.planId === planId) && setState('dragging')
    }

    // eslint-disable-next-line 
  }, [isDragging]);

  /**
   * Handle mousedown of clicking expand edit options
   * @param e 
   */
  const handleExpandEditMouseDown: MouseEventHandler  = (e) => {
    e.stopPropagation();
    setState('edit-expand'); // set edit expand state
  }

  const toggleDone: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isEdit(state)) {
      editChangeCount.current = editChangeCount.current + 1;
    }

    const action = async () => {
      db.doc(`users/${uid}/plans/${planId}`).update('done', !isDone);
    }
    const undo = async () => {
      db.doc(`users/${uid}/plans/${planId}`).update('done', isDone);
    }
    action();
    addUndo({ undo, redo: action })
  }

  /**
   * Function to handle the key interactions with the plan. This is added to document when the
   * plan is in edit state.
   * @param {KeyboardEvent} e 
   */
  const handleKeyDown = React.useRef<(e: KeyboardEvent) => void>(() => {})
  handleKeyDown.current = React.useCallback((e) => { // useCallback to preserve referential equality between renders 
    if (key.isDelete(e)) {
      deleteSelf();
    }
    else if (e.key === 'Enter') {
      deregisterPlanEdit();
    }
    else if (key.isMeta(e) && e.key === 'b') {
      changeStyleHelper.current('BOLD')
    }
    else if (key.isMeta(e) && e.key === 'i') {
      changeStyleHelper.current('ITALIC')
    }
    else if (key.isMeta(e) && e.key === 'u') {
      changeStyleHelper.current('UNDERLINE')
    }
    else if (key.isMeta(e) && !e.shiftKey && e.key === 'z') {
      if (editChangeCount.current > 0) {
        editChangeCount.current = editChangeCount.current - 1;
        editUndoCount.current = editUndoCount.current + 1;
        undo();
      } else if (stack.undo.length) {
        deregisterPlanEdit();
        undo();
      }
    } else if (key.isMeta(e) && e.shiftKey && e.key === 'z') {
      if (editUndoCount.current > 0) {
        editUndoCount.current = editUndoCount.current - 1;
        editChangeCount.current = editChangeCount.current + 1;
        redo();
      } else if (stack.redo.length) {
        deregisterPlanEdit();
        redo();
      }
    }
    // else console.log(e.key)
  }, [deleteSelf, deregisterPlanEdit, redo, undo, stack.redo.length, stack.undo.length]);

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
   * Callback on every key, to check if submit was called
   */
  const checkSubmit = (e: ReactKeyboardEvent): string | null => {
    if (e.key === 'Enter' && !e.shiftKey) {
      submitPlanChanges(
        editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
        true,
        didChange
      );
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  /**
   * Callback when the editor element is focused. We reset our 
   * change event listener
   */
  const handleFocus = () => {
    setDidChange(false);
    setOriginalState(editorState);
  }

  /**
   * Callback when the editor loses focus. Call the submit event.
   */
  const handleBlur = () => {
    submitPlanChanges(
      editorState.getCurrentContent().hasText() && convertToRaw(editorState.getCurrentContent()), 
      false,
      didChange
    )
    setDidChange(false);
    setTimeout(selectAllText); // set timeout so that blur event has time to finish firing 
  }

  /**
   * Wrapper function to set editor state. Used to log changes so that db writes 
   * are not wasted
   * @param {EditorState} newState 
   */
   const handleChange = React.useCallback((newState: EditorState) => {
    const currentContentState = originalState.getCurrentContent()
    const newContentState = newState.getCurrentContent()
  
    // note that this comparison of variables is incomplete
    if (currentContentState !== newContentState) {
      // There was a change in the content  
      setDidChange(true);
    } else {
      // No change from original / the change was triggered by a change in focus/selection
      setDidChange(false);
    }
    setEditorState(newState);
  }, [originalState])

  /**
   * Handle the editor style changes that should occur when a toggle button is pressed
   * @param {MouseEvent} e 
   * @param {string} style
   */
  const handleStyleToggleMouseDown = (e: React.MouseEvent, style: string) => {
    e.preventDefault(); 
    changeStyleHelper.current(style)
  }
  const changeStyleHelper = React.useRef<(style: string) => void>((a) => {})
  changeStyleHelper.current = React.useCallback((style: string) => {
    const newState = RichUtils.toggleInlineStyle(editorState, style);
    handleChange(newState);
    // TODO: find proper way to implement textEdit.current?.editor
    // @ts-ignore 
    if (document.activeElement === textEdit.current?.editor) {
      // editor is focused at the moment, edits will be pushed to db later
    } else {
      // push changes to db immediately
      submitPlanChanges(
        convertToRaw(newState.getCurrentContent()),
        false,
        true
      )
    }
  }, [editorState, handleChange, submitPlanChanges])

  /**
   * Helper function to reset selection to all text so that styling buttons affect all text
   */
  const selectAllText = () => {
    const currentContent = editorState.getCurrentContent();
    const firstBlock = currentContent.getBlockMap().first();
    const lastBlock = currentContent.getBlockMap().last();
    const firstBlockKey = firstBlock.getKey();
    const lastBlockKey = lastBlock.getKey();
    const lengthOfLastBlock = lastBlock.getLength();
    
    const selection = new SelectionState({
      anchorKey: firstBlockKey,
      anchorOffset: 0,
      focusKey: lastBlockKey,
      focusOffset: lengthOfLastBlock,
    });
    handleChange(EditorState.acceptSelection(editorState, selection));
  }

  return (
    <div 
      ref={planRef}
      className={style.inner}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={(e) => {e.stopPropagation()}} // stop key events from within bubble out
      fp-role={"calendar-plan"}
      data-id={planId}
      fp-state={state} // the state of this plan - see PlanState at top of this file
    >
      {isEdit(state) && 
        <div className={style.editPanel} fp-role={"edit-panel"}>
          {state === "edit-expand" ? 
            <> {/* Case: fully expanded */}
              <div className={panelStyle.styleIcons}>
                <div className={panelStyle.icon} fp-state={editorState.getCurrentInlineStyle().has('BOLD') ? 'active' : 'inactive'}
                  onMouseDown={e => handleStyleToggleMouseDown(e, 'BOLD')}
                >
                  <FormatBold/>
                </div>
                <div className={panelStyle.icon} fp-state={editorState.getCurrentInlineStyle().has('ITALIC') ? 'active' : 'inactive'}
                  onMouseDown={e => handleStyleToggleMouseDown(e, 'ITALIC')}
                >
                  <FormatItalic/>
                </div>
                <div className={panelStyle.icon} fp-state={editorState.getCurrentInlineStyle().has('UNDERLINE') ? 'active' : 'inactive'}
                  onMouseDown={e => handleStyleToggleMouseDown(e, 'UNDERLINE')}
                >
                  <FormatUnderlined/>
                </div>
              </div>
              <div className={panelStyle.deleteIcon} onMouseDown={e => {e.preventDefault(); deleteSelf();}}>
                <Delete/>
              </div>
              <div className={panelStyle.labelsAnchor}>
                <StyleOpenContext.Provider value={{styleOpen, setStyleOpen}}>
                  <PlanStyles planId={planId} currentStyleId={styleId}/>
                </StyleOpenContext.Provider>
              </div>
            </>
            : <> {/* Case: half expanded */}
              <div className={panelStyle.expandIcon} onMouseDown={handleExpandEditMouseDown}>
                <MoreVert/>
              </div>
            </>
          }
        </div>
      }
      <div className={style.content} style={{color: `var(--plan-color${isDone ? '-done' : ''}-${styleId || 'default'})`}}>
        <Editor 
          ref={textEdit}
          readOnly={!isEdit(state)}
          editorState={editorState} 
          handleKeyCommand={handleKeyCommand}
          onChange={handleChange}
          keyBindingFn={checkSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <div className={style.toggler} style={{color: `var(--plan-color${isDone ? '-done' : '-done'}-${styleId || 'default'})`}}>
          <span 
            className={style.button}
            onMouseDown={e => {e.stopPropagation(); e.preventDefault()}}
            onClick={toggleDone}
          >
            <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
              <circle cx="50%" cy="50%" r="50%"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}

export default Plan;
