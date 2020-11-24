const {
  parse,
  render,
  positionalKeyNameStrategy,
  randomKeyNameStrategy,
} = require('./index');

describe('template service', () => {
  describe('parse', () => {
    it('find all block elements, extract the innerHTML and insert keys', async () => {
      const { keys, template } = await parse('<p>My test in a block element</p>', positionalKeyNameStrategy);
      const expectedTemplate = '<p data-i18n="p0">My test in a block element</p>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        p0_html: 'My test in a block element',
      });
    });

    it('detects and ignores empty text nodes', async () => {
      const { keys, template } = await parse('<p> </p>', positionalKeyNameStrategy);
      const expectedTemplate = '<p> </p>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({});
    });

    it('extracts images src attributes', async () => {
      const { keys, template } = await parse('<img src="https://www.one.com"/>', positionalKeyNameStrategy);
      const expectedTemplate = '<img src="https://www.one.com" data-i18n="img0">';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        img0_src: 'https://www.one.com',
      });
    });

    it('extracts anchor href attributes if value begins with "http" or "https"', async () => {
      const { keys, template } = await parse('<a href="https://www.one.com">My link</a>', positionalKeyNameStrategy);
      const expectedTemplate = '<a href="https://www.one.com" data-i18n="a0">My link</a>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        a0_href: 'https://www.one.com',
        a0_html: 'My link',
      });
    });

    it('skips anchor href attributes if value does not begin with "http" or "https"', async () => {
      const { keys, template } = await parse('<a href="#scroll-to">My link</a>', positionalKeyNameStrategy);
      const expectedTemplate = '<a href="#scroll-to" data-i18n="a0">My link</a>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        a0_html: 'My link',
      });
    });

    it('concatenates inline elements in a block', async () => {
      const { keys, template } = await parse(
        '<p>With <strong>strong text</strong> in block elements</p>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<p data-i18n="p0">With <strong>strong text</strong> in block elements</p>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        p0_html: 'With <strong>strong text</strong> in block elements',
      });
    });

    it('treats links with inline siblings in a block as one key', async () => {
      const { keys, template } = await parse(
        '<p>With <a href="http://help.one.com">a link</a> in block elements</p>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<p data-i18n="p0">With <a href="http://help.one.com">a link</a> in block elements</p>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        p0_html: 'With <a href="http://help.one.com">a link</a> in block elements',
      });
    });

    it('handles nested block elements', async () => {
      const { keys, template } = await parse(
        '<dl><dt>Tile 1</dt><dd>Description 1</dd><dt>Title 2</dt><dd>Description 2</dd></dl>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<dl><dt data-i18n="dl0_dt0">Tile 1</dt><dd data-i18n="dl0_dd1">\
Description 1</dd><dt data-i18n="dl0_dt2">Title 2</dt><dd data-i18n="dl0_dd3">Description 2</dd></dl>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        dl0_dt0_html: 'Tile 1',
        dl0_dd1_html: 'Description 1',
        dl0_dt2_html: 'Title 2',
        dl0_dd3_html: 'Description 2',
      });
    });

    it('only extract text for single sibling anchors', async () => {
      const { keys, template } = await parse(
        '<dd><a href="#step-12">How can I give feedback?</a></dd>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<dd><a href="#step-12" data-i18n="dd0_a0">How can I give feedback?</a></dd>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        dd0_a0_html: 'How can I give feedback?',
      });
    });

    it('only extracts src for single sibling image', async () => {
      const { keys, template } = await parse(
        '<dd><img src="http://www.one.com/logo.jpg"></dd>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<dd><img src="http://www.one.com/logo.jpg" data-i18n="dd0_img0"></dd>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        dd0_img0_src: 'http://www.one.com/logo.jpg',
      });
    });

    it('skips extracts src for single sibling image if asked to', async () => {
      const { keys, template } = await parse(
        '<dd><img src="http://www.one.com/logo.png"></dd>',
        positionalKeyNameStrategy,
        {
          parse: {
            images: false,
          },
        },
      );
      const expectedTemplate = '<dd><img src="http://www.one.com/logo.png"></dd>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({});
    });

    it('does not extract block elements that are empty/has no children', async () => {
      const { keys, template } = await parse('<hr>', positionalKeyNameStrategy);
      const expectedTemplate = '<hr>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({});
    });

    /*
    it('handles block elements with mixed inline and block children', async () => {
      const { keys, template } = await parse(
        '<div>first level block <div>second level block</div> back to first level block</div>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<div data-i18n="div0">first level block \
<div data-i18n="div0_div1">second level block</div> back to first level block</div>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        div0_text0: 'first level block',
        div0_div1_html: 'second level block',
        div0_text2: 'back to first level block',
      });
    });

    it('parses <blockquote>s with <ol> in it', async () => {
      const { keys, template } = await parse(
        '<blockquote><strong>Strong</strong> not so strong<br><ol><li>Item 1</li><li>Item 2</li></ol></blockquote>',
        positionalKeyNameStrategy,
      );

      const expectedTemplate = '<blockquote data-i18n="blockquote0_html0"><strong>Strong</strong> not so strong<br>\
<ol><li data-i18n="blockquote0_ol0_li0">Item 1</li><li data-i18n="blockquote0_ol0_li1">Item 2</li></ol>\
tailing test</blockquote>';
      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        blockquote0_html0: '<strong>Strong</strong> not so strong<br>',
        blockquote0_ol0_li0_html0: 'Item 1',
        blockquote0_ol0_li1: 'Item 2',
        blockquote0_html1: ' tailing text',
      });

//       // TODO: Maybe this is more what we want

//       const expectedTemplate = '<blockquote data-i18n="blockquote0_html0"><strong>Strong</strong> not so strong<br>\
// <ol><li data-i18n="blockquote0_ol0_li0">Item 1</li><li data-i18n="blockquote0_ol0_li1">Item 2</li></ol>\
// tailing test</blockquote>';
//       expect(template).toEqual(expectedTemplate);
//       expect(keys).toEqual({
//         blockquote0_html0: '<strong>Strong</strong> not so strong<br>{#blockquote0_ol0_li1#} tailing text',
//         blockquote0_ol0_li0_html0: 'Item 1',
//         blockquote0_ol0_li1: 'Item 2',
//       });
    });

    it('parses <img>s in <p>', async () => {
      const { keys, template } = await parse(
        '<p><img src="https://help.one.com/hc/article_attachments/360001125925/backup-02-select-date.png"\
 alt="backup-02-select-date.png"/></p>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<p><img\
 src="https://help.one.com/hc/article_attachments/360001125925/backup-02-select-date.png"\
 alt="backup-02-select-date.png" data-i18n="p0_img0"></p>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        p0_img0_src: 'https://help.one.com/hc/article_attachments/360001125925/backup-02-select-date.png',
      });
    });
    */

    it('findes iframes and a src attribute', async () => {
      const { keys, template } = await parse(
        '<p>This is an iframe:</p><iframe src="http://help.one.com"></iframe>',
        positionalKeyNameStrategy,
      );
      const expectedTemplate = '<p data-i18n="p0">This is an iframe:</p>\
<iframe src="http://help.one.com" data-i18n="iframe1"></iframe>';

      expect(template).toEqual(expectedTemplate);
      expect(keys).toEqual({
        p0_html: 'This is an iframe:',
        iframe1_src: 'http://help.one.com',
      });
    });
  });

  describe('render', () => {
    it('replaces html in a block element', async () => {
      const keys = {
        p0_html: 'Our test in a block element',
      };
      const html = await render('<p data-i18n="p0">My test in a block element</p>', keys);
      const expectedHtml = '<p data-i18n="p0">Our test in a block element</p>';

      expect(html).toEqual(expectedHtml);
    });

    it('replaces html and href in single sibling anchors', async () => {
      const keys = {
        a0_href: 'https://www.one.com',
        a0_html: 'Go to one.com',
      };
      const html = await render('<a href="http://www.b-one.net" data-i18n="a0">Go to b-one.net</a>', keys);
      const expectedHtml = '<a href="https://www.one.com" data-i18n="a0">Go to one.com</a>';

      expect(html).toEqual(expectedHtml);
    });

    it(
      'replaces html and not href in single sibling anchors without href attribute being "http" or "https"',
      async () => {
        const keys = {
          a0_html: 'Scroll to help you section',
        };
        const html = await render('<a href="#help-me-section" data-i18n="a0">Scroll to help me section</a>', keys);
        const expectedHtml = '<a href="#help-me-section" data-i18n="a0">Scroll to help you section</a>';

        expect(html).toEqual(expectedHtml);
      },
    );

    it('replaces src in single sibling images', async () => {
      const keys = {
        img0_src: 'https://www.one.com/logo.svg',
      };
      const html = await render('<img data-i18n="img0" src="http://www.one.com/logo.gif">', keys);
      const expectedHtml = '<img data-i18n="img0" src="https://www.one.com/logo.svg">';

      expect(html).toEqual(expectedHtml);
    });

    it('combines inline elements in a block', async () => {
      const keys = {
        p0_html: 'With <em>emphasised text</em> in block elements',
      };
      const html = await render('<p data-i18n="p0">With <strong>strong text</strong> in block elements</p>', keys);
      const expectedHtml = '<p data-i18n="p0">With <em>emphasised text</em> in block elements</p>';

      expect(html).toEqual(expectedHtml);
    });

    it('renders links with inline siblings in a block as one string', async () => {
      const keys = {
        p0_html: 'With <a href="http://help.one.com">a link</a> in block elements',
      };
      const html = await render(
        '<p data-i18n="p0">Has <a href="http://help.b-one.net">a link</a> in block elements</p>',
        keys,
      );
      const expectedHtml = '<p data-i18n="p0">With <a href="http://help.one.com">a link</a> in block elements</p>';

      expect(html).toEqual(expectedHtml);
    });

    it('replaces src in iframes', async () => {
      const keys = {
        p0_html: 'Here is an iframe:',
        iframe0_src: 'http://help.one.com',
      };
      const html = await render('<p data-i18n="p0">...</p><iframe data-i18n="iframe0"></iframe>', keys);
      const expectedHtml = '<p data-i18n="p0">Here is an iframe:</p><iframe data-i18n="iframe0" \
src="http://help.one.com"></iframe>';

      expect(html).toEqual(expectedHtml);
    });

    it('generates random keys', async () => {
      const { keys, template } = await parse('<p>Give me a random id</p>', randomKeyNameStrategy);
      const objKeys = Object.keys(keys);
      const valuesKeys = Object.values(keys);

      expect(objKeys.length).toEqual(1);
      expect(objKeys[0]).toMatch(/\w{10}_html/)
      expect(valuesKeys).toEqual(['Give me a random id']);
    });

    it('skips images with adjacent text', async () => {
      const { keys, template } = await parse('<p><img src="https://www.one.com/logo.png"/> we belong together</p>', positionalKeyNameStrategy);
      const expectedHtml = '<p data-i18n="p0"><img src="https://www.one.com/logo.png"> we belong together</p>';

      expect(template).toEqual(expectedHtml);
      expect(keys).toEqual({
        p0_html: '<img src="https://www.one.com/logo.png"> we belong together',
      });
    });
  });
});
