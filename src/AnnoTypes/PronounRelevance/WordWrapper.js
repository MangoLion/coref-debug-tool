import React, { Component } from 'react';
import PropType from 'prop-types';
import { isNumber } from 'lodash';
import classnames from 'classnames';
import PronounRelevanceStore from './PronounRelevanceStore';

class WordWrapper extends Component {
  static propTypes = {
    sentenceId: PropType.number,
    wordId: PropType.number,
    index: PropType.number,
    word: PropType.string.isRequired,
    wrapperKey: PropType.string,
    readOnly: PropType.bool,
  };

  static contextTypes = {
    _store: PropType.instanceOf(PronounRelevanceStore),
    availableRange: PropType.array,
    hoverWord: PropType.array,
    onPick: PropType.func,
    onEnterWord: PropType.func,
    isPicking: PropType.bool,
    isMerging: PropType.bool,
    isLeaving: PropType.bool,
    sameWords: PropType.array,
  };

  handleClick = e => {
    const { readOnly } = this.props;
    const { onPick, isMerging, isLeaving } = this.context;
    if (isMerging || isLeaving) {
      return;
    }

    e.stopPropagation();

    if (readOnly) return;

    onPick(this);
  };

  handleMouseEnter = e => {
    const { readOnly } = this.props;
    if (readOnly) return;

    e.stopPropagation();
    const { onEnterWord } = this.context;
    onEnterWord(this);
  };

  shouldHighlight = () => {
    const { readOnly } = this.props;
    if (readOnly) return false;

    const {
      availableRange: [
        availableSentenceId,
        startWordId,
        stopWordId,
        pickWordId,
      ],
      hoverWord,
      isPicking,
    } = this.context;
    const { sentenceId, wordId } = this.props;

    if (availableSentenceId == sentenceId && pickWordId === wordId) return true;
    if (!hoverWord || !isPicking) return false;
    const [hoverSentenceId, hoverWordId] = hoverWord;
    if (sentenceId != availableSentenceId || sentenceId != hoverSentenceId)
      return false;

    if (startWordId > wordId || wordId >= stopWordId) return false;
    if (hoverWordId < pickWordId) {
      return hoverWordId <= wordId && wordId <= pickWordId;
    }
    return pickWordId <= wordId && wordId <= hoverWordId;
  };

  shouldBold = () => {
    const { word } = this.props;
    return (
      word &&
      word.length >= 2 &&
      word[0] === '*' &&
      word[word.length - 1] === '*'
    );
  };

  isSameWords = () => {
    const { sameWords } = this.context;
    const { sentenceId, wordId } = this.props;
    for (const word of sameWords) {
      if (sentenceId == word[0] && word[1] <= wordId && wordId < word[2])
        return true;
    }

    return false;
  };

  render() {
    const highlight = this.shouldHighlight();
    const bold = this.shouldBold();
    const isSameWord = this.isSameWords();
    let word = null;
    if (bold) {
      word = this.props.word.substring(1, this.props.word.length - 1);
    } else {
      word = this.props.word;
    }

    return (
      <div
        className={classnames('word-wrapper', {
          highlight,
          bold,
          sameword: isSameWord,
        })}
        onClick={this.handleClick}
        onMouseEnter={this.handleMouseEnter}
      >
        {word}
      </div>
    );
  }
}

export default WordWrapper;
