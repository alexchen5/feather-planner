import React from "react";
import {makeStyles, GridList, GridListTile} from "@material-ui/core";
import Plans from '../Plans';

const useStyles = makeStyles(() => ({
  datenodeContainer: {
    margin: '24px',
    height: '640px',
    overflow: 'scroll',
    minWidth: '700px',
  },
  datenode: {
    minHeight: '160px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: `1px solid transparent`,
    '&:hover': {
      border: `1px solid rgba(0, 0, 0, .2)`, 
    },
    // '&:active': {
    //   border: `2px solid rgba(0, 0, 0, .2)`,
    // },
    '&:focus': {
      border: `1px solid transparent`,
      backgroundColor: 'rgba(0, 0, 0, .05)',
      outline: '0',
    },
    // pointerEvents: 'none',
  },
  datenodeHeader: {
    borderRadius: '6px',
    fontWeight: 'bold',
    padding: '0.5em',
    marginBottom: '2px',
  },
  nodeFocus: {
    // backgroundColor: 'rgba(0, 0, 0, .02)',
    // border: `2px solid rgba(0, 0, 0, .1)`,
  },
  nodeToday: {
    // backgroundColor: '#0099ff',
    // border: '2px solid #0099ff',
  },
  background0: {
    backgroundColor: '#ff8080',
  },
  background1: {
    backgroundColor: '#ffcc99',
  },
  background2: {
    backgroundColor: '#ffff99',
  },
  background3: {
    backgroundColor: '#ccffcc',
  },
  background4: {
    backgroundColor: '#99ccff',
  },
  background5: {
    backgroundColor: '#ccccff',
  },
  background6: {
    backgroundColor: '#cc99ff',
  },
}));

function Calendar() {
  const dayStart = -6;
  const numWeeksStart = 5;
  const paginateWeeksNext = 4;
  const paginateWeeksPrv = 3;

  const classes = useStyles();
  const [dateNodes, setDateNodes] = React.useState(newDateNodes());

  function dateToStr(date = new Date()) {
    // Given a Date object, returns a string in the form 'YYYYMMDD' (where MM is from 00 - 11)
    // Defaults to the Date of today
    return `${date.getFullYear()}` + `${date.getMonth()}`.padStart(2, 0) + `${date.getDate()}`.padStart(2, 0);
  }

  function strToDate(dateStr = dateToStr()) {
    // Given a dateStr, returns a date object
    // Defaults to a date object of today, at 00:00:00
    return new Date(dateStr.substring(0, 4), dateStr.substring(4, 6), dateStr.substring(6));
  }

  function findDateStart() {
    // Returns the date_str of the first day of the current week
    let currDate = new Date();
    currDate.setDate(currDate.getDate() - currDate.getDay() + dayStart);
    return dateToStr(currDate);
  }

  function newDateNodes(startDateStr=findDateStart(), weeks=numWeeksStart) {
    let ret = [];
    for (let d = 0; d < 7 * weeks; d++) {
      let newDate = strToDate(startDateStr);
      newDate.setDate(newDate.getDate() + d);
      ret.push({
        dateStr: dateToStr(newDate),
      });
    }
    return ret;
  }

  // const handleDatenodeClick = event => {
  //   [...document.getElementById('datenodeContainer').children].forEach((e) => {
  //     e.classList.remove(classes.nodeFocus);
  //     if (e === event.target.parentElement) e.classList.add(classes.nodeFocus);
  //   });
  // }

  const handleNodePagination = event => {
    if (event.currentTarget.scrollHeight - event.currentTarget.scrollTop === event.currentTarget.clientHeight) {
      let nextDate = strToDate(dateNodes[dateNodes.length - 1].dateStr);
      nextDate.setDate(nextDate.getDate() + 1);
      setDateNodes([...dateNodes, ...newDateNodes(dateToStr(nextDate), paginateWeeksNext)]);
    } else if (event.currentTarget.scrollTop === 0) {
      let prvDate = strToDate(dateNodes[0].dateStr);
      prvDate.setDate(prvDate.getDate() - 7 * paginateWeeksPrv);
      setDateNodes([...newDateNodes(dateToStr(prvDate), paginateWeeksPrv), ...dateNodes]);
      event.currentTarget.scrollTop = 1;
    };
  } 

  return (
    <GridList id='datenodeContainer' cols={7} spacing={0} className={classes.datenodeContainer} style={{margin: ''}} onScroll={handleNodePagination}>
      {dateNodes.map(e => {
        const thisDate = strToDate(e.dateStr);
        return (
          <GridListTile 
            key={e.dateStr} 
            style={{height: 'auto'}}
            className={classes.datenode}
            tabIndex='0'
            role='datenode'
            // onClick={handleDatenodeClick}
          >
            <div className={`${classes.datenodeHeader} ${classes['background' + thisDate.getDay()]}`}>
              {e.dateStr === dateToStr() ? 'T o d a y' : thisDate.getDate() === 1 ? thisDate.toLocaleDateString('default', {month: 'long'}) : thisDate.getDate()}
            </div>
            <Plans dateStr={e.dateStr}/>
          </GridListTile>
      )})}
    </GridList>
  );
}

export default Calendar;
