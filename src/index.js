const jsdom = require('jsdom');

const { JSDOM } = jsdom;

// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements
const blockElements = new Set(['address', 'article', 'aside', 'canvas', 'blockquote', 'dd', 'div',
  'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li',
  'main', 'nav', 'noscript', 'ol', 'output', 'p', 'pre', 'section',
  'table', 'tfoot', 'ul', 'video']);

// https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements
const inlineElements = new Set(['a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'button', 'cite',
  'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map',
  'object', 'q', 'samp', 'script', 'select', 'small', 'span', 'strong',
  'sub', 'sup', 'textarea', 'time', 'tt', 'var']);

const isAllChildrenInline = (node) => {
  let inlineOnly = true;
  for (const child of node.querySelectorAll('*')) {
    if (!inlineElements.has(child.nodeName.toLowerCase())) {
      inlineOnly = false;
      // console.log(child.nodeName);
      break;
    }
  }
  return inlineOnly;
};

const isNodeEmpty = (node) => {
  if (!node.textContent) {
    return true;
  }

  if (node.textContent.trim() === '') {
    return true;
  }

  return false;
};

const parentNodes = (node) => {
  let parentElements = [];

  if (node.parentElement) {
    parentElements = parentElements.concat(parentNodes(node.parentElement));
  }

  parentElements.push(node);

  return parentElements;
};

const isOnlySibling = node => node.nextSibling === null && node.previousSibling === null;

const positionalKeyNameStrategy = (node) => {
  const parents = parentNodes(node).slice(2);
  const keyName = parents.map((n) => {
    const children = Array.from(n.parentNode.childNodes);
    let index = -1;

    for (let i = 0; i < children.length; i += 1) {
      if (children[i] === n) {
        index = i;
        break;
      }
    }

    return `${n.nodeName}${index}`;
  }).join('_');

  return keyName.toLowerCase();
};

const randomKeyNameStrategy = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 10; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const render = async (html, keys) => {
  const dom = new JSDOM(`<body>${html}</body>`);
  const { window: { document } } = dom;

  for (const node of document.querySelectorAll('[data-i18n]')) {
    const keyName = node.getAttribute('data-i18n');

    switch (node.nodeName) {
      case 'IFRAME':
        const iframeSrcAttr = keys[`${keyName}_src`];
        if (iframeSrcAttr) {
          node.setAttribute('src', iframeSrcAttr);
        }
        break;

      case 'IMG':
        const srcAttr = keys[`${keyName}_src`];
        if (srcAttr) {
          node.setAttribute('src', srcAttr);
        }
        break;

      case 'A':
        const hrefAttr = keys[`${keyName}_href`];
        if (hrefAttr) {
          node.setAttribute('href', hrefAttr);
        }
        // Fall through

      default:
        const text = keys[`${keyName}_html`];
        node.innerHTML = text || '';
        break;
    }
  }

  return document.body.innerHTML;
};

