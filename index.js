/* eslint-env node */
'use strict';

const Plugin = require('broccoli-plugin');
const frontmatter = require('front-matter');
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const showdown = require('showdown');

MarkdownResolver.prototype = Object.create(Plugin.prototype);
MarkdownResolver.prototype.constructor = MarkdownResolver;

function MarkdownResolver(inputNodes, options) {
  options = options || {};
  Plugin.call(this, inputNodes, options);
  this.options = options;
}

MarkdownResolver.prototype.readDirectory = function(srcPath, allFiles) {
  let files = fs.readdirSync(srcPath);

  return Array.prototype.reduce.call(files, (tree, file) => {
    let entry,
        fileExt = path.extname(file),
        fileName = file.replace(/\.[^/.]+$/, ''),
        relativePath = this.relativePath(path.join(srcPath, fileName)),
        isDirectory = fs.lstatSync(path.join(srcPath, file)).isDirectory();

    if (!isDirectory && fileExt !== '.md') { return [...tree]; }

    let index;

    let existingTreeNode = Array.prototype.find.call(tree, (file, i) => {
      index = i;
      return file.path === relativePath;
    });

    if (existingTreeNode) {
      entry = existingTreeNode;
    } else {
      entry = { path: relativePath };
    }

    if (isDirectory) {
      entry.children = this.readDirectory(path.join(srcPath, file), allFiles);
    } else {
      let fileContent = fs.readFileSync(path.join(srcPath, file), { encoding: 'utf8' });
      let content = frontmatter(fileContent);
      entry.attributes = content.attributes;
      entry.html = this.convertMarkdownToHTML(content.body);
      allFiles.push(entry);
    }

    if (existingTreeNode) {
      tree[index] = entry;
    }

    return existingTreeNode ? [...tree] : [...tree, entry];

  }, []);
};

MarkdownResolver.prototype.relativePath = function(srcDir) {
  let relPath = srcDir.replace(this.options.basePath, '');
  return relPath.replace(/^\/|\/$/g, '');
};

MarkdownResolver.prototype.convertMarkdownToHTML = function(markdown) {
	const converter = new showdown.Converter();
	return converter.makeHtml(markdown);
};

MarkdownResolver.prototype.build = function() {
  let files = [];

  Array.prototype.reduce.call(this._inputNodes, (trees, srcDir) => {
    trees[this.relativePath(srcDir)] = this.readDirectory(srcDir, files);
    return trees;
  }, {});

  let outputBuffer = `export default ${JSON.stringify(files, null, 2)};`;

  mkdirp.sync(path.join(this.outputPath, path.dirname(this.options.outputFile)));
  fs.writeFileSync(path.join(this.outputPath, this.options.outputFile), outputBuffer);

};

module.exports = MarkdownResolver;
