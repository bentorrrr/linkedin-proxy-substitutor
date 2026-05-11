const SUBSTITUTIONS = { hello: 'goodbye' };

function buildRegex(word) {
  return new RegExp(`\\b${word}\\b`, 'gi');
}

function substituteText(text) {
  let result = text;
  for (const [word, replacement] of Object.entries(SUBSTITUTIONS)) {
    result = result.replace(buildRegex(word), replacement);
  }
  return result;
}

if (typeof document !== 'undefined') {
  function replaceInEditor(editor) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const original = node.textContent;
    const replaced = substituteText(original);
    if (replaced === original) return;

    const newCursorPos = range.startOffset + (replaced.length - original.length);

    // Select the full text node so execCommand replaces all of it.
    // execCommand fires proper input events that React's synthetic event
    // system tracks — direct textContent mutation would be overwritten
    // on React's next render cycle.
    const fullRange = document.createRange();
    fullRange.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(fullRange);

    document.execCommand('insertText', false, replaced);

    // Restore cursor after replacement
    const textNode = selection.anchorNode;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const pos = Math.max(0, Math.min(newCursorPos, textNode.textContent.length));
      const cursorRange = document.createRange();
      cursorRange.setStart(textNode, pos);
      cursorRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(cursorRange);
    }
  }

  function attachToEditor(editor) {
    if (editor.dataset.subAttached) return;
    editor.dataset.subAttached = '1';
    editor.addEventListener('input', () => replaceInEditor(editor));
  }

  const observer = new MutationObserver(() => {
    document
      .querySelectorAll('div[contenteditable="true"]')
      .forEach(attachToEditor);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document
    .querySelectorAll('div[contenteditable="true"]')
    .forEach(attachToEditor);
}

if (typeof module !== 'undefined') {
  module.exports = { SUBSTITUTIONS, buildRegex, substituteText };
}
