import { ContentState, convertFromRaw, Editor, EditorState, Modifier } from 'draft-js';
import React from 'react';
import { StyleEditContext } from '.';

import style from './labels.module.scss';

function PlanStyle({ styleId, label, handleClick } : { styleId: string, label: string, handleClick?: (styleId: string) => void }) {
  const editor = React.createRef<Editor>();
  const [editorState, setEditorState] = React.useState(
    () => EditorState.createWithContent(
      typeof label === 'string' ? ContentState.createFromText(label) : convertFromRaw(label)
    ),
  );
  // const { styleOpen, setStyleOpen } = React.useContext(StyleOpenContext);
  const { inEdit } = React.useContext(StyleEditContext);

  React.useEffect(() => {
    const blocks = editorState
        .getCurrentContent()
        .getBlockMap()
        .toList();
    const updatedSelection = editorState.getSelection().merge({
        anchorKey: blocks.first().get('key'),
        anchorOffset: 0,
        focusKey: blocks.last().get('key'),
        focusOffset: blocks.last().getLength(),
    });
    const newContentState = Modifier.replaceText(
        editorState.getCurrentContent(),
        updatedSelection,
        label
    );
    const newState = EditorState.push(editorState, newContentState, 'remove-range');
    setEditorState(newState);
    // eslint-disable-next-line
  }, [label]);

  return (<div className={style.label} onClick={() => handleClick && handleClick(styleId)}>
    <div className={style.header}>
      <Editor
        ref={editor}
        editorState={editorState} 
        readOnly={!inEdit}
        placeholder={'New Label'}
        onChange={setEditorState}
      />
    </div>
    <div className={style.colorPickers}>
      <div className={style.picker} style={styleId ? {backgroundColor: `var(--plan-color-${styleId})`} : {}}></div>
      <div className={style.picker} style={styleId ? {backgroundColor: `var(--plan-color-done-${styleId})`} : {}}></div>
    </div>
  </div>)
}


export default PlanStyle;