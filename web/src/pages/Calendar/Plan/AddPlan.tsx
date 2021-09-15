import React, { KeyboardEvent, MouseEventHandler } from "react";

import IconButton from '@material-ui/core/IconButton';
import { AddCircle } from "@material-ui/icons";
import { convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RichUtils } from "draft-js";
import { getPlanIds } from "utils/dateUtil";
import { db, UidContext } from "utils/globalContext";

import style from './plan.module.scss';
import { CalendarContext } from "../context";
import { useEditorFocus } from "utils/useEditorUtil";
import { UndoRedoContext } from "utils/useUndoRedo";
import { DocumentFocusContext } from "components/DocumentFocusStack";

const AddPlan = React.forwardRef<HTMLButtonElement, { dateStr: string }>(({dateStr}, ref) => {
  const { calendar } = React.useContext(CalendarContext);
  const editor = React.createRef<Editor>();
  const renderRef = React.useRef<HTMLDivElement>(null);
  const [editorState, setEditorState] = React.useState(() => EditorState.createEmpty());
  const [ isFocused, declareFocus, declareBlur ] = useEditorFocus(renderRef, DocumentFocusContext, 'add-plan-editor', 'calendar-root');
  const { addAction: addUndo } = React.useContext(UndoRedoContext);

  const {uid} = React.useContext(UidContext);

  const handleAddClick: MouseEventHandler = (e) => {
    e.stopPropagation();
    // setEditorState(() => EditorState.createEmpty());
    declareFocus();
    // editor.current?.focus();
  }
  const handleEditorBlur = () => {
    handleSubmission();
  }

  const handleSubmission = async () => {
    if (!editorState.getCurrentContent().hasText()) {
      return;
    }

    const ids = getPlanIds(calendar.dates, dateStr);
    const prv = ids[ids.length - 1] || '';

    const newDoc = await db.collection(`users/${uid}/plans`).add({
      date: dateStr,
      header: convertToRaw(editorState.getCurrentContent()),
      prv: prv,
    });

    const redo = async () => {
      db.doc(newDoc.path).set({
        date: dateStr,
        header: convertToRaw(editorState.getCurrentContent()),
        prv: prv,
      })
    }

    const undo = async () => {
      newDoc.delete();
    }
    
    addUndo({ undo, redo })
  }

  React.useEffect(() => {
    if (isFocused) {
      editor.current?.focus();
    }
    if (editorState.getCurrentContent().hasText()) {
      setEditorState(() => EditorState.createEmpty());
    }
    // eslint-disable-next-line
  }, [isFocused]);

  const handleKeyCommand = (command: string): DraftHandleValue => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  const checkSubmit = (e: KeyboardEvent): string | null => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmission();
      declareBlur();
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  return (<div ref={renderRef}>
    {
      isFocused ? 
      <div style={{
        border: '1px dashed var(--edge-blue)',
        padding: '4px 12px 2px 2px',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontSize: 'var(--plan-font-size)',
        marginBottom: '5px',
      }}  onMouseDown={(e) => e.stopPropagation()}>  
        <Editor
          ref={editor}
          editorState={editorState} 
          handleKeyCommand={handleKeyCommand}
          onChange={setEditorState}
          keyBindingFn={checkSubmit}
          onBlur={handleEditorBlur}
        />
      </div> :
      <div className={style.addButton}>
        <IconButton ref={ref} fp-role={'add-plan'} size='small' onClick={handleAddClick}><AddCircle/></IconButton> 
      </div>
    }
  </div>)
});

export default AddPlan;
