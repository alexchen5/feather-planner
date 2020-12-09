// import logo from './logo.svg';
import React from "react";
import './App.css';

import {makeStyles, GridList, GridListTile} from "@material-ui/core";
import {blueGrey} from '@material-ui/core/colors';

const useStyles = makeStyles((theme) => ({
  datenode_container: {
    margin: '24px',
    height: '640px',
    overflow: 'scroll',
    border: `1px solid ${blueGrey[300]}`,
    backgroundColor: blueGrey[50],
  },
  datenode: {
    backgroundColor: 'white',
    minHeight: '160px',
    borderRadius: '6px'
  },
}));

function App() {
  const classes = useStyles();
  const [dateNodes, setDateNodes] = React.useState(dateNodesInit(-6));
  const paginateWeeksNext = 4;
  const paginateWeeksPrv = 3;

  function dateNodesInit(dayStart) {
    let currDate = new Date();
    currDate.setDate(currDate.getDate() - currDate.getDay() + dayStart);
    return newDateNodes(currDate, 4);
  }

  function newDateNodes(startDate, weeks) {
    let ret = [];
    for (let d = 0; d < 7 * weeks; d++) {
      let newDate = new Date(startDate);
      newDate.setDate(newDate.getDate() + d);
      ret.push(newDate);
    }
    return ret;
  }

  const handleNodePagination = event => {
    if (event.target.scrollHeight - event.target.scrollTop === event.target.clientHeight) {
      let nextDate = new Date(dateNodes[dateNodes.length - 1]);
      nextDate.setDate(nextDate.getDate() + 1);
      setDateNodes([...dateNodes, ...newDateNodes(nextDate, paginateWeeksNext)]);
    } else if (event.target.scrollTop === 0) {
      let prvDate = new Date(dateNodes[0]);
      prvDate.setDate(prvDate.getDate() - 7 * paginateWeeksPrv);
      setDateNodes([...newDateNodes(prvDate, paginateWeeksPrv), ...dateNodes]);
      event.target.scrollTop = 1;
    };
  } 

  return (
    <>
    <GridList cols={7} spacing={6} className={classes.datenode_container} style={{margin: ''}} onScroll={handleNodePagination}>
      {dateNodes.map(day => (
        <GridListTile key={day} style={{height: 'auto'}}>
          <div className={classes.datenode}>
            {day.getDate() === 1 ? day.toLocaleDateString('default', {month: 'long'}) : day.getDate()}
          </div>
        </GridListTile>
      ))}
    </GridList>
    </>
  );
}

export default App;
