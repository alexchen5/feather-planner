import React from "react";

import IconButton from '@material-ui/core/IconButton';
import { AddCircle } from "@material-ui/icons";
import { CalendarContext } from ".";

function AddPlan({date_str}) {
  const {dispatchDates} = React.useContext(CalendarContext);

  const planHoverIn = (event) => {
    event.currentTarget.closest('.datenode-item').style.border = `1px solid transparent`;
  }
  const planHoverOut = (event) => {
    event.currentTarget.closest('.datenode-item').style.border = ``;
  }

  const handleAddClick = e => {
    dispatchDates({type: 'add', date_str, entries: {textContent: ''}});
  }

  return (
  <div
    className={'plan-add'}
  >
    <IconButton
      size='small'
      onMouseOver={planHoverIn}
      onMouseOut={planHoverOut}
      onClick={handleAddClick}
    >
      <AddCircle/>
    </IconButton>

  </div>)
}

export default AddPlan;
