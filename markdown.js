'use strict';

var MarkdownIt = require('markdown-it');
var hljs = require('highlight.js');
var tokenizeLinks = require('./tokenizeLinks');
var md = new MarkdownIt({
  html: true,
  xhtmlOut: true,
  linkify: true,
  typographer: true,
  langPrefix: 'md-lang-alias-',
  highlight: highlight
});
var ralias = / class="md-lang-alias-([^"]+)"/;
var aliases = {
  js: 'javascript',
  md: 'markdown',
  html: 'xml', // next best thing
  jade: 'css' // next best thing
};
var baseblock = md.renderer.rules.code_block;
var baseinline = md.renderer.rules.code_inline;
var basefence = md.renderer.rules.fence;
var basetext = md.renderer.rules.text;
var textcached = textparser([]);
var languages = [];
var context = {};

md.core.ruler.before('linkify', 'linkify-tokenizer', linkifyTokenizer, {});
md.renderer.rules.code_block = block;
md.renderer.rules.code_inline = inline;
md.renderer.rules.fence = fence;

hljs.configure({ tabReplace: 2, classPrefix: 'md-code-' });

function highlight (code, lang) {
  var lower = String(lang).toLowerCase();
  try {
    return hljs.highlight(aliases[lower] || lower, code).value;
  } catch (e) {
    return '';
  }
}

function block () {
  var base = baseblock.apply(this, arguments).substr(11); // starts with '<pre><code>'
  var classed = '<pre class="md-code-block"><code class="md-code">' + base;
  return classed;
}

function inline () {
  var base = baseinline.apply(this, arguments).substr(6); // starts with '<code>'
  var classed = '<code class="md-code md-code-inline">' + base;
  return classed;
}

function fence () {
  var base = basefence.apply(this, arguments).substr(5); // starts with '<pre>'
  var lang = base.substr(0, 6) !== '<code>'; // when the fence has a language class
  var rest = lang ? base : '<code class="md-code">' + base.substr(6);
  var classed = '<pre class="md-code-block">' + rest;
  var aliased = classed.replace(ralias, aliasing);
  return aliased;
}

function aliasing (all, language) {
  var name = aliases[language] || language || 'unknown';
  var lang = 'md-lang-' + name;
  if (languages.indexOf(lang) === -1) {
    languages.push(lang);
  }
  return ' class="md-code ' + lang + '"';
}

function textparser (tokenizers) {
  return function parseText () {
    var base = basetext.apply(this, arguments);
    var fancy = fanciful(base);
    var tokenized = tokenize(fancy, tokenizers);
    return tokenized;
  };
}

function fanciful (text) {
  return text
    .replace(/--/g, '\u2014')                            // em-dashes
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')      // opening singles
    .replace(/'/g, '\u2019')                             // closing singles & apostrophes
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c') // opening doubles
    .replace(/"/g, '\u201d')                             // closing doubles
    .replace(/\.{3}/g, '\u2026');                        // ellipses
}

function linkifyTokenizer (state) {
  tokenizeLinks(state, context);
}

function tokenize (text, tokenizers) {
  return tokenizers.reduce(use, text);
  function use (result, tok) {
    return result.replace(tok.token, tok.transform);
  }
}

function markdown (input, options) {
  var tok = options.tokenizers || [];
  var lin = options.linkifiers || [];
  var valid = input === null || input === void 0 ? '' : String(input);
  context.tokenizers = tok;
  context.linkifiers = lin;
  md.renderer.rules.text = tok.length ? textparser(tok) : textcached;
  var html = md.render(valid);
  return html;
}

markdown.parser = md;
markdown.languages = languages;
module.exports = markdown;
