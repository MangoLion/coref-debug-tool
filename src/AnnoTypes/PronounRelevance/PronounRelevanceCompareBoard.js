import React, { Component } from 'react';
import Select from 'react-select';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import { Row, Col, message, Button } from 'antd';
import _ from 'lodash';
import { hexToRgb, stringToFileDownload } from '../../utils/common';
import classnames from 'classnames';
import AppConst from '../../constants';
import PronounRelevanceStore from './PronounRelevanceStore';
import PronounRelevanceBoard from './PronounRelevanceBoard';

class PronounRelevanceCompareBoard extends Component {
  constructor(props) {
    super(props);

    this.falsy = {};
    this.store = {};
    this.fileList = {};
    this.fileMap = props.fileMap;

    // mentionScoresMap and antecedentScoresMap are both fixed after init
    // mentionScoresList and antecedentScoresList can be changed during interaction

    // a map of mention -> score
    // mention is a string of format "senId_start_end"
    this.mentionScoresMap = new Map();

    // a map of mention -> score map
    // score map: antecedent -> score
    // both mention and antecedent are of format "senId_start_end"
    this.antecedentScoresMap = new Map();

    // a map of mention -> entity_index
    // useful when displaying the subscript of a mention
    this.mentionEntityIndexMap = new Map();
    //userAnswer, gtAnswer, mentionScores, antecedentScores
    this.state = {
      fileList: [],
      mentionF1: null,
      corefF1: null,
      falsy: null,
      entityIndex: null,
      gtHighlightEntities: [],
      uaHighlightEntities: [],
      mentionScoresList: [],
      antecedentScoresList: [],

      userAnswer: props.userAnswer,
      gtAnswer: props.gtAnswer,
      mentionScores: props.mentionScores,
      antecedentScores: props.antecedentScores,

      analyzerMentionSortedByPosition: true,
      analyzerMentionSortedFromLowToHigh: true,
      analyzerSelectedMention: null,

      analyzerAntecedentSortedByPosition: true,
      analyzerAntecedentSortedFromLowToHigh: true,
      analyzerSelectedAntecedent: null,

      selectedValue: props.defaultFile,
    };
    this.handleChange = this.handleChange.bind(this)
  }

  static propTypes = {
    userAnswer: PropTypes.instanceOf(PronounRelevanceStore),
    gtAnswer: PropTypes.instanceOf(PronounRelevanceStore),
  };

  componentWillReceiveProps(nextProps) {


      //this.init(nextProps);
      const { annoResultState: { taskFile, anno_result } } = nextProps;
      this._annoStore = new PronounRelevanceStore(taskFile.sentence, anno_result);
      const { annoResultState: { taskFile: {gt_result } } } = nextProps;
      this._gtStore = new PronounRelevanceStore(taskFile.sentence, gt_result);

      this.setState({
        userAnswer: this._annoStore,
        gtAnswer: this._gtStore,
        mentionScores: nextProps.mention_scores,
        antecedentScores: nextProps.antecedentScores,
        gtHighlightEntities: [],
        uaHighlightEntities: [],
        entityIndex: null,
      });
      const userAnswer = this._annoStore
      const gtAnswer = this._gtStore
      const [match_gt, match_ua] = gtAnswer.generateMatch(userAnswer.entities);

      this.falsy = {
        negative: gtAnswer.generateFalsy(userAnswer.entities),
        positive: userAnswer.generateFalsy(gtAnswer.entities),
        match: match_gt,
        match_ua,
      };
      this.mentionScoresMap.clear();
      this.antecedentScoresMap.clear();

      if (nextProps.mention_scores && nextProps.antecedent_scores){
        // mention scores related
        Object.keys(nextProps.mention_scores).forEach(key => {
          this.mentionScoresMap.set(key, nextProps.mention_scores[key]);
        });
        this.updateMentionScoresList(
          this.state.analyzerMentionSortedByPosition,
          this.state.analyzerMentionSortedFromLowToHigh);

        // antecedent scores related
        Object.keys(nextProps.antecedent_scores).forEach(mention => {
          let subMap = new Map();
          Object.keys(nextProps.antecedent_scores[mention]).forEach(antecedent => {
            subMap.set(antecedent, nextProps.antecedent_scores[mention][antecedent]);
          });
          this.antecedentScoresMap.set(mention, subMap);
        });
        console.log("antecedentScoresMap");
        console.log(this.antecedentScoresMap);

        this.setState({analyzerSelectedMention:null});
        this.updateAntecedentScoresList(this.analyzerSelectedMention, true,
          this.state.analyzerAntecedentSortedByPosition,
          this.state.analyzerAntecedentSortedFromLowToHigh);

        // mention to entity index mapping
        this.mentionEntityIndexMap = new Map();
        userAnswer.entities.forEach((mentions, entity_index) => {
          mentions.forEach(men => {
            const men_str = this.mentionToKey(men);
            this.mentionEntityIndexMap.set(men_str, entity_index);
          });
        });
      }

      this.store = {
        negative: gtAnswer,
        positive: userAnswer,
        match: gtAnswer,
      };



      this.forceUpdate();

  }

