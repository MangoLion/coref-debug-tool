import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import _ from 'lodash';
import classnames from 'classnames';
import { Col, Row, Button, Alert } from 'antd';
import update from 'immutability-helper';
import PronounRelevanceStore from './PronounRelevanceStore';
import GroupWrapper from './GroupWrapper';

const KEY_CODE = {
  CTRL: 17,
};

let uuid = 0;
class PronounRelevanceBoard extends Component {
  constructor(props) {
    super(props);
    this.enteredEntities = [null];
    this.state = {
      isCheckingSameWord: false,
      sameWords: [],
      isMerging: false,
      isLeaving: false,
      currentEntity: null,
      mergingEntities: [],
      leavingGroup: null,
      availableRange: [],
      isPicking: false,
      hoverWord: null,
      startWord: null,
    };
    this.heightGroup = {};
  }

  static propTypes = {
    isReviewing: PropTypes.bool,
    relatedEntities: PropTypes.array,
    isControllable: PropTypes.bool,
    store: PropTypes.instanceOf(PronounRelevanceStore),
    forceUpdate: PropTypes.func,
  };

  static defaultProps = {
    forceUpdate: _.noop,
  };

  static childContextTypes = {
    _store: PropTypes.instanceOf(PronounRelevanceStore),
    isLeaving: PropTypes.bool,
    isMerging: PropTypes.bool,
    isPicking: PropTypes.bool,
    isReviewing: PropTypes.bool,
    sameWords: PropTypes.array,
    currentEntity: PropTypes.number,
    mergingEntities: PropTypes.array,
    leavingGroup: PropTypes.string,
    availableRange: PropTypes.any,
    hoverWord: PropTypes.array,
    onSelect: PropTypes.func,
    onUnselect: PropTypes.func,
    onPick: PropTypes.func,
    onEnterWord: PropTypes.func,
    onEnterMention: PropTypes.func,
    onDelete: PropTypes.func,
    relatedEntities: PropTypes.array,
    analyzerSelectedMention: PropTypes.array,
    analyzerSelectedAntecedent: PropTypes.array,
  };

  _forceUpdate = () => {
    const { forceUpdate } = this.props;
    forceUpdate({ _trigger: ++uuid });
  };

  handleEnterCheckMode = e => {
    const { isMerging, isLeaving, isPicking, hoverWord } = this.state;
    const { store } = this.props;
    if (isMerging || isLeaving || isPicking) return;
    if (e.ctrlKey) {
      const updates = {
        isCheckingSameWord: true,
      };

      if (hoverWord) {
        const mention = store.getMentionByWord(hoverWord);
        if (mention) {
          updates.sameWords = store.searchSameWords(mention);
        }
      }

      this.setState(updates);
    }
  };

