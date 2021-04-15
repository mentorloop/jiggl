const { mergeItems } = require('./util');

describe('lib/util', () => {
  test('mergeItems()', () => {

    const items = [{
      title: 'alpha',
      time: 1,
    }, {
      title: 'alpha',
      time: 2,
    }, {
      title: 'beta',
      time: 3,
    }, {
      title: 'beta',
      time: 4,
    }];

    expect(mergeItems(items, 'title')).toContainEqual({
      title: 'alpha',
      time: 3,
    });
    expect(mergeItems(items, 'title')).toContainEqual({
      title: 'beta',
      time: 7,
    });


  });
});