  componentDidMount() {
    this.init(this.props);
    this.forceUpdate();
  }

  componentWillUpdate(nextProps, nextState) {
    const { left, right } = this.refs;
    if (!left || !right) return;
    left.clearHeight();
    right.clearHeight();
  }

  componentDidUpdate(prevProps, prevState) {
    const { left, right } = this.refs;
    if (!left || !right) return;
    const heightGroupRight = right.heightGroup;
    const heightGroupLeft = left.heightGroup;
    this.setHeight(heightGroupLeft, heightGroupRight);
  }

  setHeight = (heightGroupLeft, heightGroupRight) => {
    for (const pair in heightGroupLeft) {
      if (!heightGroupRight[pair]) continue;

      const left = findDOMNode(heightGroupLeft[pair]);
      const right = findDOMNode(heightGroupRight[pair]);

      const max = Math.max(left.clientHeight, right.clientHeight);
      left.style.height = `${max}px`;
      right.style.height = `${max}px`;
    }
  };

  mentionToKey = mention => {
    return mention.join('_');
  }

  keyToMention = key => {
    return key.split('_').map(s => parseInt(s));
  }

  mentionToNum = m => {
    const bigNum = 2000;
    return m[0] * bigNum * bigNum + m[1] * bigNum + m[2];
  }

  updateMentionScoresList = (sortedByPosition, sortedFromLowToHigh) => {
    let mentionScoresList = [];
    this.mentionScoresMap.forEach((value, key, map) => {
      let mention = this.keyToMention(key);
      mentionScoresList.push([mention, value]);
    });

    // sort mentions
    console.log("Mention sorting, byPosition=" + sortedByPosition +
      " lowToHigh=" + sortedFromLowToHigh);
    // Here e1, e2 are entries of MentionScoresList.
    const cmpFunc = (e1, e2) => {
      const m1 = e1[0];
      const m2 = e2[0];
      let res = 0;
      if (sortedByPosition) {
        res = this.mentionToNum(m1) - this.mentionToNum(m2);
      } else {
        res = e1[1] - e2[1];
      }
      if (!sortedFromLowToHigh) {
        res = -res;
      }
      return res;
    }
    mentionScoresList.sort(cmpFunc);

    this.setState({
      mentionScoresList: mentionScoresList,
    });
  }

  updateAntecedentScoresList = (analyzerSelectedMention, disableAntecedentSelection,
    sortedByPosition, sortedFromLowToHigh) => {
    // If no mention is selected, there is no antecedent list.
    if (analyzerSelectedMention == null) {
      this.setState({
        antecedentScoresList: [],
        analyzerSelectedAntecedent: null,
      });
      return;
    }
    const selectedMention = this.mentionToKey(analyzerSelectedMention);
    if (!(this.antecedentScoresMap.has(selectedMention))) {
      // There is no antecedent for this mention.
      console.log("selectedMention = " + selectedMention + " not in antecedentScoresMap.");
      return;
    }
    // A valid mention is selected.
    const subMap = this.antecedentScoresMap.get(selectedMention);
    let antecedentScoresList = [];
    subMap.forEach((value, key, map) => {
      // key is a mention string, such as "1_15_20"
      // value is the antecedent score
      antecedentScoresList.push([this.keyToMention(key), value]);
    });

    // sort antecedent
    console.log("Antecedent sorting, byPosition=" + sortedByPosition +
      " lowToHigh=" + sortedFromLowToHigh);
    // Here e1, e2 are entries of AntecedentScoresList.
    const cmpFunc = (e1, e2) => {
      const m1 = e1[0];
      const m2 = e2[0];
      let res = 0;
      if (sortedByPosition) {
        res = this.mentionToNum(m1) - this.mentionToNum(m2);
      } else {
        res = e1[1] - e2[1];
      }
      if (!sortedFromLowToHigh) {
        res = -res;
      }
      return res;
    }
    antecedentScoresList.sort(cmpFunc);

    this.setState({
      antecedentScoresList: antecedentScoresList,
    });

    // when selecting a new mention, disable current antecedent selections
    if (disableAntecedentSelection) {
      this.setState({
        analyzerSelectedAntecedent: null,
      });
    }
  }

