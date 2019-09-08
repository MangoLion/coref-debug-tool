import _ from 'lodash';

class PronounRelevanceStore {
  constructor(sentences, entities) {
    this.sentences = sentences;
    this.entities = entities;
    this.wordGroups = [];
    this.indexGroups = [];
    this.mentionGroupBySentence = [];
    this.entityMap = {};
    this.suggestions = [];
    this.init();
  }

  init = () => {
    this._groupMentionBySentence();
    this._buildEntityMap();
    for (let i = 0; i < this.sentences.length; i++) {
      this._initSentence(i);
    }
  };

  updateSuggestions = suggestions => {
    this.suggestions = suggestions;
  };

  createMention = ({ sentenceId, startWord, stopWord, mention }) => {
    if (!mention) {
      if (startWord === stopWord) {
        const group = this._getGroup(startWord);
        mention = [sentenceId, group, group + 1];
      } else {
        const wrapperKey = this._getParentGroup(startWord, stopWord);
        const group = this._getGroup(wrapperKey);

        const [start, end] = this._getStartEndIndex(
          parseInt(startWord.substring(wrapperKey.length + 1), 10),
          parseInt(stopWord.substring(wrapperKey.length + 1), 10),
          group,
        );
        mention = [sentenceId, start, end];
      }
    }

    if (_.isNull(mention[1]) || _.isNull(mention[2])) {
      console.error('fail to create mention, invalid start / end');
      return;
    }

    const mentions = this.mentionGroupBySentence[sentenceId];
    const mentionIndex = this._findMentionIndex(mentions, mention);
    if (mentionIndex !== -1) return;
    mentions.push(mention);
    this._initSentence(sentenceId);
    this.entityMap[mention.join('_')] = this.entities.length;
    this.entities.push([mention]);
  };

  deleteMention = ({ sentenceId, wrapperKey }) => {
    const target = this._getGroup(wrapperKey);
    const [start, end] = this._getStartEndIndex(0, target.length - 1, target);
    const mentions = this.mentionGroupBySentence[sentenceId];
    const mentionIndex = this._findMentionIndex(mentions, [
      sentenceId,
      start,
      end,
    ]);
    if (mentionIndex === -1) return;
    this.removeMentionFromEntity(wrapperKey);
    mentions.splice(mentionIndex, 1);
    this._initSentence(sentenceId);
  };

  mergeEntity = entities => {
    const toEntity = _.first(entities);
    let index, fromEntity;
    for (index = 1; index < entities.length; index++) {
      fromEntity = entities[index];
      this.entities[toEntity] = this.entities[toEntity].concat(
        this.entities[fromEntity],
      );
    }

    const sortedEntities = entities.slice(1).sort((a, b) => b - a);

    for (index = 0; index < sortedEntities.length; index++) {
      fromEntity = sortedEntities[index];
      this.entities.splice(fromEntity, 1);
    }

    this._buildEntityMap();
  };

  removeMentionFromEntity = wrapperKey => {
    const mention = this._getMention(wrapperKey);
    const sentenceId = parseInt(wrapperKey, 10);
    const entityIndex = this.entityMap[mention.join('_')];
    if (!this.entityMap.hasOwnProperty(mention.join('_'))) return;

    const mentionIndex = this._findMentionIndex(
      this.entities[entityIndex],
      mention,
    );
    this.entities[entityIndex].splice(mentionIndex, 1);
    this._groupMentionBySentence();
    this._initSentence(sentenceId);

    if (this.entities[entityIndex].length === 0) {
      this.entities.splice(entityIndex, 1);
      this._buildEntityMap();
    }

    return mention;
  };

  isMentionSelected = (entityIndex, wrapperKey) => {
    const mention = this._getMention(wrapperKey);
    return entityIndex === this.entityMap[mention.join('_')];
  };

  isMentionSuggesting = (sid, start, end) =>
    _.some(
      this.suggestions,
      suggestion =>
        suggestion[0] === sid &&
        suggestion[1] === start &&
        suggestion[2] === end,
    );

