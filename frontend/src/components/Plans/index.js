import React, { useEffect } from "react";
import axios from 'axios';

import {makeStyles} from "@material-ui/core";
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
// import styled from 'styled-components';

import AuthContext from '../../AuthContext';

export const StepContext = React.createContext();
export const StepProvider = StepContext.Provider;
export const StepConsumer = StepContext.Consumer;

const useStyles = makeStyles(() => ({
  planText: {
    border: `none`,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    '&:disabled': {
      backgroundColor: 'transparent',
      color: 'black',
    },
  },
  planNode: {
    padding: '6px',
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
  planContextMenu: {
    boxShadow: 'none',
    border: '1px solid rgba(0, 0, 0, .1)',
  },
}))

// const StyledMenu = styled(Menu).attrs({
//   // custom props
// })`
//   .react-contexify {
//     boxShadow: 'none',
//     border: '1px solid rgba(0, 0, 0, .1)',
//   }
// `;

function Plans({dateStr}) {
  // dateStr is string in 'YYYYMMDD'
  const [planNodes, setPlans] = React.useState([]);
  const { show } = useContextMenu({
    id: 'planContextMenu',
  });
  const token = React.useContext(AuthContext);
  const classes = useStyles();

  function addPlan(event) {
    event.preventDefault();
    const planForm = new FormData(event.target);
    const entries = [...planForm.entries()].reduce((obj, pair) => {return {...obj, [pair[0]]: pair[1]}}, {});
    
    if (!entries.textContent) return;

    axios
      .post('/calendar/plan/new', {
        token,
        date: dateStr,
        content: entries,
      })
      .then((response) => {
        planNodes.push({
          content: entries,
          plan_id: parseInt(response.data['plan_id']),
        })
        setPlans([...planNodes]);
      })
    
    event.target.reset();
  }

  useEffect(() => {
    axios
      .get('/calendar/date', {
        params: {
          token,
          date: dateStr,
        },
      })
      .then(({data}) => {
        const {plans} = data;
        setPlans([...plans]);
      })
      .catch((err) => {});
  }, [dateStr, token]);

  const editPlan = (event) => {
    event.preventDefault();
    const planForm = new FormData(event.target);
    const entries = [...planForm.entries()].reduce((obj, pair) => {return {...obj, [pair[0]]: pair[1]}}, {});
    const planid = parseInt(event.currentTarget.getAttribute('planId'));
    const editPlan = planNodes.find(e => e.plan_id === planid);
    
    if (JSON.stringify(editPlan.content) === JSON.stringify(entries)) return;

    axios
      .put('/calendar/plan/edit', {
        token,
        plan_id: planid,
        content: entries,
      })
      .then((response) => {
        editPlan.content = entries;
        setPlans([...planNodes]);
      })
      .catch((err) => {});

    event.target.reset();
  }

  const planHoverIn = (event) => {
    event.currentTarget.closest('[role=datenode]').style.border = `1px solid transparent`;
  }

  const planHoverOut = (event) => {
    event.currentTarget.closest('[role=datenode]').style.border = ``;
  }
  
  function displayMenu(e){
    // put whatever custom logic you need
    // you can even decide to not display the Menu
    show(e);
    console.log(e.currentTarget);
  }

  function handleItemClick({data: {role, plan}}){
    console.log(role, plan);
  }

  return (
    <StepProvider value={planNodes}>
      {
        planNodes.map(plan => 
          <div key={plan['plan_id']}>
            <div
              className={classes.planNode}
              tabIndex='0'
              onMouseOver={planHoverIn}
              onMouseOut={planHoverOut}
              onContextMenu={displayMenu}
              >
              <form 
                planid={plan['plan_id']}
                onSubmit={editPlan} 
                // onClick={handlePlanClick}
              >
                <input name="textContent"
                  defaultValue={plan['content']['textContent']} 
                  className={classes.planText}
                  disabled 
                  autoComplete="off"
                  style={{maxWidth: '100%', boxSizing: 'border-box'}}
                ></input>
              </form>
            </div>
            {
            // openMenu && 
            <Menu id='planContextMenu' className={classes.planContextMenu}>
              <Item onClick={handleItemClick} data={{role: 'edit'}}>Edit</Item>
              <Item onClick={handleItemClick} data={{role: 'delete'}}>Delete</Item>
              <Separator/>
              <Item onClick={handleItemClick} data={{role: 'cut'}}>Cut</Item>
              <Item onClick={handleItemClick} data={{role: 'copy'}}>Copy</Item>
              <Item onClick={handleItemClick} data={{role: 'paste'}}>Paste</Item>
            </Menu>}
          </div>
        )
      }
      
      {
        <form onSubmit={addPlan}>
          <input name="textContent" autoComplete="off" style={{maxWidth: '100%', boxSizing: 'border-box'}}></input>
          {/* <input type="submit"></input> */}
        </form>
      }
    </StepProvider>
  )
}

export default Plans;