  init = props => {
    const { defaultFile, fileList, fileMap, userAnswer, gtAnswer, mentionScores, antecedentScores } = props;
    if (!userAnswer || !gtAnswer) return;
    const [match_gt, match_ua] = gtAnswer.generateMatch(userAnswer.entities);
    //this.setState({selectedValue: defaultFile});
    this.falsy = {
      negative: gtAnswer.generateFalsy(userAnswer.entities),
      positive: userAnswer.generateFalsy(gtAnswer.entities),
      match: match_gt,
      match_ua,
    };

    // mention scores related
    Object.keys(mentionScores).forEach(key => {
      this.mentionScoresMap.set(key, mentionScores[key]);
    });
    this.updateMentionScoresList(
        this.state.analyzerMentionSortedByPosition,
        this.state.analyzerMentionSortedFromLowToHigh);

    // antecedent scores related
    Object.keys(antecedentScores).forEach(mention => {
      let subMap = new Map();
      Object.keys(antecedentScores[mention]).forEach(antecedent => {
        subMap.set(antecedent, antecedentScores[mention][antecedent]);
      });
      this.antecedentScoresMap.set(mention, subMap);
    });
    console.log("antecedentScoresMap");
    console.log(this.antecedentScoresMap);

    // mention to entity index mapping
    this.mentionEntityIndexMap = new Map();
    userAnswer.entities.forEach((mentions, entity_index) => {
      mentions.forEach(men => {
        const men_str = this.mentionToKey(men);
        this.mentionEntityIndexMap.set(men_str, entity_index);
      });
    });

    this.store = {
      negative: gtAnswer,
      positive: userAnswer,
      match: gtAnswer,
    };
  };

  onSelectEntity = (falsy, entityIndex) => {
    let uaHighlightEntities = [];
    let gtHighlightEntities = [];
    const { positive, negative } = this.store;
    switch (falsy) {
      case 'negative': {
        gtHighlightEntities.push(entityIndex);
        uaHighlightEntities = positive.getIntersectionEntities(
          negative.entities[entityIndex],
        );
        break;
      }
      case 'positive': {
        uaHighlightEntities.push(entityIndex);
        gtHighlightEntities = negative.getIntersectionEntities(
          positive.entities[entityIndex],
        );
        break;
      }
      case 'match': {
        const { match, match_ua } = this.falsy;
        gtHighlightEntities.push(entityIndex);
        const index = match.indexOf(entityIndex);
        uaHighlightEntities.push(match_ua[index]);
        break;
      }
    }

    this.setState({
      entityIndex,
      falsy,
      uaHighlightEntities,
      gtHighlightEntities,
    });
  };

  getWordsFromMention = (sentence, start, end) => {
    let words = sentence.slice(start, end);
    words = words.map(word => {
      if (word.length > 2 && word[0] === '*' && word[word.length - 1] === '*') {
        return word.slice(1, word.length - 1);
      } else {
        return word;
      }
    });
    return words;
  }

  renderWords = (falsy, entityIndex) => {
    const store = this.store[falsy];
    const [sentenceId, start, end] = _.first(store.entities[entityIndex]);
    let words = this.getWordsFromMention(store.sentences[sentenceId], start, end);
    const style = {};
    if (store.entities[entityIndex] && store.entities[entityIndex].length > 1) {
      style.borderColor = AppConst.PALLET[entityIndex % AppConst.PALLET.length];
    }

    if (this.state.falsy === falsy && this.state.entityIndex === entityIndex) {
      style.backgroundColor = style.borderColor
        ? hexToRgb(style.borderColor, 0.3)
        : 'rgba(217, 217, 217, .4)';
    }

    return (
      <div
        className={classnames('group-wrapper')}
        style={style}
        onClick={() => this.onSelectEntity(falsy, entityIndex)}
      >
        {words.join(' ')}
        <span className="subscript">{entityIndex}</span>
      </div>
    );
  };

  handleChange = (selectedValue) => {
    this.setState({ selectedValue });
    const contentMap = this.fileMap;
    const selectedContent = contentMap[selectedValue.value];
    this.componentWillReceiveProps(selectedContent);


  }

  renderFalsy = falsyName => {
    const falsy = this.falsy[falsyName];
    return (
      falsy &&
      falsy.map((entityId, index) => (
        <li key={index}>{this.renderWords(falsyName, entityId)}</li>
      ))
    );
  };

