const { substituteText, buildRegex, SUBSTITUTIONS } = require('../substitutor');

describe('SUBSTITUTIONS', () => {
  test('contains hello → goodbye mapping', () => {
    expect(SUBSTITUTIONS['hello']).toBe('goodbye');
  });
});

describe('buildRegex', () => {
  test('matches whole word only', () => {
    const re = buildRegex('hello');
    expect('hello world').toMatch(re);
    expect('helloworld').not.toMatch(re);
    expect('sayhello').not.toMatch(re);
  });

  test('is case-insensitive', () => {
    const re = buildRegex('hello');
    expect('Hello world').toMatch(re);
    expect('HELLO world').toMatch(re);
  });
});

describe('substituteText', () => {
  test('replaces hello with goodbye', () => {
    expect(substituteText('hello world')).toBe('goodbye world');
  });

  test('does not replace partial match helloworld', () => {
    expect(substituteText('helloworld')).toBe('helloworld');
  });

  test('does not replace sayhello', () => {
    expect(substituteText('sayhello')).toBe('sayhello');
  });

  test('replaces Hello case-insensitively', () => {
    expect(substituteText('Hello world')).toBe('goodbye world');
  });

  test('replaces multiple occurrences', () => {
    expect(substituteText('hello and hello again')).toBe('goodbye and goodbye again');
  });

  test('leaves unrelated text unchanged', () => {
    expect(substituteText('good morning')).toBe('good morning');
  });

  test('replaces hello at start of string', () => {
    expect(substituteText('hello')).toBe('goodbye');
  });

  test('replaces hello followed by punctuation', () => {
    expect(substituteText('hello, world')).toBe('goodbye, world');
  });
});
