import React from "react";
import axios from 'axios';

import AuthContext from '../../AuthContext';

function AddPlan({addPlan, date_str}) {
  const token = React.useContext(AuthContext);

  function submit(event) {
    event.preventDefault();
    const planForm = new FormData(event.target);
    const entries = [...planForm.entries()].reduce((obj, pair) => {return {...obj, [pair[0]]: pair[1]}}, {});
    
    if (!entries.textContent) return;

    axios
      .post('/calendar/plan/new', {
        token,
        date: date_str,
        content: entries,
      })
      .then((response) => {
        addPlan(date_str, parseInt(response.data.plan_id), entries);
      })
    
    event.target.reset();
  }

  const planHoverIn = (event) => {
    event.currentTarget.closest('[datenode]').style.border = `1px solid transparent`;
  }

  const planHoverOut = (event) => {
    event.currentTarget.closest('[datenode]').style.border = ``;
  }

  return (<form 
    onSubmit={submit}
    onMouseOver={planHoverIn}
    onMouseOut={planHoverOut}
  >
    <input name="textContent" autoComplete="off" style={{width: '100%', boxSizing: 'border-box'}}></input>
    {/* <input type="submit"></input> */}
  </form>)
}

export default AddPlan;