  onSelectMention = index => {
    const msList = this.state.mentionScoresList;
    const mention = msList[index][0];
    if (mention == this.state.analyzerSelectedMention) {
      return;
    }
    this.setState({
      analyzerSelectedMention: mention,
    });
    this.updateAntecedentScoresList(mention, true,
      this.state.analyzerAntecedentSortedByPosition,
      this.state.analyzerAntecedentSortedFromLowToHigh);
  }

  mentionsEqual = (m1, m2) => {
    if (m1 == null || m2 == null) {
      return false;
    }
    return (m1[0] == m2[0] && m1[1] == m2[1] && m1[2] == m2[2]);
  }

  renderMentionScore = (index, mentionScoreEntry) => {
    // just a hack. TODO: get sentences from the right place
    const store = this.store["negative"];
    const men = mentionScoreEntry[0];
    const words = this.getWordsFromMention(store.sentences[men[0]], men[1], men[2]);
    const men_str = this.mentionToKey(men);
    const entityIndex = this.mentionEntityIndexMap.get(men_str);
    let wordsStyle = {display: 'table-cell'};
    if (this.mentionsEqual(men, this.state.analyzerSelectedMention)) {
        wordsStyle.backgroundColor = 'rgba(217, 217, 217, .4)';
    }
    // if (store.entities[entityIndex] && store.entities[entityIndex].length > 1) {
    //   style.borderColor = AppConst.PALLET[entityIndex % AppConst.PALLET.length];
    // }
    return (
      <div onClick={() => this.onSelectMention(index)} style={{display: 'table-row'}}>
        <div style={{display: 'table-cell'}}>
          {mentionScoreEntry[1] + ' : '}
        </div>
        <div className={classnames('group-wrapper')} style={wordsStyle}>
          {words.join(' ')}
        </div>
        <span className="subscript">{entityIndex}</span>
      </div>
    );
  };

  renderMentionScores = () => {
    return (this.state.mentionScoresList.map(
      (mentionScoreEntry, index) => (
        <li key={mentionScoreEntry}>{this.renderMentionScore(index, mentionScoreEntry)}</li>
      )
    ));
  }

  handleDownloadSummary = () => {
    const {
      userAnswer,
      gtAnswer,
      annoRecord: { id },
      annoResultState: { taskState: { id: taskId, username } },
    } = this.props;
  };

  onMentionSortedByPositionHandler = () => {
    this.setState({
      analyzerMentionSortedByPosition: !this.state.analyzerMentionSortedByPosition
    });
    this.updateMentionScoresList(
      !this.state.analyzerMentionSortedByPosition,
      this.state.analyzerMentionSortedFromLowToHigh);
  }

  onAntecedentSortedByPositionHandler = () => {
    this.setState({
      analyzerAntecedentSortedByPosition: !this.state.analyzerAntecedentSortedByPosition
    });
    this.updateAntecedentScoresList(
      this.state.analyzerSelectedMention,
      false,
      !this.state.analyzerAntecedentSortedByPosition,
      this.state.analyzerAntecedentSortedFromLowToHigh);
  }

  sortedByPositionText = (sortedByPosition) => {
    if (sortedByPosition) {
      return "by position";
    } else {
      return "by score";
    }
  }

  sortedFromLowToHighText = (sortedFromLowToHigh) => {
    if (sortedFromLowToHigh) {
      return "low to high";
    } else {
      return "high to low";
    }
  }

  onMentionSortedFromLowToHighHandler = () => {
    this.setState({
      analyzerMentionSortedFromLowToHigh: !this.state.analyzerMentionSortedFromLowToHigh
    });
    this.updateMentionScoresList(
      this.state.analyzerMentionSortedByPosition,
      !this.state.analyzerMentionSortedFromLowToHigh);
  }

  onAntecedentSortedFromLowToHighHandler = () => {
    this.setState({
      analyzerAntecedentSortedFromLowToHigh: !this.state.analyzerAntecedentSortedFromLowToHigh
    });
    this.updateAntecedentScoresList(
      this.state.analyzerSelectedMention,
      false,
      this.state.analyzerAntecedentSortedByPosition,
      !this.state.analyzerAntecedentSortedFromLowToHigh);
  }

  onSelectAntecedent = index => {
    const asList = this.state.antecedentScoresList;
    const antecedent = asList[index][0];
    this.setState({
      analyzerSelectedAntecedent: antecedent,
    });
  }