  handleLeaveCheckMode = e => {
    if (!this.state.isCheckingSameWord) return;
    if (e.keyCode == KEY_CODE.CTRL) {
      this.setState({
        isCheckingSameWord: false,
        sameWords: [],
      });
    }
  };

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleEnterCheckMode);
    document.removeEventListener('keyup', this.handleLeaveCheckMode);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleEnterCheckMode);
    document.addEventListener('keyup', this.handleLeaveCheckMode);
  }

  clearHeight = () => {
    for (const pair in this.heightGroup) {
      const element = findDOMNode(this.heightGroup[pair]);
      if (!element) {
        delete this.heightGroup[pair];
      } else {
        element.style.height = null;
      }
    }
  };

  getChildContext() {
    return {
      _store: this.props.store,
      isLeaving: this.state.isLeaving,
      isMerging: this.state.isMerging,
      isPicking: this.state.isPicking,
      isReviewing: this.props.isReviewing,
      sameWords: this.state.sameWords,
      currentEntity: this.state.currentEntity,
      mergingEntities: this.state.mergingEntities,
      leavingGroup: this.state.leavingGroup,
      availableRange: this.state.availableRange,
      hoverWord: this.state.hoverWord,
      onSelect: this.handleSelect,
      onUnselect: this.handleUnselect,
      onPick: this.handlePick,
      onEnterWord: this.handleEnterWord,
      onEnterMention: this.handleEnterMention,
      onDelete: this.handleDelete,
      relatedEntities: this.props.relatedEntities,
      analyzerSelectedMention: this.props.analyzerSelectedMention,
      analyzerSelectedAntecedent: this.props.analyzerSelectedAntecedent,
    };
  }

  isMergeOperationAvailable = () => {
    if (!this.props.store) return false;
    const { isPicking, isLeaving } = this.state;
    return !isPicking && !isLeaving && this.props.store.entities.length > 1;
  };

  isLeaveOperationAvailable = () => {
    if (!this.props.store) return false;
    const { isPicking, isMerging } = this.state;
    return !isPicking && !isMerging && this.props.store.entities.length > 0;
  };

  handleMergeGroup = () => {
    this.setState({
      isMerging: true,
      isLeaving: false,
      mergingEntities: [],
    });
  };

  handleCancelMerge = () => {
    this.setState({
      isMerging: false,
      mergingEntities: [],
    });
  };

  handleConfirmMerge = stayMerging => {
    const { mergingEntities } = this.state;
    const { store } = this.props;
    if (mergingEntities.length < 2) return;
    store.mergeEntity(mergingEntities);
    this.setState({
      isMerging: !!stayMerging,
      mergingEntities: [],
      currentEntity: null,
    });
    this._forceUpdate();
  };

  handleLeaveGroup = () => {
    this.setState({
      isLeaving: true,
      isMerging: false,
    });
  };

  handleCancelLeave = () => {
    this.setState({
      isLeaving: false,
      leavingGroup: null,
      currentEntity: null,
    });
  };

  handleConfirmLeave = () => {
    const { currentEntity, leavingGroup } = this.state;
    const { store } = this.props;
    if (_.isNull(currentEntity) || _.isNull(leavingGroup)) return;
    const mention = this.props.store.removeMentionFromEntity(leavingGroup);
    const sentenceId = mention[0];
    store.createMention({ sentenceId, mention, wrapperKey: `${sentenceId}` });
    this.setState({
      leavingGroup: null,
      currentEntity: null,
    });
    this._forceUpdate();
  };

  handleDelete = instance => {
    const { store } = this.props;
    const { sentenceId, wrapperKey } = instance.props;
    store.deleteMention({ sentenceId, wrapperKey });
    this.setState({
      currentEntity: null,
    });
    this._forceUpdate();
  };

  handlePick = instance => {
    const { store } = this.props;
    const {
      isPicking,
      isLeaving,
      isMerging,
      availableRange: [
        availableSentenceId,
        startWordId,
        stopWordId,
        pickWordId,
      ],
    } = this.state;
    const { wordId, sentenceId, wrapperKey } = instance.props;
    if (isLeaving || isMerging) return;
    if (
      isPicking &&
      availableSentenceId == sentenceId &&
      startWordId <= wordId &&
      wordId < stopWordId
    ) {
      let { startWord } = this.state;
      let stopWord = wrapperKey;

      if (pickWordId > wordId) {
        const tmp = startWord;
        startWord = stopWord;
        stopWord = tmp;
      }

      store.createMention({
        sentenceId,
        startWord,
        stopWord,
      });

      this.setState({
        isPicking: false,
        availableRange: [],
        startWord: null,
        currentEntity: null,
        sameWords: [],
      });

      this._forceUpdate();
    } else {
      const availableRange = store.getAvailableRange(wrapperKey);
      const sameWords = store.searchSameWords([sentenceId, wordId, wordId + 1]);
      this.setState({
        isPicking: true,
        startWord: wrapperKey,
        availableRange,
        currentEntity: null,
        sameWords,
      });
    }
  };

  handleEnterWord = instance => {
    const { sentenceId, wordId } = instance.props;
    const { store } = this.props;
    const hoverWord = [sentenceId, wordId];
    this.setState({
      hoverWord,
    });

    const { isPicking, startWord, isCheckingSameWord } = this.state;
    if (isPicking && startWord) {
      const availableSentenceId = parseInt(startWord);
      const startWordId = store.getWordIndex(startWord);
      if (availableSentenceId !== sentenceId) return;

      let sameWords;
      if (startWordId <= wordId) {
        sameWords = store.searchSameWords([
          sentenceId,
          startWordId,
          wordId + 1,
        ]);
      } else {
        sameWords = store.searchSameWords([
          sentenceId,
          wordId,
          startWordId + 1,
        ]);
      }

      this.setState({
        sameWords,
      });
    } else if (isCheckingSameWord) {
      const mention = store.getMentionByWord(hoverWord);
      if (mention) {
        this.setState({
          sameWords: store.searchSameWords(mention),
        });
      }
    }
  };

  handleEnterMention = (instance, isEntering) => {
    const { store } = this.props;
    const wrapperKey = instance && instance.props.wrapperKey;
    const entityIndex = store.getEntityIndexByMention(wrapperKey);

    if (isEntering) {
      this.enteredEntities.push(entityIndex);
      this.setState({
        currentEntity: entityIndex,
      });
    } else {
      this.enteredEntities.pop();
      const currentEntity = _.last(this.enteredEntities);
      this.setState({
        currentEntity,
      });
    }
  };

  handleSelect = instance => {
    const { store } = this.props;
    const { mergingEntities, leavingGroup, isMerging, isLeaving } = this.state;
    const wrapperKey = instance && instance.props.wrapperKey;
    const entityIndex = store.getEntityIndexByMention(wrapperKey);
    if (isMerging) {
      if (mergingEntities.indexOf(entityIndex) !== -1) return;
      this.setState({
        mergingEntities: update(mergingEntities, { $push: [entityIndex] }),
      });
    } else if (isLeaving) {
      if (leavingGroup === wrapperKey) return;
      this.setState({
        leavingGroup: wrapperKey,
        currentEntity: entityIndex,
      });
    }
  };

  handleUnselect = instance => {
    const { store } = this.props;
    const { mergingEntities, isMerging } = this.state;
    const wrapperKey = instance && instance.props.wrapperKey;
    const entityIndex = store.getEntityIndexByMention(wrapperKey);
    if (isMerging) {
      const index = mergingEntities.indexOf(entityIndex);
      if (index === -1) return;
      this.setState({
        mergingEntities: update(mergingEntities, { $splice: [[index, 1]] }),
      });
    }
  };

  handleRightClick = e => {
    const { isPicking } = this.state;
    if (isPicking) {
      e.preventDefault();
      this.setState({
        isPicking: false,
        availableRange: [],
        startWord: null,
        sameWords: [],
      });
    }
  };

  setRefs = (component, index, group) => {
    group[index] = component;
    return index;
  };

  render() {
    const { isControllable, store } = this.props;
    const setRefs = this.setRefs;
    const {
      isLeaving,
      isMerging,
      leavingGroup,
      mergingEntities,
      currentEntity,
    } = this.state;
    return (
      <Row className="pronoun-relevance-board">
        {isControllable && (
          <Col span={4}>
            <div className="pronoun-relevance-control-bar">
              <Button
                className={classnames({ hidden: isMerging })}
                disabled={!this.isMergeOperationAvailable()}
                onClick={this.handleMergeGroup}
              >
                Entity+Entity
              </Button>
              <Button
                className={classnames({ hidden: !isMerging })}
                onClick={this.handleCancelMerge}
              >
                退出
              </Button>
              <Button
                className={classnames({ hidden: !isMerging })}
                disabled={mergingEntities.length < 2}
                onClick={() => this.handleConfirmMerge()}
              >
                确定
              </Button>
              <Button
                className={classnames({ hidden: !isMerging })}
                disabled={mergingEntities.length < 2}
                onClick={() => this.handleConfirmMerge(true)}
              >
                确认并继续
              </Button>
            </div>
            <div className="pronoun-relevance-control-bar">
              <Button
                className={classnames({ hidden: isLeaving })}
                disabled={!this.isLeaveOperationAvailable()}
                onClick={this.handleLeaveGroup}
              >
                Mention独立
              </Button>
              <Button
                className={classnames({ hidden: !isLeaving })}
                onClick={this.handleCancelLeave}
              >
                退出
              </Button>
              <Button
                className={classnames({ hidden: !isLeaving })}
                disabled={
                  _.isNull(leavingGroup) ||
                  this.props.store.entities[currentEntity].length < 2
                }
                onClick={this.handleConfirmLeave}
              >
                确认并继续
              </Button>
            </div>
            <Alert
              className={classnames({ hidden: !isMerging })}
              description="操作提示：请选择要合并的Entity。左键选择，右键取消。确认后合并。"
              type="info"
              showIcon
            />
            <Alert
              className={classnames({ hidden: !isLeaving })}
              description="操作提示：请选择Mention，确认后将从原Entity中独立。"
              type="info"
              showIcon
            />
          </Col>
        )}
        <Col style={{ height: '100%' }} span={isControllable ? 20 : 24}>
          <div
            className={'pronoun-relevance-sentences'}
            onContextMenu={!isControllable ? _.noop : this.handleRightClick}
          >
            {store &&
              store.wordGroups.map((item, index) => (
                <GroupWrapper
                  readOnly={!isControllable}
                  key={index}
                  index={index}
                  wrapperKey={`${index}`}
                  wordGroup={item}
                  indexGroup={store.indexGroups[index]}
                  sentenceId={index}
                  ref={GroupWrapper => {
                    setRefs(GroupWrapper, index, this.heightGroup);
                  }}
                />
              ))}
          </div>
        </Col>
      </Row>
    );
  }
}

export default PronounRelevanceBoard;
