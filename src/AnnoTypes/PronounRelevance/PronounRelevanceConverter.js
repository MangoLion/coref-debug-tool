import * as AnnoModes from '../Common/AnnoModes';
import map from 'lodash/map';
import * as _ from 'lodash';

const inConverter = ({
  taskFile,
  annoRecord,
  result: rawResult,
  mode,
  taskState,
}) => {
  let annoResult = rawResult;
  if (!_.isArray(rawResult)) {
    annoResult = [];
  }

  const { status } = annoRecord;
  return { annoResult, taskFile, mode, status, taskState };
};

const outConverter = ({ annoResult }) => annoResult;

export const PronounRelevanceConverter = {
  in: inConverter,
  out: outConverter,
};
