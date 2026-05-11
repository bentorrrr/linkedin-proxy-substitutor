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

    const cursorOffset = Math.max(
      0,
      Math.min(
        range.startOffset + (replaced.length - original.length),
        replaced.length
      )
    );

    node.textContent = replaced;

    const newRange = document.createRange();
    newRange.setStart(node, cursorOffset);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
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
