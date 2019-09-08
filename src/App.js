import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import 'antd/dist/antd.css';
import './AnnoTypes/PronounRelevance/PronounRelevanceComponent.scss';
import PronounRelevanceComponent from './AnnoTypes/PronounRelevance/PronounRelevanceComponent';
import comp_props from './AnnoData';

class App extends Component {
  render() {
    return (
      <div className="App">
        <PronounRelevanceComponent
          {...comp_props}
        />
      </div>
    );
  }
}

export default App;
