import React, { Component } from 'react';
import { Popconfirm } from 'antd';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import AppConst from '../../constants';
import { isString, some, isUndefined } from 'lodash';
import WordWrapper from './WordWrapper';
import PronounRelevanceStore from './PronounRelevanceStore';
import { hexToRgb } from '../../utils/common';
import _ from 'lodash'

class GroupWrapper extends Component {
  static propTypes = {
    sentenceId: PropTypes.number,
    index: PropTypes.number,
    wordGroup: PropTypes.array,
    indexGroup: PropTypes.array,
    wrapperKey: PropTypes.string,
    readOnly: PropTypes.bool,
  };

  static contextTypes = {
    _store: PropTypes.instanceOf(PronounRelevanceStore),
    currentEntity: PropTypes.number,
    mergingEntities: PropTypes.array, // merging mode
    leavingGroup: PropTypes.string, // leaving mode
    relatedEntities: PropTypes.array, // review mode
    onSelect: PropTypes.func,
    onUnselect: PropTypes.func,
    onEnterMention: PropTypes.func,
    onDelete: PropTypes.func,
    isLeaving: PropTypes.bool, // indicate is leaving mode or not
    isMerging: PropTypes.bool, // indicate is merging mode or not
    isReviewing: PropTypes.bool, // indicate is review mode or not
    isPicking: PropTypes.bool, // indicate is creating mention mode or not
    analyzerSelectedMention: PropTypes.array, // model analyzer mention selection
    analyzerSelectedAntecedent: PropTypes.array, // model analyzer antecedent selection
  };

  static defaultProps = {
    index: 0,
    readOnly: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      popupDelete: false,
    };
  }

  handleClick = e => {
    e.stopPropagation();
    const { onSelect, isMerging, isLeaving } = this.context;
    const { wrapperKey, index, readOnly } = this.props;
    if (readOnly) return;

    const isTopLevel = wrapperKey == index;
    if (isTopLevel) {
      return;
    }

    if (isMerging || isLeaving) {
      onSelect(this);
    }
  };

  handleRightClick = e => {
    const { wrapperKey, index, readOnly } = this.props;
    const { isLeaving, isMerging, isPicking, onUnselect } = this.context;
    if (isPicking) return;

    e.preventDefault();
    e.stopPropagation();
    const isTopLevel = wrapperKey == index;
    if (isTopLevel || readOnly) return;

    if (isMerging || isLeaving) {
      onUnselect(this);
      return;
    }

    this.setState({
      popupDelete: true,
    });
  };

  handleDelete = () => {
    const { onDelete } = this.context;
    onDelete(this);
    this.setState({
      popupDelete: false,
    });
  };

  handleCancelDelete = () => {
    this.setState({
      popupDelete: false,
    });
  };

  handleVisibleChange = value => {
    if (!value) {
      this.setState({
        popupDelete: false,
      });
    }
  };

  handleMouseEnter = () => {
    const { wrapperKey, index } = this.props;
    const isTopLevel = wrapperKey == index;
    if (isTopLevel) return;
    const { onEnterMention, isLeaving, isMerging, isPicking } = this.context;
    if (isLeaving || isMerging || isPicking) return;
    onEnterMention(this, true);
  };

  handleMouseLeave = () => {
    const { wrapperKey, index } = this.props;
    const isTopLevel = wrapperKey == index;
    if (isTopLevel) return;
    const { onEnterMention, isLeaving, isMerging, isPicking } = this.context;
    if (isLeaving || isMerging || isPicking) return;
    onEnterMention(this, false);
  };

  checkIsSuggesting = () => {
    const {
      sentenceId,
      indexGroup,
      wrapperKey } = this.props;
    const { _store,
      analyzerSelectedMention,
      analyzerSelectedAntecedent } = this.context;
    const indexes = _.flattenDeep(indexGroup);
    const mention = _store._getMention(wrapperKey);
    if (this.mentionsEqual(mention, analyzerSelectedMention) ||
      this.mentionsEqual(mention, analyzerSelectedAntecedent)) {
      return true;
    }
    return _store.isMentionSuggesting(sentenceId, indexes[0], _.last(indexes));
  };

  mentionsEqual = (m1, m2) => {
    if (m1 == null || m2 == null) {
      return false;
    }
    return (m1[0] == m2[0] && m1[1] == m2[1] && m1[2] == m2[2]);
  }

  checkIsSelected = () => {
    const { wrapperKey } = this.props;
    const {
      _store,
      currentEntity,
      isMerging,
      mergingEntities,
      isReviewing,
      relatedEntities,
      analyzerSelectedMention,
      analyzerSelectedAntecedent,
    } = this.context;

    const mention = _store._getMention(wrapperKey);
    return (
      (isMerging &&
        some(mergingEntities, entity =>
          _store.isMentionSelected(entity, wrapperKey),
        )) ||
      (isReviewing &&
        some(relatedEntities, entity =>
          _store.isMentionSelected(entity, wrapperKey),
        )) ||
      (!isUndefined(currentEntity) &&
        _store.isMentionSelected(currentEntity, wrapperKey))
    );
  };

  checkIsLeaving = () => {
    const { wrapperKey } = this.props;
    const { leavingGroup } = this.context;
    return leavingGroup === wrapperKey;
  };

  render() {
    const {
      wordGroup,
      indexGroup,
      sentenceId,
      wrapperKey,
      readOnly,
    } = this.props;
    const { popupDelete } = this.state;
    const { _store } = this.context;
    const isLeaving = this.checkIsLeaving();
    const isSelected = this.checkIsSelected();
    const isSuggesting = this.checkIsSuggesting();
    const entityIndex = _store.getEntityIndexByMention(wrapperKey);
    const style = {};

    if (
      _store.entities[entityIndex] &&
      _store.entities[entityIndex].length > 1
    ) {
      style.borderColor = AppConst.PALLET[entityIndex % AppConst.PALLET.length];
    }

    if (isSelected) {
      style.backgroundColor = style.borderColor
        ? hexToRgb(style.borderColor, 0.3)
        : 'rgba(217, 217, 217, .4)';
    }
    return (
      <Popconfirm
        title="删除Mention？"
        visible={popupDelete}
        onVisibleChange={this.handleVisibleChange}
        trigger="click"
        onCancel={this.handleCancelDelete}
        onConfirm={this.handleDelete}
      >
        <div
          style={style}
          className={classnames('group-wrapper', {
            deleting: popupDelete || isLeaving,
            suggesting: isSuggesting,
          })}
          onClick={this.handleClick}
          onMouseLeave={this.handleMouseLeave}
          onMouseEnter={this.handleMouseEnter}
          onContextMenu={this.handleRightClick}
        >
          {wordGroup.map((item, index) => {
            const key = `${wrapperKey}_${index}`;
            if (isString(item)) {
              return (
                <WordWrapper
                  key={key}
                  wrapperKey={key}
                  index={index}
                  sentenceId={sentenceId}
                  wordId={indexGroup[index]}
                  word={item}
                  readOnly={readOnly}
                />
              );
            }
            return (
              <GroupWrapper
                key={key}
                wrapperKey={key}
                sentenceId={sentenceId}
                wordGroup={item}
                indexGroup={indexGroup[index]}
                index={index}
                readOnly={readOnly}
              />
            );
          })}
          {((wordGroup.length === 1 && isString(wordGroup[0])) ||
            wordGroup.length > 1) && (
            <span className="subscript">{entityIndex}</span>
          )}
        </div>
      </Popconfirm>
    );
  }
}

export default GroupWrapper;
