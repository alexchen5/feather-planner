import { Delete, FormatBold, FormatItalic, FormatUnderlined, MoreVert } from "@material-ui/icons";
import { ContentState, convertFromRaw, convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RawDraftContentState, RichUtils, SelectionState } from "draft-js";
import React, { KeyboardEvent, useState } from "react";
import PlanStyles from "./PlanStyles";
import { CalendarPlan } from "types/calendar";
import { db, UidContext } from "utils/globalContext";
import { MouseEventHandler } from "react";
import { CalendarContext } from "..";
import { getPlanIds } from "../../../utils/dateUtil";

import style from './plan.module.scss';
import panelStyle from './editPanel.module.scss';
import { DocumentListenerContext } from "components/DocumentEventListener";
import { DraggingPlan, DraggingPlansContext } from "../PlanDragHandler";
import { key } from "utils/keyUtil";

/**
 * Describes the state of the plan. Note that text values are connected to stylesheets.
 */
type PlanState = 'normal' | 'edit' | 'edit-expand' | 'dragging';

function isEdit(state: PlanState): boolean {
  return state === "edit" || state === "edit-expand";
}

let draggingPlan: DraggingPlan | null = null;

/**
 * Context for if the plan style menu is open. Boolean.
 */
export const StyleOpenContext = React.createContext({} as { styleOpen: boolean; setStyleOpen: React.Dispatch<React.SetStateAction<boolean>>; });

const timeOutSubscriptions: NodeJS.Timeout[] = []; // track any timeout functions being used
let pos3: number, pos4 = 0; // track drag positions
let placeholder: HTMLElement | null = null; // current placeholder for drag