  getEntityIndexByMention = wrapperKey => {
    const mention = this._getMention(wrapperKey);
    return this.entityMap[mention.join('_')];
  };

  getAvailableRange = wrapperKey => {
    const paths = wrapperKey.split('_');
    const sentenceId = paths.shift();

    const end = this._getAvailableEnd([].concat(paths), sentenceId);
    const start = this._getAvailableStart([].concat(paths), sentenceId);
    const pick = this._getGroup(wrapperKey);

    return [sentenceId, start, end, pick];
  };

  getWordIndex = wrapperKey => this._getGroup(wrapperKey);

  generateFalsy = target => {
    const result = [];
    if (_.isArray(this.entities)) {
      const entities = this.entities.map(entity =>
        entity.filter(mention => _.every(mention, num => _.isNumber(num))),
      );
      const currentEntitiesStr = _.map(entities, entity =>
        _.map(entity, mention => mention.join('_')),
      );

      const targetEntitiesStr = _.map(target, entity =>
        _.map(entity, mention => mention.join('_')),
      );
      _.map(currentEntitiesStr, (entity, index) => {
        let isIncluded = false;
        for (const candidate of targetEntitiesStr) {
          if (_.every(entity, mention => _.includes(candidate, mention))) {
            isIncluded = true;
            break;
          }
        }
        if (!isIncluded) {
          result.push(index);
        }
      });
    }

    return result;
  };

  generateMatch = target => {
    const currentEntitiesStr = _.map(this.entities, entity =>
      _.map(entity, mention => mention.join('_')),
    );

    const targetEntitiesStr = _.map(target, entity =>
      _.map(entity, mention => mention.join('_')),
    );

    const result = [[], []];

    _.map(currentEntitiesStr, (entity, cIndex) => {
      for (const tIndex in targetEntitiesStr) {
        const candidate = targetEntitiesStr[tIndex];
        if (
          entity.length === candidate.length &&
          _.every(entity, mention => _.includes(candidate, mention))
        ) {
          result[0].push(cIndex);
          result[1].push(parseInt(tIndex, 10));
          break;
        }
      }
    });

    return result;
  };

  getIntersectionEntities = mentions => {
    const result = [];
    for (const mention of mentions) {
      const entityIndex = this.entityMap[mention.join('_')];
      if (!_.isUndefined(entityIndex)) {
        result.push(entityIndex);
      }
    }

    return _.uniq(result);
  };

  getMentionByWord = ([sentenceId, wordIndex]) => {
    const mentions = this.mentionGroupBySentence[sentenceId];
    let result = null;
    for (const mention of mentions) {
      if (mention[1] > wordIndex || mention[2] <= wordIndex) continue;

      if (!result || (mention[1] >= result[1] && result[2] >= mention[2])) {
        result = mention;
      }
    }

    return result;
  };

  searchSameWords = ([sentenceId, start, end]) => {
    const target = this.sentences[sentenceId].slice(start, end);
    const wordLen = end - start;
    const result = [];
    _.map(this.sentences, (words, sid) => {
      _.map(words, (word, wid) => {
        if (
          word.toLowerCase() === target[0].toLowerCase() &&
          wid + wordLen <= words.length
        ) {
          let isSame = true;
          for (let i = 1; i < wordLen; i++) {
            isSame = words[wid + i].toLowerCase() === target[i].toLowerCase();
            if (!isSame) break;
          }
          if (isSame && !(sid === sentenceId && start === wid)) {
            result.push([sid, wid, wid + wordLen]);
          }
        }
      });
    });

    return result;
  };

  _getAvailableEnd = (paths, sentenceId) => {
    let group = this.indexGroups[sentenceId];

    while (paths[paths.length - 1] == 0) {
      paths.pop();
    }

    paths.pop();

    for (const path of paths) {
      group = group[path];
    }

    while (_.isArray(group[group.length - 1])) {
      group = group[group.length - 1];
    }

    return group[group.length - 1] + 1;
  };