const parseAnchors = (nodes, keys, keyNameStrategyFn, strategyOptions) => {
  for (const node of nodes) {
    if (!isOnlySibling(node)) {
      // part of a bigger context
      continue;
    }

    let keyName = node.getAttribute('data-i18n');
    if (keyName === null) {
      keyName = keyNameStrategyFn(node, strategyOptions);
      node.setAttribute('data-i18n', keyName);
    }

    keys[`${keyName}_html`] = node.innerHTML;

    const href = node.getAttribute('href');
    if (href.match(/https?:\/\//i)) {
      keys[`${keyName}_href`] = href;
    }
  }
};

const parseImg = (nodes, keys, keyNameStrategyFn, strategyOptions) => {
  for (const node of nodes) {
    if (!isOnlySibling(node)) {
      // part of a bigger context
      continue;
    }

    let keyName = node.getAttribute('data-i18n');
    if (keyName === null) {
      keyName = keyNameStrategyFn(node, strategyOptions);
      node.setAttribute('data-i18n', keyName);
    }

    keys[`${keyName}_src`] = node.getAttribute('src');
  }
};

const parseIframe = (nodes, keys, keyNameStrategyFn, strategyOptions) => {
  for (const node of nodes) {
    let keyName = node.getAttribute('data-i18n');
    if (keyName === null) {
      keyName = keyNameStrategyFn(node, strategyOptions);
      node.setAttribute('data-i18n', keyName);
    }

    keys[`${keyName}_src`] = node.getAttribute('src');
  }
};

const parseBlocks = (nodes, keys, keyNameStrategyFn, strategyOptions) => {
  for (const node of nodes) {
    if (isNodeEmpty(node)) {
      // Ignore empty nodes
      continue;
    }

    if (isAllChildrenInline(node)) {
      if (node.firstChild && (node.firstChild.nodeName === 'IFRAME'
          || node.firstChild.nodeName === 'A'
          || node.firstChild.nodeName === 'IMG'
      ) && isOnlySibling(node.firstChild)) {
        // single sibling is processed parseAnchor and parseImg
        continue;
      }

      let keyName = node.getAttribute('data-i18n');
      if (keyName === null) {
        keyName = keyNameStrategyFn(node, strategyOptions);
        node.setAttribute('data-i18n', keyName);
      }

      keys[`${keyName}_html`] = node.innerHTML;
    } else {
      // console.log('HAS BLOCKS');
      // let keyName = node.getAttribute('data-i18n');
      // if (keyName === null) {
      //   keyName = keyNameStrategyFn(node, strategyOptions);
      //   node.setAttribute('data-i18n', keyName);
      // }
    }
  }
};

const parse = async (html, keyNameStrategyFn = randomKeyNameStrategy, strategyOptions = {}) => {
  const dom = new JSDOM(`<body>${html}</body>`);
  const { window: { document } } = dom;

  const keys = {};
  parseAnchors(document.querySelectorAll('a[href]'), keys, keyNameStrategyFn, strategyOptions);
  parseImg(document.querySelectorAll('img[src]'), keys, keyNameStrategyFn, strategyOptions);
  parseIframe(document.querySelectorAll('iframe[src]'), keys, keyNameStrategyFn, strategyOptions);

  parseBlocks(document.querySelectorAll([...blockElements].join(',')), keys, keyNameStrategyFn, strategyOptions);

  return {
    keys,
    template: document.body.innerHTML.trim(),
  };
};

const renameKeys = async (template, keyMap = {}) => {
  const dom = new JSDOM(`<body>${template}</body>`);
  const { window: { document } } = dom;

  for (const node of document.querySelectorAll('[data-i18n]')) {
    const keyName = node.getAttribute('data-i18n');
    if (keyMap[keyName]) {
      node.setAttribute('data-i18n', keyMap[keyName]);
    }
  }

  return document.body.innerHTML;
};

const strategyConverter = async (keys, template, newStrategy = randomKeyNameStrategy, options = {}) => {
  const dom = new JSDOM(`<body>${template}</body>`);
  const { window: { document } } = dom;

  const nodes = document.querySelectorAll('[data-i18n]');
  const sequenceMax = nodes.length;
  const sequencePaddingLength = sequenceMax.toString().length;
  let sequence = options.prefixSequenceStart ? options.prefixSequenceStart : 0;

  for (const node of nodes) {
    const oldKeyName = node.getAttribute('data-i18n');
    let newKeyName = newStrategy(node);

    if (options.prefixSequence === true) {
      const sequenceWithLeadingZeros = sequence.toString().padStart(sequencePaddingLength, '0');
      newKeyName = `${sequenceWithLeadingZeros}-${newKeyName}`;
    }

    node.setAttribute('data-i18n', newKeyName);

    switch (node.tagName) {
      case 'IFRAME':
        if (`${oldKeyName}_src` in keys) {
          keys[`${newKeyName}_src`] = keys[`${oldKeyName}_src`];
          delete keys[`${oldKeyName}_src`];
        }
        break;

      case 'IMG':
        if (`${oldKeyName}_src` in keys) {
          keys[`${newKeyName}_src`] = keys[`${oldKeyName}_src`];
          delete keys[`${oldKeyName}_src`];
        }
        break;

      case 'A':
        if (`${oldKeyName}_href` in keys) {
          keys[`${newKeyName}_href`] = keys[`${oldKeyName}_href`];
          delete keys[`${oldKeyName}_href`];
        }
        // Fall through

      default:
        keys[`${newKeyName}_html`] = keys[`${oldKeyName}_html`];
        delete keys[`${oldKeyName}_html`];
    }

    sequence += 1;
  }

  return {
    keys,
    template: document.body.innerHTML.trim(),
  };
};

module.exports = {
  randomKeyNameStrategy,
  positionalKeyNameStrategy,
  strategyConverter,
  renameKeys,
  render,
  parse,
};
