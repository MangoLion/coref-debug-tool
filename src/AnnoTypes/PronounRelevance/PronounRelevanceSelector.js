const resultValidated = resultState => {
  const { annoResult = [] } = resultState;
  return annoResult.length !== 0;
};

export const PronounRelevanceSubmitControlSelector = currentResultState => {
  const disabled = !resultValidated(currentResultState);
  return { disabled };
};