  renderAntecedentScore = (index, antecedentScoreEntry) => {
    // just a hack. TODO: get sentences from the right place
    const store = this.store["negative"];
    const ant = antecedentScoreEntry[0];
    const words = this.getWordsFromMention(store.sentences[ant[0]], ant[1], ant[2]);
    const men_str = this.mentionToKey(ant);
    const entityIndex = this.mentionEntityIndexMap.get(men_str);
    let wordsStyle = {display: 'table-cell'};
    if (this.mentionsEqual(ant, this.state.analyzerSelectedAntecedent)) {
        wordsStyle.backgroundColor = 'rgba(217, 217, 217, .4)';
    }
    return (
      <div onClick={() => this.onSelectAntecedent(index)} style={{display: 'table-row'}}>
        <div style={{display: 'table-cell'}}>
          {antecedentScoreEntry[1] + ' : '}
        </div>
        <div className={classnames('group-wrapper')} style={wordsStyle}>
          {words.join(' ')}
        </div>
        <span className="subscript">{entityIndex}</span>
      </div>
    );
  };

  renderAntecedentScores = () => {
    return (this.state.antecedentScoresList.map((antecedentScoreEntry, index)=>
      <li key={antecedentScoreEntry}>
        {this.renderAntecedentScore(index, antecedentScoreEntry)}
      </li>
    ));
  }

  backgroundClickHandler = () => {
    // TODO: remove all selections
    console.log('background clicked');
  }

  render() {
    const { defaultFile, fileList, fileMap } = this.props;
    const options = [];


    fileList.map(filename => {
      const optionItem = {};
      optionItem['value'] = filename;
      optionItem['label'] = filename;
      options.push(optionItem)
    });
    const {
      selectedValue,
      uaHighlightEntities,
      gtHighlightEntities,
      mentionF1,
      corefF1,
      userAnswer,
      gtAnswer,
    } = this.state;


    return (
      <Row className="pronoun-relevance compare-board" onClick={this.backgroundClickHandler}>
        <Row span={2} >
          <h3>Choose File</h3>
          <Row className="falsy-section">
            <Select
              value={selectedValue}
              onChange={this.handleChange}
              options={options}
            />
          </Row>
        </Row>
        <Col span={5} className="compare-board-column">
          <section className="falsy-section">
            <h3>False Negative 漏标</h3>
            <ul>{this.renderFalsy('negative')}</ul>
          </section>
          <section className="falsy-section">
            <h3>False Positive 多标</h3>
            <ul>{this.renderFalsy('positive')}</ul>
          </section>
          <section className="falsy-section">
            <h3>Match 完全相同</h3>
            <ul>{this.renderFalsy('match')}</ul>
          </section>
        </Col>
        <Col span={14} className="compare-board-column">
          <Row className="compare-area">
            <Col span={12}>
              <h3>gt answer</h3>
              <PronounRelevanceBoard
                ref="left"
                store={gtAnswer}
                isControllable={false}
                isReviewing
                relatedEntities={gtHighlightEntities}
              />
            </Col>
            <Col span={12}>
              <h3>model answer</h3>
              <PronounRelevanceBoard
                ref="right"
                store={userAnswer}
                isControllable={false}
                isReviewing
                relatedEntities={uaHighlightEntities}
                analyzerSelectedMention={this.state.analyzerSelectedMention}
                analyzerSelectedAntecedent={this.state.analyzerSelectedAntecedent}
              />
            </Col>
          </Row>
        </Col>
        <Col span={5} className="compare-board-column">
          <div style={{height: "50%"}}>
            <h3>Mention Scores</h3>
            <div style={{padding: '2px'}}>
              <button style={{width: '120px'}} onClick={this.onMentionSortedByPositionHandler}>
                {this.sortedByPositionText(this.state.analyzerMentionSortedByPosition)}
              </button>
              <button style={{width: '120px'}} onClick={this.onMentionSortedFromLowToHighHandler}>
                {this.sortedFromLowToHighText(this.state.analyzerMentionSortedFromLowToHigh)}
              </button>
            </div>
            <div style={{padding: '2px', height: "75%", overflowY: "auto"}}>
              <ul>{this.renderMentionScores()}</ul>
            </div>
          </div>
          <div style={{height: "50%"}}>
            <h3>Antecedent Scores</h3>
            <div style={{padding: '2px'}}>
              <button style={{width: '120px'}} onClick={this.onAntecedentSortedByPositionHandler}>
                {this.sortedByPositionText(this.state.analyzerAntecedentSortedByPosition)}
              </button>
              <button style={{width: '120px'}} onClick={this.onAntecedentSortedFromLowToHighHandler}>
                {this.sortedFromLowToHighText(this.state.analyzerAntecedentSortedFromLowToHigh)}
              </button>
            </div>
            <div style={{padding: '2px', height: "75%", overflowY: "auto"}}>
              <ul>{this.renderAntecedentScores()}</ul>
            </div>

          </div>
        </Col>
      </Row>
    );
  }
}

export default PronounRelevanceCompareBoard;
