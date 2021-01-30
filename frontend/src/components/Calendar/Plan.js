import React from "react";
import axios from 'axios';
import {InputBase, makeStyles} from "@material-ui/core";

import AuthContext from '../../AuthContext';

const useStyles = makeStyles(() => ({
  planText: {
    border: `none`,
    backgroundColor: 'transparent',
    color: 'black',
    '&:disabled': {
      backgroundColor: 'transparent',
    },
    resize: 'none',
    fontSize: '14px',
    lineHeight: '18px',
    padding: '0px 2px',
  },
  planNode: {
    padding: '0px',
    borderRadius: '4px',
    border: `1px solid transparent`,
    '&:hover': {
      border: `1px solid green`,
    },
    '&:focus': {
      border: `1px solid transparent`,
      backgroundColor: '#f3fef3',
      outline: '0',
    },
  },
}));

function Plan({editPlan, handleMenuEvent, plan: {date_str, plan_id, content}, displayMenu}) {
  const token = React.useContext(AuthContext);
  const classes = useStyles();

  const planHoverIn = (event) => {
    event.currentTarget.closest('[datenode]').style.border = `1px solid transparent`;
  }

  const planHoverOut = (event) => {
    event.currentTarget.closest('[datenode]').style.border = ``;
  }

  const textBlur = (event) => {    
    const plannode = event.currentTarget.closest('[plan]');
    plannode.style.border = '';
    plannode.style.backgroundColor = '';
    plannode.style.outline = '';
    
    event.currentTarget.setAttribute('disabled', '');
    // event.currentTarget.closest('[role=plan]').focus();
    
    const entries = {
      [event.currentTarget.name]: event.currentTarget.value,
    }
    
    if (JSON.stringify(content) === JSON.stringify(entries)) return;

    axios
    .put('/calendar/plan/edit', {
      token,
      plan_id: plan_id,
      content: entries,
    })
    .then((response) => {
      editPlan(date_str, plan_id, entries)
    })
    .catch((err) => {});
  }

  const submitInput = (e) => {
    if (e.key === 'Enter' && !e.getModifierState('Shift')) {
      e.preventDefault();
      e.currentTarget.closest('[plan]').focus();
    }
  };

  const menuEvent = (e) => {

    if (e.key === 'c' && e.getModifierState('Meta')) {
      e.stopPropagation();
      handleMenuEvent({data: {role: 'copy'}, props: {planId: plan_id, dateStr: date_str, planEl: null}})
    }
    else if (e.key === 'v' && e.getModifierState('Meta')) {
      e.stopPropagation();
      handleMenuEvent({data: {role: 'paste'}, props: {planId: plan_id, dateStr: date_str, planEl: null}})
    }
    else if (e.key === 'Backspace') {
      e.stopPropagation();
      handleMenuEvent({data: {role: 'delete'}, props: {planId: plan_id, dateStr: date_str, planEl: null}})
    }
    // else console.log(e.key)
  }

  const handleDragStart = e => {
    const target = e.currentTarget;
    const placeholder = document.createElement('div');
    placeholder.style.height = window.getComputedStyle(target).height;
    placeholder.setAttribute('placeholder', date_str);

    setTimeout(() => {
      target.style.display = 'none'
      target.closest('[plans]').insertBefore(placeholder, target);
    }, 0);

    target.setAttribute('dragging', plan_id);
    target.closest('[datenode]').style.border = `1px solid transparent`;
  }

  const handleDragEnd = e => {
    e.currentTarget.style.display = 'block';
    e.currentTarget.removeAttribute('dragging');
    if (document.querySelector('[placeholder]')) document.querySelector('[placeholder]').remove();
  }

  return (<form
      className={classes.planNode}
      tabIndex='0'
      onMouseOver={planHoverIn}
      onMouseOut={planHoverOut}
      onContextMenu={displayMenu}
      onKeyDown={menuEvent}
      onClick={e => {
        if(e.detail === 2) handleMenuEvent({data: {role: 'edit'}, props: {planId: plan_id, dateStr: date_str, planEl: e.currentTarget}})
      }}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      draggable
      plan={plan_id}
    >
      <InputBase
        name="textContent"
        multiline
        fullWidth
        defaultValue={content.textContent}
        disabled
        autoComplete="off"
        style={{maxWidth: '100%', boxSizing: 'border-box', padding: '0px'}}
        onBlur={textBlur}
        onKeyDown={(e) => {
          e.stopPropagation();
          submitInput(e);
        }}
        classes={{
          inputMultiline: classes.planText,
        }}
      />
    </form>)
}

export default Plan;
