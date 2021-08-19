import { ContentState, convertFromRaw, Editor, EditorState, Modifier } from 'draft-js';
import React from 'react';
import { StyleEditContext } from '.';
import { CalendarContext } from '..';
// import { StyleOpenContext } from '../Plan';

function PlanStyle({ planStyle: { id, defaultLabel, handleClick } }) {
  const editor = React.createRef(null);
  const { planStyles } = React.useContext(CalendarContext);
  const label = planStyles[id]?.label || defaultLabel;
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

  return (<div fp-role="label" onClick={() => handleClick(id)}>
    <div fp-role="header">
      <Editor
        ref={editor}
        editorState={editorState} 
        readOnly={!inEdit}
        placeholder={'New Label'}
        onChange={setEditorState}
      />
    </div>
    <div fp-role="color-pickers">
      <div fp-role="picker" style={id && {backgroundColor: `var(--plan-color-${id})`}}></div>
      <div fp-role="picker" style={id && {backgroundColor: `var(--plan-color-done-${id})`}}></div>
    </div>
  </div>)
}


export default PlanStyle;