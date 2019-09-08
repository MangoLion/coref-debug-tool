import React, { Component } from 'react';
import { Row, Col } from 'antd';
import './PronounRelevanceComponent.scss';
import PronounRelevanceStore from './PronounRelevanceStore';
import PronounRelevanceBoard from './PronounRelevanceBoard';
import PronounRelevanceCompareBoard from './PronounRelevanceCompareBoard';

import AppConst from '../../constants';

const { MODE } = AppConst;
class PronounRelevanceComponent extends Component {
  constructor(props) {
    super(props);

    this._store = null;
    console.log(props);
    this.init(props);
  }

  componentWillReceiveProps(nextProps) {
    this.init(nextProps);
  }

  _forceUpdate = payload => {
  };

  init = props => {
    const filelist = [];

    // get file names
    Object.keys(props).map(key => {
        if (key !== 'globalControl') {
          filelist.push(key)
        }
      }
    );

    const filename = filelist.reverse().pop();
    const { annoResultState: { taskFile, anno_result } } = props[filename];
    const { globalControl } = props;


    this._annoStore = new PronounRelevanceStore(taskFile.sentence, anno_result);
    this._store = this._annoStore;

    if (globalControl.showGroundTruth) {
      const { annoResultState: { taskFile: {gt_result} } } = props[filename];
      this._gtStore = new PronounRelevanceStore(taskFile.sentence, gt_result);
    }
  };

  render() {
    const filelist = [];
    const filemap = {};

    // get file names
    Object.keys(this.props).map(key => {
        if (key !== 'globalControl') {
          filelist.push(key);
          filemap[key] = this.props[key];
        }
      }
    );

    const filename = filelist[0];
    const { globalControl } = this.props;
    const { mode, annoRecord, annoResultState, mention_scores, antecedent_scores } = this.props[filename];
    // const { globalControl, mode, annoRecord, annoResultState,
    //   mention_scores, antecedent_scores } = this.props;
    const isAnnoMode = mode === MODE.ANNO;
    if (globalControl.showGroundTruth) {
      return (
        <PronounRelevanceCompareBoard
          defaultFile={filename}
          fileList={filelist}
          fileMap={filemap}
          userAnswer={this._annoStore}
          gtAnswer={this._gtStore}
          annoRecord={annoRecord}
          annoResultState={annoResultState}
          mentionScores={mention_scores}
          antecedentScores={antecedent_scores}
        />
      );
    }
    return (
      <Row className="pronoun-relevance">
        <Col style={{ height: '100%' }} span={isAnnoMode ? 24 : 0}>
          <PronounRelevanceBoard
            store={this._store}
            isControllable
          />
        </Col>
        <Col style={{ height: '100%' }} span={isAnnoMode ? 0 : 24}>
          {!isAnnoMode && (
            <div style={{ height: '100%' }}>
              {'标注员答案: '}
              {
                <PronounRelevanceBoard
                  store={this._annoStore}
                  isControllable={false}
                />
              }
            </div>
          )}
          {globalControl.hasReviewResult &&
            globalControl.updateTarget != 'review' && (
              <div style={{ height: '100%' }}>
                {'管理员答案: '}
                {
                  <PronounRelevanceBoard
                    store={this._reviewStore}
                    isControllable={false}
                  />
                }
              </div>
            )}
          {globalControl.showGroundTruth && (
            <div style={{ height: '100%' }}>
              {'ground truth: '}
              {
                <PronounRelevanceBoard
                  store={this._gtStore}
                  isControllable={false}
                />
              }
            </div>
          )}
        </Col>
      </Row>
    );
  }
}

export default PronounRelevanceComponent;
