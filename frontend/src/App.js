// import logo from './logo.svg';
import './App.css';

import {GridList, GridListTile} from "@material-ui/core";

function App() {
  function  date_nodes() {
    let dayStart = 0;
    let numWeeks = 2;

    let ret = [];
    for (let weeks = 0; weeks < numWeeks; weeks++) {
      for (let day = 7 * weeks + dayStart; day < 7 * (weeks + 1) + dayStart; day++) {
        let curr_date = new Date();
        curr_date.setDate(day - curr_date.getDay());
        ret.push(curr_date.getDate());
      }
    }
    return ret;
  }

  return (
    // <div className="App">
    //   <header className="App-header">
    //     <img src={logo} className="App-logo" alt="logo" />
    //     <p>
    //       Edit <code>src/App.js</code> and save to reload!
    //     </p>
    //     <a
    //       className="App-link"
    //       href="https://reactjs.org"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Learn React
    //     </a>
    //   </header>
    // </div>
    <>
    <GridList>
      {date_nodes().map((day, i) => (
        <GridListTile key={i}><p>{day}</p></GridListTile>
      ))}
    </GridList>
    </>
  );
}

export default App;