  _getAvailableStart = (paths, sentenceId) => {
    let group = this.indexGroups[sentenceId];

    const lengthStack = [0];

    for (const path of paths) {
      group = group[path];
      if (_.isArray(group)) {
        lengthStack.push(group.length);
      }
    }

    group = this.indexGroups[sentenceId];

    // bottom up
    while (paths[paths.length - 1] == lengthStack[paths.length - 1] - 1) {
      paths.pop();
    }

    paths.pop();

    for (const path of paths) {
      group = group[path];
    }

    while (_.isArray(group[0])) {
      group = group[0];
    }

    return group[0];
  };

  _getParentGroup = (a, b) => {
    if (a.length < b.length) return this._getParentGroup(b, a);
    const pathA = a.split('_');
    const pathB = b.split('_');
    const result = [];
    let index = 0;
    for (; index < pathB.length; index++) {
      if (pathB[index] === pathA[index]) {
        result.push(pathB[index]);
      } else {
        break;
      }
    }

    return result.join('_');
  };

  _groupMentionBySentence = () => {
    this.mentionGroupBySentence = [];
    for (const index in this.sentences) {
      this.mentionGroupBySentence[index] = [];
    }

    _.flatten(this.entities).forEach(mention => {
      const sentenceId = mention[0];
      const mentionGroup = this.mentionGroupBySentence[sentenceId];
      if (_.isArray(mentionGroup)) {
        mentionGroup.push(mention);
      }
    });
  };

  _buildEntityMap = () => {
    this.entityMap = {};
    for (let i = 0; i < this.entities.length; i++) {
      const mentions = this.entities[i];
      for (const mention of mentions) {
        this.entityMap[mention.join('_')] = i;
      }
    }
  };

  _initSentence = sentenceIndex => {
    const sentence = this.sentences[sentenceIndex];
    const mentions = this.mentionGroupBySentence[sentenceIndex];

    let wordGroup = [];
    let indexGroup = [];

    for (let index = 0; index < sentence.length; index++) {
      indexGroup.push(index);
    }

    for (const mention of mentions) {
      indexGroup[mention[1]] = `[${indexGroup[mention[1]]}`;
      indexGroup[mention[2] - 1] = `${indexGroup[mention[2] - 1]}]`;
    }

    indexGroup = JSON.parse(`[${indexGroup.join(',')}]`);
    wordGroup = _.cloneDeep(indexGroup);
    this._replaceIndexWithWord(wordGroup, sentence);
    this.wordGroups[sentenceIndex] = wordGroup;
    this.indexGroups[sentenceIndex] = indexGroup;

  };

  _replaceIndexWithWord = (arr, words) => {
    arr.map((item, index) => {
      if (_.isArray(item)) {
        this._replaceIndexWithWord(item, words);
      } else {
        arr[index] = words[item];
      }
    });
  };

  _getMention = wrapperKey => {
    const path = wrapperKey.split('_');
    const sentenceId = parseInt(path[0], 10);
    const group = this._getGroup(wrapperKey);
    const [start, end] = this._getStartEndIndex(0, group.length - 1, group);
    return [sentenceId, start, end];
  };

  _getGroup = wrapperKey => {
    const path = wrapperKey.split('_');
    let arr = this.indexGroups[path.shift()];

    while (path.length > 0) {
      arr = arr[parseInt(path.shift(), 10)];
    }

    return arr;
  };

  _getStartEndIndex = (start, end, group) => {
    start = group[start];
    end = group[end];

    while (_.isArray(start)) {
      start = start[0];
    }

    while (_.isArray(end)) {
      end = end[end.length - 1];
    }

    return [start, end + 1];
  };

  _findMentionIndex = (mentions, mention) => {
    const [sentenceId, start, end] = mention;
    return mentions.findIndex(
      mention =>
        mention[0] === sentenceId && mention[1] === start && mention[2] === end,
    );
  };
}

export default PronounRelevanceStore;
