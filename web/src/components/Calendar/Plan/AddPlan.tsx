import React, { KeyboardEvent, MouseEventHandler } from "react";

import IconButton from '@material-ui/core/IconButton';
import { AddCircle } from "@material-ui/icons";
import { CalendarContext } from "..";
import { convertToRaw, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, RichUtils } from "draft-js";
import { getPlanIds } from "../utils/dateUtil";
import { db, UidContext } from "globalContext";

import style from './plan.module.scss';

const AddPlan = React.forwardRef<HTMLButtonElement, { dateStr: string }>(({dateStr}, ref) => {
  const { calendar } = React.useContext(CalendarContext);
  const [isAdding, setIsAdding] = React.useState(false);
  const editor = React.createRef<Editor>();
  const [editorState, setEditorState] = React.useState(() => EditorState.createEmpty());

  const {uid} = React.useContext(UidContext);

  const handleAddClick: MouseEventHandler = (e) => {
    e.stopPropagation();
    setIsAdding(true);
  }
  const handleEditorBlur = () => {
    handleSubmission();
  }

  const handleSubmission = () => {
    if (!editorState.getCurrentContent().hasText()) {
      setIsAdding(false);
      return;
    }

    const ids = getPlanIds(calendar.dates, dateStr);
    const prv = ids[ids.length - 1] || '';
    db.collection(`users/${uid}/plans`).add({
      date: dateStr,
      header: convertToRaw(editorState.getCurrentContent()),
      prv: prv,
    });

    setIsAdding(false);
  }

  React.useEffect(() => {
    if (isAdding) {
      editor.current?.focus();
    }
    if (editorState.getCurrentContent().hasText()) {
      setEditorState(() => EditorState.createEmpty());
    }
    // eslint-disable-next-line
  }, [isAdding]);

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
      return 'submit';
    }
    return getDefaultKeyBinding(e);
  }

  return (<>
    {
      isAdding ? 
      <div style={{
        border: '1px dashed var(--edge-blue)',
        padding: '4px 12px 2px 2px',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontSize: 'var(--plan-font-size)',
        marginBottom: '5px',
      }}>  
        <Editor
          ref={editor}
          editorState={editorState} 
          handleKeyCommand={handleKeyCommand}
          onChange={setEditorState}
          keyBindingFn={checkSubmit}
          onBlur={handleEditorBlur}
        />
      </div> :
      <div className={style.addButton} fp-role={'plan-add'}>
        <IconButton ref={ref} size='small' onClick={handleAddClick}><AddCircle/></IconButton> 
      </div>
    }
  </>)
});

export default AddPlan;