function Plan({plan: {dateStr, restoreData, planId, styleId, isDone, content, prv}}: {plan: CalendarPlan}) {
  const { calendar, dispatch: dispatchCalendar } = React.useContext(CalendarContext);
  const { dispatch: dispatchListeners } = React.useContext(DocumentListenerContext);
  // const [ planRef, planBox ] = useMeasure<HTMLDivElement>();
  const planRef = React.useRef<HTMLDivElement>(null);
  // const planStatic = React.useRef<HTMLDivElement>(null);
  // const planBox = React.useRef<{ originX: number; originY: number; springX: number; springY: number; } | null>(null);
  const [state, setState] = useState(draggingPlan?.planId === planId ? 'dragging' : 'normal' as PlanState);
  const [styleOpen, setStyleOpen] = useState(false);
  const { draggingPlans, addDraggingPlan } = React.useContext(DraggingPlansContext);

  const {uid} = React.useContext(UidContext);

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

    const undo = () => {
      const restoreBatch = db.batch();
      if (ids[p+1]) restoreBatch.update(db.doc(`users/${uid}/plans/${ids[p+1]}`), 'prv', planId);
      restoreBatch.set(db.doc(`users/${uid}/plans/${planId}`), {...restoreData})
      restoreBatch.commit();
    }
    const action = () => {
      const delBatch = db.batch();
      if (ids[p+1]) delBatch.update(db.doc(`users/${uid}/plans/${ids[p+1]}`), 'prv', ids[p-1] || '');
      delBatch.delete(db.doc(`users/${uid}/plans/${planId}`));
      delBatch.commit();
    }
    action();
    dispatchCalendar({ type: 'add-undo', undo: {undo: undo, redo: action} });

  }, [uid, calendar, dateStr, planId, restoreData, dispatchCalendar, dispatchListeners]);

  /**
   * Take the necessary steps to submit plan changes to the db
   * @param val the current text content
   * @param shouldClose true if we want to lose edit state
   * @param hasChange true if the submission contains meaningful content changes
   */
  const submitPlanChanges = (val: RawDraftContentState | false, shouldClose: boolean, hasChange: boolean) => {
    if (!val) { // run delete first
      deleteSelf();
      return;
    }
    if (shouldClose) deregisterPlanEdit(); // turn off edit state if need
    if (hasChange) { // dispatch changes to the plan content
      const action = () => {
        db.doc(`users/${uid}/plans/${planId}`).update('header', val);
      };
      const undo = () => {
        db.doc(`users/${uid}/plans/${planId}`).update('header', typeof content === 'string' ? content : {...content});
      }
      dispatchCalendar({ type: 'add-undo', undo: {undo: undo, redo: action} });
      action();
    } else {
      // no changes to dispatch
    }
  }

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
          callback: handleKeyDown, 
        },
        {
          // add own deregister event
          focusId: 'plan-edit', 
          type: 'mousedown', 
          callback: deregisterPlanEdit,
        }
      ],
    });

    setState('edit'); // set edit state
    selectAllText();
  }

  /**
   * Take the necessary steps to deregister current plan as edit
   */
  const deregisterPlanEdit = React.useCallback(() => {
    dispatchListeners({ type: 'deregister-focus', focusId: 'plan-edit', removeListeners: true });
    // TODO: remove unsafe timeout
    timeOutSubscriptions.push(setTimeout(() => setState('normal'), 0)); // set normal state, with timeout so that the editor blur event has time to fire 
  }, [dispatchListeners]);

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
    dispatchCalendar({ type: 'pause-data-sync' });
    const box = planRef.current.getBoundingClientRect();
    draggingPlan = {
      planId,
      dateStr,
      prv,
      clientX: box.x,
      clientY: box.y,
    };

    // set up starting conditions
    pos3 = e.clientX;
    pos4 = e.clientY;

    // add placeholder
    if (placeholder) { // first remove pre-existing placeholder if it exists
      console.error('Removed placeholder from somewhere it wasnt meant to be.');
      placeholder.remove();
    }
    // placeholder = document.createElement('div'); 
    placeholder = planRef.current.cloneNode(true) as HTMLElement;
    placeholder.className = style.placeholder;
    placeholder.setAttribute('data-date', dateStr);
    placeholder.style.height = getComputedStyle(planRef.current).height;
    placeholder.style.width = getComputedStyle(planRef.current).width;

    const x = (parseInt(placeholder.style.width)) / 2;
    const y = (parseInt(placeholder.style.height)) / 2;
    
    placeholder.style.top =  e.clientY - y + "px";
    placeholder.style.left = e.clientX - x + "px";
    document.body.appendChild(placeholder);

    addDraggingPlan(draggingPlan, placeholder);
  }, [planId, dateStr, prv, addDraggingPlan, dispatchCalendar, dispatchListeners]);

  /**
   * Callback to cancel the start drag listener
   */
  const cancelTryStartDrag = React.useCallback(() => {
    dispatchListeners({ type: 'deregister-focus', focusId: 'plan-try-drag', removeListeners: true });
  }, [dispatchListeners]);

  React.useEffect(() => {
    if (draggingPlan?.planId === planId && !draggingPlans.some(p => p.planId === planId)) {
      if (placeholder) {
        placeholder.remove();
        placeholder = null;
      }

      const to_date = dateStr;
      const from_date = draggingPlan.dateStr;

      const plansTo = getPlanIds(calendar.dates, to_date).filter(id => id !== planId);
      const to_prv_index = prv ? plansTo.indexOf(prv) : -1;
      const to_prv_id = prv;
      const to_nxt_id = plansTo[to_prv_index + 1] || '';

      const plansFrom = getPlanIds(calendar.dates, from_date).filter(id => id !== planId);
      const from_prv_index = draggingPlan.prv ? plansFrom.indexOf(draggingPlan.prv) : -1;
      const from_prv_id = draggingPlan.prv;
      const from_nxt_id = plansFrom[from_prv_index + 1] || '';

      draggingPlan = null;
      setState('normal'); 

      if (to_date === from_date && to_prv_id === from_prv_id && to_nxt_id === from_nxt_id) {
        // no need to move position
        // resume data sync, with immediate update
        dispatchCalendar({ type: 'resume-data-sync', syncNow: true });
      } else {
        // update db
        const action = () => {
          const moveBatch = db.batch();
          if (to_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${to_nxt_id}`), 'prv', planId);
          moveBatch.update(db.doc(`users/${uid}/plans/${planId}`), 'date', to_date, 'prv', to_prv_id);
          if (from_nxt_id) moveBatch.update(db.doc(`users/${uid}/plans/${from_nxt_id}`), 'prv', from_prv_id);
          moveBatch.commit();
        }
        const undo = () => {
          const restoreBatch = db.batch();
          if (to_nxt_id) restoreBatch.update(db.doc(`users/${uid}/plans/${to_nxt_id}`), 'prv', to_prv_id);
          restoreBatch.update(db.doc(`users/${uid}/plans/${planId}`), 'date', from_date, 'prv', from_prv_id);
          if (from_nxt_id) restoreBatch.update(db.doc(`users/${uid}/plans/${from_nxt_id}`), 'prv', planId);
          restoreBatch.commit();
        }
        dispatchCalendar({ type: 'add-undo', undo: {undo: undo, redo: action} });

        action();
        // resume data sync, after updates have been made
        setTimeout(() => {
          dispatchCalendar({ type: 'resume-data-sync', syncNow: true })
        }, 50); 
      }
    }
    // effect only needs to run when draggingPlans changes
    // eslint-disable-next-line 
  }, [draggingPlans]);

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

    db.doc(`users/${uid}/plans/${planId}`).update('done', !isDone);
  }

  /**
   * Function to handle the key interactions with the plan. This is added to document when the
   * plan is in edit state.
   * @param {KeyboardEvent} e 
   */
  const handleKeyDown = React.useCallback((e) => { // useCallback to preserve referential equality between renders 
    if (key.isDelete(e)) {
      e.stopPropagation();
      console.log('delete from backspace');
      
      deleteSelf();
    }
    else if (e.key === 'Enter') {
      e.stopPropagation();
      deregisterPlanEdit();
    }
    // else console.log(e.key)
    // eslint-disable-next-line
  }, []);

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
   * @param {KeyboardEvent} e 
   * @returns 
   */
  const checkSubmit = (e: KeyboardEvent): string | null => {
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
   * Handle the editor style changes that should occur when a toggle button is pressed
   * @param {MouseEvent} e 
   * @param {string} style
   */
  const handleStyleToggleMouseDown = (e: React.MouseEvent, style: string) => {
    e.preventDefault(); 
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
  }

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

  /**
   * Wrapper function to set editor state. Used to log changes so that db writes 
   * are not wasted
   * @param {EditorState} newState 
   */
  const handleChange = (newState: EditorState) => {
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
