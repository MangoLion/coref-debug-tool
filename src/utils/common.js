import { isNumber } from 'lodash';

export function buildQueryParams(params) {
  if (!params) return '';
  return Object.keys(params)
    .reduce((paramStrArray, k) => {
      if (params[k] !== undefined && params[k] !== null) {
        paramStrArray.push(
          `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`,
        );
      }
      return paramStrArray;
    }, [])
    .join('&');
}

export function pick(obj, ...fields) {
  const res = {};
  for (const key of fields) {
    res[key] = obj[key];
  }

  return res;
}

export function hexToRgb(hex, alpha) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const colors = [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
    if (isNumber(alpha)) {
      colors.push(alpha);
    }
    return `rgba(${colors.join(',')})`;
  }

  return null;
}

export function getSelectionText() {
  let text = '';
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != 'Control') {
    text = document.selection.createRange().text;
  }
  return text;
}

function setNativeValue(input, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(input),
    'value',
  ).set;
  nativeInputValueSetter.call(input, value);

  const ev2 = new Event('input', { bubbles: true });
  input.dispatchEvent(ev2);
}

export function insertAtCursor(myField, myValue) {
  let value;
  if (myField.selectionStart || myField.selectionStart == '0') {
    const startPos = myField.selectionStart;
    const endPos = myField.selectionEnd;
    value =
      myField.value.substring(0, startPos) +
      myValue +
      myField.value.substring(endPos, myField.value.length);
  } else {
    value = myField.value + myValue;
  }
  setNativeValue(myField, value);
}

export const stringToFileDownload = (string, filename) => {
  // 中文EXCEL乱码是因为少了一个BOM头，即\ufeff
  const blob = new Blob([`\ufeff${string}`], {
    type: 'data:text/csv;charset=utf-8',
  });
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    let e = document.createEvent('MouseEvents'),
      a = document.createElement('a');
    a.download = filename;
    a.href = window.URL.createObjectURL(blob);
    a.dataset.downloadurl = [
      'data:text/csv;charset=utf-8',
      a.download,
      a.href,
    ].join(':');
    e.initEvent(
      'click',
      true,
      false,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null,
    );
    a.dispatchEvent(e);
    // window.URL.revokeObjectURL(url); // clean the url.createObjectURL resource
  }
};
