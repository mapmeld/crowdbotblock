// replace browser DOMParser
var DOMParser = require('xmldom').DOMParser;

/**
 * Visual Blocks Editor
 *
 * Copyright 2011 Google Inc.
 * http://code.google.com/p/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Core JavaScript library for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

// Top level object for Blockly.
var Blockly = {};

/**
 * Path to Blockly's directory.  Can be relative, absolute, or remote.
 * Used for loading additional resources.
 */
Blockly.pathToBlockly = './';

// Required name space for SVG elements.
Blockly.SVG_NS = 'http://www.w3.org/2000/svg';
// Required name space for HTML elements.
Blockly.HTML_NS = 'http://www.w3.org/1999/xhtml';

/**
 * The HSV_SATURATION and HSV_VALUE constants provide Blockly with a consistent
 * colour scheme, regardless of the hue.
 * Both constants must be in the range of 0 (inclusive) to 1 (exclusive).
 */
Blockly.HSV_SATURATION = 0.45;
Blockly.HSV_VALUE = 0.65;

/**
 * Convert a hue (HSV model) into an RGB hex triplet.
 * @param {number} hue Hue on a colour wheel (0-360).
 * @return {string} RGB code, e.g. '#84c'.
 */
Blockly.makeColour = function(hue) {
  hue %= 360;
  var topLimit = Blockly.HSV_VALUE;
  var bottomLimit = Blockly.HSV_VALUE * (1 - Blockly.HSV_SATURATION);
  var rangeUp = (topLimit - bottomLimit) * (hue % 60 / 60) + bottomLimit;
  var rangeDown = (topLimit - bottomLimit) * (1 - hue % 60 / 60) + bottomLimit;
  var r, g, b;
  if (0 <= hue && hue < 60) {
    r = topLimit;
    g = rangeUp;
    b = bottomLimit;
  } else if (60 <= hue && hue < 120) {
    r = rangeDown;
    g = topLimit;
    b = bottomLimit;
  } else if (120 <= hue && hue < 180) {
    r = bottomLimit;
    g = topLimit;
    b = rangeUp;
  } else if (180 <= hue && hue < 240) {
    r = bottomLimit;
    g = rangeDown;
    b = topLimit;
  } else if (240 <= hue && hue < 300) {
    r = rangeUp;
    g = bottomLimit;
    b = topLimit;
  } else if (300 <= hue && hue < 360) {
    r = topLimit;
    g = bottomLimit;
    b = rangeDown;
  } else {
    // Negative number?
    r = 0;
    g = 0;
    b = 0;
  }
  r = Math.floor(r * 16);
  g = Math.floor(g * 16);
  b = Math.floor(b * 16);
  var HEX = '0123456789abcdef';
  return '#' + HEX.charAt(r) + HEX.charAt(g) + HEX.charAt(b);
};

/**
 * ENUM for a right-facing value input.  E.g. 'test' or 'return'.
 */
Blockly.INPUT_VALUE = 1;
/**
 * ENUM for a left-facing value output.  E.g. 'call random'.
 */
Blockly.OUTPUT_VALUE = 2;
/**
 * ENUM for a down-facing block stack.  E.g. 'then-do' or 'else-do'.
 */
Blockly.NEXT_STATEMENT = 3;
/**
 * ENUM for an up-facing block stack.  E.g. 'close screen'.
 */
Blockly.PREVIOUS_STATEMENT = 4;
/**
 * ENUM for an local variable.  E.g. 'for x in list'.
 */
Blockly.LOCAL_VARIABLE = 5;
/**
 * ENUM for an dummy input.  Used to add a label with no input.
 */
Blockly.DUMMY_INPUT = 6;

/**
 * Lookup table for determining the opposite type of a connection.
 */
Blockly.OPPOSITE_TYPE = [];
Blockly.OPPOSITE_TYPE[Blockly.INPUT_VALUE] = Blockly.OUTPUT_VALUE;
Blockly.OPPOSITE_TYPE[Blockly.OUTPUT_VALUE] = Blockly.INPUT_VALUE;
Blockly.OPPOSITE_TYPE[Blockly.NEXT_STATEMENT] = Blockly.PREVIOUS_STATEMENT;
Blockly.OPPOSITE_TYPE[Blockly.PREVIOUS_STATEMENT] = Blockly.NEXT_STATEMENT;

/**
 * Database of pre-loaded sounds.
 * @private
 */
Blockly.SOUNDS_ = {};

/**
 * Currently selected block.
 * @type Blockly.Block
 */
Blockly.selected = null;

/**
 * In the future we might want to have display-only block views.
 * Until then, all blocks are considered editable.
 * Note that this property may only be set before init is called.
 * It can't be used to dynamically toggle editability on and off.
 */
Blockly.editable = true;

/**
 * Currently highlighted connection (during a drag).
 * @type {Blockly.Connection}
 * @private
 */
Blockly.highlightedConnection_ = null;

/**
 * Connection on dragged block that matches the highlighted connection.
 * @type {Blockly.Connection}
 * @private
 */
Blockly.localConnection_ = null;

/**
 * Number of pixels the mouse must move before a drag starts.
 */
Blockly.DRAG_RADIUS = 5;

/**
 * Maximum misalignment between connections for them to snap together.
 */
Blockly.SNAP_RADIUS = 12;

/**
 * Delay in ms between trigger and bumping unconnected block out of alignment.
 */
Blockly.BUMP_DELAY = 250;

/**
 * The document object.
 * @type {Document}
 */
Blockly.svgDoc = null;

/**
 * The main workspace (defined by inject.js).
 * @type {Blockly.Workspace}
 */
Blockly.mainWorkspace = null;

/**
 * Returns the dimensions of the current SVG image.
 * @return {!Object} Contains width, height, top and left properties.
 */
Blockly.svgSize = function() {
  return {width: Blockly.svg.cachedWidth_,
          height: Blockly.svg.cachedHeight_,
          top: Blockly.svg.cachedTop_,
          left: Blockly.svg.cachedLeft_};
};

/**
 * Size the SVG image to completely fill its container.
 * Record both the height/width and the absolute postion of the SVG image.
 */
Blockly.svgResize = function() {
  var width = Blockly.svg.parentNode.offsetWidth;
  var height = Blockly.svg.parentNode.offsetHeight;
  if (Blockly.svg.cachedWidth_ != width) {
    Blockly.svg.setAttribute('width', width + 'px');
    Blockly.svg.cachedWidth_ = width;
  }
  if (Blockly.svg.cachedHeight_ != height) {
    Blockly.svg.setAttribute('height', height + 'px');
    Blockly.svg.cachedHeight_ = height;
  }
  var bBox = Blockly.svg.getBoundingClientRect();
  Blockly.svg.cachedLeft_ = bBox.left;
  Blockly.svg.cachedTop_ = bBox.top;
};

/**
 * Handle a mouse-down on SVG drawing surface.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.onMouseDown_ = function(e) {
  Blockly.Block.terminateDrag_();
  Blockly.hideChaff();
  Blockly.removeAllRanges();
  if (Blockly.isTargetInput_(e) ||
      (Blockly.Mutator && Blockly.Mutator.isOpen)) {
    return;
  }
  if (Blockly.selected && e.target.nodeName == 'svg') {
    // Clicking on the document clears the selection.
    Blockly.selected.unselect();
  }
  if (Blockly.isRightButton(e)) {
    // Right-click.
    if (Blockly.ContextMenu) {
      Blockly.showContextMenu_(e.clientX, e.clientY);
    }
  } else if (e.target.nodeName == 'svg' || !Blockly.editable) {
    // If the workspace is editable, only allow dragging when gripping empty
    // space.  Otherwise, allow dragging when gripping anywhere.
    Blockly.mainWorkspace.dragMode = true;
    // Record the current mouse position.
    Blockly.mainWorkspace.startDragMouseX = e.clientX;
    Blockly.mainWorkspace.startDragMouseY = e.clientY;
    Blockly.mainWorkspace.startDragMetrics =
        Blockly.getMainWorkspaceMetrics();
    Blockly.mainWorkspace.startScrollX = Blockly.mainWorkspace.scrollX;
    Blockly.mainWorkspace.startScrollY = Blockly.mainWorkspace.scrollY;
  }
};

/**
 * Handle a mouse-up on SVG drawing surface.
 * @param {!Event} e Mouse up event.
 * @private
 */
Blockly.onMouseUp_ = function(e) {
  Blockly.setCursorHand_(false);
  Blockly.mainWorkspace.dragMode = false;
};

/**
 * Handle a mouse-move on SVG drawing surface.
 * @param {!Event} e Mouse move event.
 * @private
 */
Blockly.onMouseMove_ = function(e) {
  if (Blockly.mainWorkspace.dragMode) {
    Blockly.removeAllRanges();
    var dx = e.clientX - Blockly.mainWorkspace.startDragMouseX;
    var dy = e.clientY - Blockly.mainWorkspace.startDragMouseY;
    var metrics = Blockly.mainWorkspace.startDragMetrics;
    var x = Blockly.mainWorkspace.startScrollX + dx;
    var y = Blockly.mainWorkspace.startScrollY + dy;
    x = Math.min(x, -metrics.contentLeft);
    y = Math.min(y, -metrics.contentTop);
    x = Math.max(x, metrics.viewWidth - metrics.contentLeft -
                 metrics.contentWidth);
    y = Math.max(y, metrics.viewHeight - metrics.contentTop -
                 metrics.contentHeight);

    // Move the scrollbars and the page will scroll automatically.
    Blockly.mainWorkspace.scrollbar.set(-x - metrics.contentLeft,
                                        -y - metrics.contentTop);
  }
};

/**
 * Handle a key-down on SVG drawing surface.
 * @param {!Event} e Key down event.
 * @private
 */
Blockly.onKeyDown_ = function(e) {
  if (Blockly.isTargetInput_(e)) {
    // When focused on an HTML text input widget, don't trap any keys.
    return;
  }
  // TODO: Add keyboard support for cursoring around the context menu.
  if (e.keyCode == 27) {
    // Pressing esc closes the context menu.
    Blockly.hideChaff();
    if (Blockly.Mutator && Blockly.Mutator.isOpen) {
      Blockly.Mutator.closeDialog();
    }
  } else if (e.keyCode == 8 || e.keyCode == 46) {
    // Delete or backspace.
    if (Blockly.selected && Blockly.selected.editable &&
        (!Blockly.Mutator || !Blockly.Mutator.isOpen)) {
      Blockly.hideChaff();
      Blockly.playAudio('delete');
      Blockly.selected.destroy(true);
    }
    // Stop the browser from going back to the previous page.
    e.preventDefault();
  }
};

/**
 * Show the context menu for the workspace.
 * @param {number} x X-coordinate of mouse click.
 * @param {number} y Y-coordinate of mouse click.
 * @private
 */
Blockly.showContextMenu_ = function(x, y) {
  var options = [];

  // Option to get help.
  var helpOption = {enabled: false};
  helpOption.text = Blockly.MSG_HELP;
  helpOption.callback = function() {};
  options.push(helpOption);

  Blockly.ContextMenu.show(x, y, options);
};

/**
 * Cancel the native context menu, unless the focus is on an HTML input widget.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.onContextMenu_ = function(e) {
  if (!Blockly.isTargetInput_(e) && Blockly.ContextMenu) {
    // When focused on an HTML text input widget, don't cancel the context menu.
    e.preventDefault();
  }
};

/**
 * Close tooltips, context menus, dropdown selections, etc.
 * @param {boolean} opt_allowToolbox If true, don't close the toolbox.
 */
Blockly.hideChaff = function(opt_allowToolbox) {
  Blockly.Tooltip && Blockly.Tooltip.hide();
  Blockly.ContextMenu && Blockly.ContextMenu.hide();
  Blockly.FieldDropdown.hideMenu();
  if (Blockly.Toolbox && !opt_allowToolbox &&
      Blockly.Toolbox.flyout_.autoClose) {
    Blockly.Toolbox.clearSelection();
  }
};

/**
 * Destroy all selections on the webpage.
 * Chrome will select text outside the SVG when double-clicking.
 * Deselect this text, so that it doesn't mess up any subsequent drag.
 */
Blockly.removeAllRanges = function() {
  if (getSelection) {  // W3
    var sel = getSelection();
    if (sel && sel.removeAllRanges) {
      sel.removeAllRanges();
      setTimeout(function() {
          getSelection().removeAllRanges();
        }, 0);
    }
  }
};

/**
 * Is this event targetting a text input widget?
 * @param {!Event} e An event.
 * @return {boolean} True if text input.
 * @private
 */
Blockly.isTargetInput_ = function(e) {
  return e.target.type == 'textarea' || e.target.type == 'text';
};

/**
 * Load an audio file.  Cache it, ready for instantaneous playing.
 * @param {string} name Name of sound.
 * @private
 */
Blockly.loadAudio_ = function(name) {
  if (true) {
    // No browser support for Audio.
    return;
  }
  var sound = new Audio(Blockly.pathToBlockly + 'media/' + name + '.wav');
  // To force the browser to load the sound, play it, but stop it immediately.
  // If this starts creating a chirp on startup, turn the sound's volume down,
  // or use another caching method such as XHR.
  if (sound && sound.play) {
    sound.play();
    sound.pause();
    Blockly.SOUNDS_[name] = sound;
  }
};

/**
 * Play an audio file.
 * @param {string} name Name of sound.
 */
Blockly.playAudio = function(name) {
  //var sound = Blockly.SOUNDS_[name];
  //if (sound) {
  //  sound.play();
  //}
};

/**
 * Set the mouse cursor to be either a closed hand or the default.
 * @param {boolean} closed True for closed hand.
 * @private
 */
Blockly.setCursorHand_ = function(closed) {
  if (!Blockly.editable) {
    return;
  }
  /* Hotspot coordinates are baked into the CUR file, but they are still
     required due to a Chrome bug.
     http://code.google.com/p/chromium/issues/detail?id=1446 */
  var cursor = '';
  if (closed) {
    cursor = 'url(' + Blockly.pathToBlockly + 'media/handclosed.cur) 7 3, auto';
  }
  if (Blockly.selected) {
    Blockly.selected.getSvgRoot().style.cursor = cursor;
  }
  // Set cursor on the SVG surface as well as block so that rapid movements
  // don't result in cursor changing to an arrow momentarily.
  Blockly.svgDoc.getElementsByTagName('svg')[0].style.cursor = cursor;
};

/**
 * Return an object with all the metrics required to size scrollbars for the
 * main workspace.  The following properties are computed:
 * .viewHeight: Height of the visible rectangle,
 * .viewWidth: Width of the visible rectangle,
 * .contentHeight: Height of the contents,
 * .contentWidth: Width of the content,
 * .viewTop: Offset of top edge of visible rectangle from parent,
 * .viewLeft: Offset of left edge of visible rectangle from parent,
 * .contentTop: Offset of the top-most content from the y=0 coordinate,
 * .contentLeft: Offset of the left-most content from the x=0 coordinate.
 * .absoluteTop: Top-edge of view.
 * .absoluteLeft: Left-edge of view.
 * @return {Object} Contains size and position metrics of main workspace.
 */
Blockly.getMainWorkspaceMetrics = function() {
  var hwView = Blockly.svgSize();
  if (Blockly.Toolbox) {
    hwView.width -= Blockly.Toolbox.width;
  }
  var viewWidth = hwView.width - Blockly.Scrollbar.scrollbarThickness;
  var viewHeight = hwView.height - Blockly.Scrollbar.scrollbarThickness;
  try {
    var blockBox = Blockly.mainWorkspace.getCanvas().getBBox();
  } catch (e) {
    // Firefox has trouble with hidden elements (Bug 528969).
    return null;
  }
  if (blockBox.width == -Infinity && blockBox.height == -Infinity) {
    // Opera has trouble with bounding boxes around empty objects.
    blockBox = {width: 0, height: 0, x: 0, y: 0};
  }
  // Add a border around the content that is at least half a screenful wide.
  var leftEdge = Math.min(blockBox.x - viewWidth / 2,
                          blockBox.x + blockBox.width - viewWidth);
  var rightEdge = Math.max(blockBox.x + blockBox.width + viewWidth / 2,
                           blockBox.x + viewWidth);
  var topEdge = Math.min(blockBox.y - viewHeight / 2,
                         blockBox.y + blockBox.height - viewHeight);
  var bottomEdge = Math.max(blockBox.y + blockBox.height + viewHeight / 2,
                            blockBox.y + viewHeight);
  var absoluteLeft = 0;
  if (Blockly.Toolbox && !Blockly.RTL) {
    absoluteLeft = Blockly.Toolbox.width;
  }
  return {
    viewHeight: hwView.height,
    viewWidth: hwView.width,
    contentHeight: bottomEdge - topEdge,
    contentWidth: rightEdge - leftEdge,
    viewTop: -Blockly.mainWorkspace.scrollY,
    viewLeft: -Blockly.mainWorkspace.scrollX,
    contentTop: topEdge,
    contentLeft: leftEdge,
    absoluteTop: 0,
    absoluteLeft: absoluteLeft
  };
};

/**
 * Sets the X/Y translations of the main workspace to match the scrollbars.
 * @param {!Object} xyRatio Contains an x and/or y property which is a float
 *     between 0 and 1 specifying the degree of scrolling.
 */
Blockly.setMainWorkspaceMetrics = function(xyRatio) {
  var metrics = Blockly.getMainWorkspaceMetrics();
  if (typeof xyRatio.x == 'number') {
    Blockly.mainWorkspace.scrollX = -metrics.contentWidth * xyRatio.x -
        metrics.contentLeft;
  }
  if (typeof xyRatio.y == 'number') {
    Blockly.mainWorkspace.scrollY = -metrics.contentHeight * xyRatio.y -
        metrics.contentTop;
  }
  var translation = 'translate(' +
      (Blockly.mainWorkspace.scrollX + metrics.absoluteLeft) + ',' +
      (Blockly.mainWorkspace.scrollY + metrics.absoluteTop) + ')';
  Blockly.mainWorkspace.getCanvas().setAttribute('transform', translation);
  Blockly.mainWorkspace.getBubbleCanvas().setAttribute('transform',
                                                       translation);
};

/**
 * Rerender certain elements which might have had their sizes changed by the
 * CSS file and thus need realigning.
 * Called when the CSS file has finally loaded.
 */
Blockly.cssLoaded = function() {
  Blockly.Toolbox && Blockly.Toolbox.redraw();
};


/**
 * @fileoverview Utility functions for generating executable code from
 * Blockly code.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.Generator = {};

Blockly.Generator.NAME_TYPE = 'generated_function';

/**
 * Database of code generators, one for each language.
 */
Blockly.Generator.languages = {};

/**
 * Return the code generator for the specified language.  Create one if needed.
 * @param {string} name The language's name.
 * @return {!Object} Generator for this language.
 */
Blockly.Generator.get = function(name) {
  if (!(name in Blockly.Generator.languages)) {
    var generator = {};
    /**
     * Generate code for the specified block (and attached blocks).
     * @param {Blockly.Block} block The block to generate code for.
     * @return {string|!Array} For statement blocks, the generated code.
     *     For value blocks, an array containing the generated code and an
     *     operator order value.  Returns '' if block is null.
     */
    generator.blockToCode = function(block) {
      if (!block) {
        return '';
      }
      var func = this[block.type];
      if (!func) {
        throw 'Language "' + name + '" does not know how to generate code ' +
            'for block type "' + block.type + '".';
      }
      var code = func.call(block);
      if (code instanceof Array) {
        // Value blocks return tuples of code and operator order.
        if (block.disabled) {
          code[0] = '';
        }
        return [this.scrub_(block, code[0]), code[1]];
      } else {
        if (block.disabled) {
          code = '';
        }
        return this.scrub_(block, code);
      }
    };

    /**
     * Generate code representing the specified value input.
     * @param {!Blockly.Block} block The block containing the input.
     * @param {string} name The name of the input.
     * @param {integer} order Order of operations rank of this input's context.
     * @return {string} Generated code or '' if no blocks are connected.
     */
    generator.valueToCode = function(block, name, order) {
      var input = block.getInputTargetBlock(name);
      if (!input) {
        return '';
      }
      var tuple = this.blockToCode(input);
      if (!(tuple instanceof Array)) {
        // Value blocks must return code and order of operations info.
        // Statement blocks must only return code.
        throw 'Expecting tuple from value block "' + input.type + '".';
      }
      var code = tuple[0];
      var innerOrder = tuple[1];
      if (code && order <= innerOrder) {
        code = '(' + code + ')';
      }
      return code;
    };

    /**
     * Generate code representing the statement.  Indent the code.
     * @param {!Blockly.Block} block The block containing the input.
     * @param {string} name The name of the input.
     * @return {string} Generated code or '' if no blocks are connected.
     */
    generator.statementToCode = function(block, name) {
      var input = block.getInputTargetBlock(name);
      var code = this.blockToCode(input);
      if (typeof code != 'string') {
        // Value blocks must return code and order of operations info.
        // Statement blocks must only return code.
        throw 'Expecting code from statement block "' + input.type + '".';
      }
      if (code) {
        code = Blockly.Generator.prefixLines(code, '  ');
      }
      return code;
    };

    Blockly.Generator.languages[name] = generator;
  }
  return Blockly.Generator.languages[name];
};

/**
 * Generate code for all blocks in the workspace to the specified language.
 * @param {string} name Language name (e.g. 'JavaScript').
 * @return {string} Generated code.
 */
Blockly.Generator.workspaceToCode = function(name) {
  var code = [];
  var generator = Blockly.Generator.get(name);
  generator.init();
  var blocks = Blockly.mainWorkspace.getTopBlocks(true);
  for (var x = 0, block; block = blocks[x]; x++) {
    var line = generator.blockToCode(block, true);
    if (line instanceof Array) {
      // Value blocks return tuples of code and operator order.
      // Top-level blocks don't care about operator order.
      line = line[0];
    }
    if (block.outputConnection && generator.scrubNakedValue && line) {
      // This block is a naked value.  Ask the language's code generator if
      // it wants to append a semicolon, or something.
      line = generator.scrubNakedValue(line);
    }
    code.push(line);
  }
  code = code.join('\n');  // Blank line between each section.
  code = generator.finish(code);
  // Final scrubbing of whitespace.
  code = code.replace(/^\s+\n/, '');
  code = code.replace(/\n\s+$/, '\n');
  code = code.replace(/[ \t]+\n/g, '\n');
  return code;
};

// The following are some helpful functions which can be used by multiple
// languages.

/**
 * Prepend a common prefix onto each line of code.
 * @param {string} text The lines of code.
 * @param {string} prefix The common prefix.
 * @return {string} The prefixed lines of code.
 */
Blockly.Generator.prefixLines = function(text, prefix) {
  return prefix + text.replace(/\n(.)/g, '\n' + prefix + '$1');
};

/**
 * Recursively spider a tree of blocks, returning all their comments.
 * @param {!Blockly.Block} block The block from which to start spidering.
 * @return {string} Concatenated list of comments.
 */
Blockly.Generator.allNestedComments = function(block) {
  var comments = [];
  var blocks = block.getDescendants();
  for (var x = 0; x < blocks.length; x++) {
    var comment = blocks[x].getCommentText();
    if (comment) {
      comments.push(comment);
    }
  }
  // Append an empty string to create a trailing line break when joined.
  if (comments.length) {
    comments.push('');
  }
  return comments.join('\n');
};



/**
 * @fileoverview Helper functions for generating JavaScript for blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.JavaScript.RESERVED_WORDS_ =
    // https://developer.mozilla.org/en/JavaScript/Reference/Reserved_Words
    'break,case,catch,continue,debugger,default,delete,do,else,finally,for,function,if,in,instanceof,new,return,switch,this,throw,try,typeof,var,void,while,with,' +
    'class,enum,export,extends,import,super,implements,interface,let,package,private,protected,public,static,yield,' +
    'const,null,true,false,' +
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects
    'Array,ArrayBuffer,Boolean,Date,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,Error,eval,EvalError,Float32Array,Float64Array,Function,Infinity,Int16Array,Int32Array,Int8Array,isFinite,isNaN,Iterator,JSON,Math,NaN,Number,Object,parseFloat,parseInt,RangeError,ReferenceError,RegExp,StopIteration,String,SyntaxError,TypeError,Uint16Array,Uint32Array,Uint8Array,Uint8ClampedArray,undefined,uneval,URIError,' +
    // https://developer.mozilla.org/en/DOM/window
    'applicationCache,closed,Components,content,_content,controllers,crypto,defaultStatus,dialogArguments,directories,document,frameElement,frames,fullScreen,globalStorage,history,innerHeight,innerWidth,length,location,locationbar,localStorage,menubar,messageManager,mozAnimationStartTime,mozInnerScreenX,mozInnerScreenY,mozPaintCount,name,navigator,opener,outerHeight,outerWidth,pageXOffset,pageYOffset,parent,performance,personalbar,pkcs11,returnValue,screen,screenX,screenY,scrollbars,scrollMaxX,scrollMaxY,scrollX,scrollY,self,sessionStorage,sidebar,status,statusbar,toolbar,top,URL,window,' +
    'addEventListener,alert,atob,back,blur,btoa,captureEvents,clearImmediate,clearInterval,clearTimeout,close,confirm,disableExternalCapture,dispatchEvent,dump,enableExternalCapture,escape,find,focus,forward,GeckoActiveXObject,getAttention,getAttentionWithCycleCount,getComputedStyle,getSelection,home,matchMedia,maximize,minimize,moveBy,moveTo,mozRequestAnimationFrame,open,openDialog,postMessage,print,prompt,QueryInterface,releaseEvents,removeEventListener,resizeBy,resizeTo,restore,routeEvent,scroll,scrollBy,scrollByLines,scrollByPages,scrollTo,setCursor,setImmediate,setInterval,setResizable,setTimeout,showModalDialog,sizeToContent,stop,unescape,updateCommands,XPCNativeWrapper,XPCSafeJSObjectWrapper,' +
    'onabort,onbeforeunload,onblur,onchange,onclick,onclose,oncontextmenu,ondevicemotion,ondeviceorientation,ondragdrop,onerror,onfocus,onhashchange,onkeydown,onkeypress,onkeyup,onload,onmousedown,onmousemove,onmouseout,onmouseover,onmouseup,onmozbeforepaint,onpaint,onpopstate,onreset,onresize,onscroll,onselect,onsubmit,onunload,onpageshow,onpagehide,' +
    'Image,Option,Worker,' +
    // https://developer.mozilla.org/en/Gecko_DOM_Reference
    'Event,Range,File,FileReader,Blob,BlobBuilder,' +
    'Attr,CDATASection,CharacterData,Comment,console,DocumentFragment,DocumentType,DomConfiguration,DOMError,DOMErrorHandler,DOMException,DOMImplementation,DOMImplementationList,DOMImplementationRegistry,DOMImplementationSource,DOMLocator,DOMObject,DOMString,DOMStringList,DOMTimeStamp,DOMUserData,Entity,EntityReference,MediaQueryList,MediaQueryListListener,NameList,NamedNodeMap,Node,NodeFilter,NodeIterator,NodeList,Notation,Plugin,PluginArray,ProcessingInstruction,SharedWorker,Text,TimeRanges,Treewalker,TypeInfo,UserDataHandler,Worker,WorkerGlobalScope,' +
    'HTMLDocument,HTMLElement,HTMLAnchorElement,HTMLAppletElement,HTMLAudioElement,HTMLAreaElement,HTMLBaseElement,HTMLBaseFontElement,HTMLBodyElement,HTMLBRElement,HTMLButtonElement,HTMLCanvasElement,HTMLDirectoryElement,HTMLDivElement,HTMLDListElement,HTMLEmbedElement,HTMLFieldSetElement,HTMLFontElement,HTMLFormElement,HTMLFrameElement,HTMLFrameSetElement,HTMLHeadElement,HTMLHeadingElement,HTMLHtmlElement,HTMLHRElement,HTMLIFrameElement,HTMLImageElement,HTMLInputElement,HTMLKeygenElement,HTMLLabelElement,HTMLLIElement,HTMLLinkElement,HTMLMapElement,HTMLMenuElement,HTMLMetaElement,HTMLModElement,HTMLObjectElement,HTMLOListElement,HTMLOptGroupElement,HTMLOptionElement,HTMLOutputElement,HTMLParagraphElement,HTMLParamElement,HTMLPreElement,HTMLQuoteElement,HTMLScriptElement,HTMLSelectElement,HTMLSourceElement,HTMLSpanElement,HTMLStyleElement,HTMLTableElement,HTMLTableCaptionElement,HTMLTableCellElement,HTMLTableDataCellElement,HTMLTableHeaderCellElement,HTMLTableColElement,HTMLTableRowElement,HTMLTableSectionElement,HTMLTextAreaElement,HTMLTimeElement,HTMLTitleElement,HTMLTrackElement,HTMLUListElement,HTMLUnknownElement,HTMLVideoElement,' +
    'HTMLCanvasElement,CanvasRenderingContext2D,CanvasGradient,CanvasPattern,TextMetrics,ImageData,CanvasPixelArray,HTMLAudioElement,HTMLVideoElement,NotifyAudioAvailableEvent,HTMLCollection,HTMLAllCollection,HTMLFormControlsCollection,HTMLOptionsCollection,HTMLPropertiesCollection,DOMTokenList,DOMSettableTokenList,DOMStringMap,RadioNodeList,' +
    'SVGDocument,SVGElement,SVGAElement,SVGAltGlyphElement,SVGAltGlyphDefElement,SVGAltGlyphItemElement,SVGAnimationElement,SVGAnimateElement,SVGAnimateColorElement,SVGAnimateMotionElement,SVGAnimateTransformElement,SVGSetElement,SVGCircleElement,SVGClipPathElement,SVGColorProfileElement,SVGCursorElement,SVGDefsElement,SVGDescElement,SVGEllipseElement,SVGFilterElement,SVGFilterPrimitiveStandardAttributes,SVGFEBlendElement,SVGFEColorMatrixElement,SVGFEComponentTransferElement,SVGFECompositeElement,SVGFEConvolveMatrixElement,SVGFEDiffuseLightingElement,SVGFEDisplacementMapElement,SVGFEDistantLightElement,SVGFEFloodElement,SVGFEGaussianBlurElement,SVGFEImageElement,SVGFEMergeElement,SVGFEMergeNodeElement,SVGFEMorphologyElement,SVGFEOffsetElement,SVGFEPointLightElement,SVGFESpecularLightingElement,SVGFESpotLightElement,SVGFETileElement,SVGFETurbulenceElement,SVGComponentTransferFunctionElement,SVGFEFuncRElement,SVGFEFuncGElement,SVGFEFuncBElement,SVGFEFuncAElement,SVGFontElement,SVGFontFaceElement,SVGFontFaceFormatElement,SVGFontFaceNameElement,SVGFontFaceSrcElement,SVGFontFaceUriElement,SVGForeignObjectElement,SVGGElement,SVGGlyphElement,SVGGlyphRefElement,SVGGradientElement,SVGLinearGradientElement,SVGRadialGradientElement,SVGHKernElement,SVGImageElement,SVGLineElement,SVGMarkerElement,SVGMaskElement,SVGMetadataElement,SVGMissingGlyphElement,SVGMPathElement,SVGPathElement,SVGPatternElement,SVGPolylineElement,SVGPolygonElement,SVGRectElement,SVGScriptElement,SVGStopElement,SVGStyleElement,SVGSVGElement,SVGSwitchElement,SVGSymbolElement,SVGTextElement,SVGTextPathElement,SVGTitleElement,SVGTRefElement,SVGTSpanElement,SVGUseElement,SVGViewElement,SVGVKernElement,' +
    'SVGAngle,SVGColor,SVGICCColor,SVGElementInstance,SVGElementInstanceList,SVGLength,SVGLengthList,SVGMatrix,SVGNumber,SVGNumberList,SVGPaint,SVGPoint,SVGPointList,SVGPreserveAspectRatio,SVGRect,SVGStringList,SVGTransform,SVGTransformList,' +
    'SVGAnimatedAngle,SVGAnimatedBoolean,SVGAnimatedEnumeration,SVGAnimatedInteger,SVGAnimatedLength,SVGAnimatedLengthList,SVGAnimatedNumber,SVGAnimatedNumberList,SVGAnimatedPreserveAspectRatio,SVGAnimatedRect,SVGAnimatedString,SVGAnimatedTransformList,' +
    'SVGPathSegList,SVGPathSeg,SVGPathSegArcAbs,SVGPathSegArcRel,SVGPathSegClosePath,SVGPathSegCurvetoCubicAbs,SVGPathSegCurvetoCubicRel,SVGPathSegCurvetoCubicSmoothAbs,SVGPathSegCurvetoCubicSmoothRel,SVGPathSegCurvetoQuadraticAbs,SVGPathSegCurvetoQuadraticRel,SVGPathSegCurvetoQuadraticSmoothAbs,SVGPathSegCurvetoQuadraticSmoothRel,SVGPathSegLinetoAbs,SVGPathSegLinetoHorizontalAbs,SVGPathSegLinetoHorizontalRel,SVGPathSegLinetoRel,SVGPathSegLinetoVerticalAbs,SVGPathSegLinetoVerticalRel,SVGPathSegMovetoAbs,SVGPathSegMovetoRel,ElementTimeControl,TimeEvent,SVGAnimatedPathData,' +
    'SVGAnimatedPoints,SVGColorProfileRule,SVGCSSRule,SVGExternalResourcesRequired,SVGFitToViewBox,SVGLangSpace,SVGLocatable,SVGRenderingIntent,SVGStylable,SVGTests,SVGTextContentElement,SVGTextPositioningElement,SVGTransformable,SVGUnitTypes,SVGURIReference,SVGViewSpec,SVGZoomAndPan';

/**
 * Order of operation ENUMs.
 * https://developer.mozilla.org/en/JavaScript/Reference/Operators/Operator_Precedence
 */
Blockly.JavaScript.ORDER_ATOMIC = 0;         // 0 "" ...
Blockly.JavaScript.ORDER_MEMBER = 1;         // . []
Blockly.JavaScript.ORDER_NEW = 1;            // new
Blockly.JavaScript.ORDER_FUNCTION_CALL = 2;  // ()
Blockly.JavaScript.ORDER_INCREMENT = 3;      // ++
Blockly.JavaScript.ORDER_DECREMENT = 3;      // --
Blockly.JavaScript.ORDER_LOGICAL_NOT = 4;    // !
Blockly.JavaScript.ORDER_BITWISE_NOT = 4;    // ~
Blockly.JavaScript.ORDER_UNARY_PLUS = 4;     // +
Blockly.JavaScript.ORDER_UNARY_NEGATION = 4; // -
Blockly.JavaScript.ORDER_TYPEOF = 4;         // typeof
Blockly.JavaScript.ORDER_VOID = 4;           // void
Blockly.JavaScript.ORDER_DELETE = 4;         // delete
Blockly.JavaScript.ORDER_MULTIPLICATION = 5; // *
Blockly.JavaScript.ORDER_DIVISION = 5;       // /
Blockly.JavaScript.ORDER_MODULUS = 5;        // %
Blockly.JavaScript.ORDER_ADDITION = 6;       // +
Blockly.JavaScript.ORDER_SUBTRACTION = 6;    // -
Blockly.JavaScript.ORDER_BITWISE_SHIFT = 7;  // << >> >>>
Blockly.JavaScript.ORDER_RELATIONAL = 8;     // < <= > >=
Blockly.JavaScript.ORDER_IN = 8;             // in
Blockly.JavaScript.ORDER_INSTANCEOF = 8;     // instanceof
Blockly.JavaScript.ORDER_EQUALITY = 9;       // == != === !==
Blockly.JavaScript.ORDER_BITWISE_AND = 10;   // &
Blockly.JavaScript.ORDER_BITWISE_XOR = 11;   // ^
Blockly.JavaScript.ORDER_BITWISE_OR = 12;    // |
Blockly.JavaScript.ORDER_LOGICAL_AND = 13;   // &&
Blockly.JavaScript.ORDER_LOGICAL_OR = 14;    // ||
Blockly.JavaScript.ORDER_CONDITIONAL = 15;   // ?:
Blockly.JavaScript.ORDER_ASSIGNMENT = 16;    // = += -= *= /= %= <<= >>= ...
Blockly.JavaScript.ORDER_COMMA = 17;         // ,
Blockly.JavaScript.ORDER_NONE = 99;          // (...)

/**
 * Initialise the database of variable names.
 */
Blockly.JavaScript.init = function() {
  // Create a dictionary of definitions to be printed before the code.
  Blockly.JavaScript.definitions_ = {};

  if (Blockly.Variables) {
    if (!Blockly.JavaScript.variableDB_) {
      Blockly.JavaScript.variableDB_ =
          new Blockly.Names(Blockly.JavaScript.RESERVED_WORDS_.split(','));
    } else {
      Blockly.JavaScript.variableDB_.reset();
    }

    var defvars = [];
    var variables = Blockly.Variables.allVariables();
    for (var x = 0; x < variables.length; x++) {
      defvars[x] = 'var ' +
          Blockly.JavaScript.variableDB_.getDistinctName(variables[x],
          Blockly.Variables.NAME_TYPE) + ';';
    }
    Blockly.JavaScript.definitions_['variables'] = defvars.join('\n');
  }
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.JavaScript.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var definitions = [];
  for (var name in Blockly.JavaScript.definitions_) {
    definitions.push(Blockly.JavaScript.definitions_[name]);
  }
  return "var five = require('johnny-five');\nvar board = new five.Board();\nboard.on('ready', function(){\n" + definitions.join('\n') + '\n\n' + code + "\n});";
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  A trailing semicolon is needed to make this legal.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.JavaScript.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Encode a string as a properly escaped JavaScript string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} JavaScript string.
 * @private
 */
Blockly.JavaScript.quote_ = function(string) {
  // TODO: This is a quick hack.  Replace with goog.string.quote
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/'/g, '\\\'');
  return '\'' + string + '\'';
};

/**
 * Common tasks for generating JavaScript from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The JavaScript code created for this block.
 * @return {string} JavaScript code with comments and subsequent blocks added.
 * @private
 */
Blockly.JavaScript.scrub_ = function(block, code) {
  if (code === null) {
    // Block has handled code generation itself.
    return '';
  }
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      commentCode += Blockly.Generator.prefixLines(comment, '// ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var x = 0; x < block.inputList.length; x++) {
      if (block.inputList[x].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[x].targetBlock();
        if (childBlock) {
          var comment = Blockly.Generator.allNestedComments(childBlock);
          if (comment) {
            commentCode += Blockly.Generator.prefixLines(comment, '// ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = this.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};



/**
 * @fileoverview Variable blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

if (!Blockly.Language) Blockly.Language = {};

Blockly.Language.variables_get = {
  // Variable getter.
  category: null,  // Variables are handled specially.
  helpUrl: Blockly.LANG_VARIABLES_GET_HELPURL,
  init: function() {
    this.setColour(330);
    this.appendTitle(Blockly.LANG_VARIABLES_GET_TITLE_1);
    this.appendTitle(new Blockly.FieldDropdown(
        Blockly.Variables.dropdownCreate, Blockly.Variables.dropdownChange),
        'VAR').setText(Blockly.LANG_VARIABLES_GET_ITEM);
    this.setOutput(true, null);
    this.setTooltip(Blockly.LANG_VARIABLES_GET_TOOLTIP_1);
  },
  getVars: function() {
    return [this.getTitleText('VAR')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getTitleText('VAR'))) {
      this.setTitleText(newName, 'VAR');
    }
  }
};

Blockly.Language.variables_set = {
  // Variable setter.
  category: null,  // Variables are handled specially.
  helpUrl: Blockly.LANG_VARIABLES_SET_HELPURL,
  init: function() {
    this.setColour(330);
    this.appendTitle(Blockly.LANG_VARIABLES_SET_TITLE_1);
    this.appendTitle(new Blockly.FieldDropdown(
        Blockly.Variables.dropdownCreate, Blockly.Variables.dropdownChange),
        'VAR').setText(Blockly.LANG_VARIABLES_SET_ITEM);
    this.appendInput('', Blockly.INPUT_VALUE, 'VALUE', null);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.LANG_VARIABLES_SET_TOOLTIP_1);
  },
  getVars: function() {
    return [this.getTitleText('VAR')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getTitleText('VAR'))) {
      this.setTitleText(newName, 'VAR');
    }
  }
};



/**
 * @fileoverview Procedure blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

if (!Blockly.Language) Blockly.Language = {};

Blockly.Language.procedures_defnoreturn = {
  // Define a procedure with no return value.
  category: null,  // Procedures are handled specially.
  helpUrl: Blockly.LANG_PROCEDURES_DEFNORETURN_HELPURL,
  init: function() {
    this.setColour(290);
    var name = Blockly.Procedures.findLegalName(
        Blockly.LANG_PROCEDURES_DEFNORETURN_PROCEDURE, this);
    this.appendTitle(new Blockly.FieldTextInput(name,
        Blockly.Procedures.rename), 'NAME');
    this.appendTitle('', 'PARAMS');
    this.appendInput(Blockly.LANG_PROCEDURES_DEFNORETURN_DO,
        Blockly.NEXT_STATEMENT, 'STACK');
    this.setMutator(new Blockly.Mutator(['procedures_mutatorarg']));
    this.setTooltip(Blockly.LANG_PROCEDURES_DEFNORETURN_TOOLTIP_1);
    this.arguments_ = [];
  },
  updateParams_: function() {
    // Check for duplicated arguments.
    var badArg = false;
    var hash = {};
    for (var x = 0; x < this.arguments_.length; x++) {
      if (hash['arg_' + this.arguments_[x].toLowerCase()]) {
        badArg = true;
        break;
      }
      hash['arg_' + this.arguments_[x].toLowerCase()] = true;
    }
    if (badArg) {
      this.setWarningText(Blockly.LANG_PROCEDURES_DEF_DUPLICATE_WARNING);
    } else {
      this.setWarningText(null);
    }
    // Merge the arguments into a human-readable list.
    var paramString = this.arguments_.join(', ');
    this.setTitleText(paramString, 'PARAMS');
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    for (var x = 0; x < this.arguments_.length; x++) {
      var parameter = document.createElement('arg');
      parameter.setAttribute('name', this.arguments_[x]);
      container.appendChild(parameter);
    }
    return container;
  },
  domToMutation: function(xmlElement) {
    this.arguments_ = [];
    for (var x = 0, childNode; childNode = xmlElement.childNodes[x]; x++) {
      if (childNode.nodeName == 'arg') {
        this.arguments_.push(childNode.getAttribute('name'));
      }
    }
    this.updateParams_();
  },
  decompose: function(workspace) {
    var containerBlock = new Blockly.Block(workspace,
                                           'procedures_mutatorcontainer');
    containerBlock.initSvg();
    var connection = containerBlock.inputList[0];
    for (var x = 0; x < this.arguments_.length; x++) {
      var paramBlock = new Blockly.Block(workspace, 'procedures_mutatorarg');
      paramBlock.initSvg();
      paramBlock.setTitleText(this.arguments_[x], 'NAME');
      // Store the old location.
      paramBlock.oldLocation = x;
      connection.connect(paramBlock.previousConnection);
      connection = paramBlock.nextConnection;
    }
    // Initialize procedure's callers with blank IDs.
    Blockly.Procedures.mutateCallers(this.getTitleText('NAME'),
                                     this.workspace, this.arguments_, null);
    return containerBlock;
  },
  compose: function(containerBlock) {
    this.arguments_ = [];
    paramIds = [];
    var paramBlock = containerBlock.getInputTargetBlock('STACK');
    while (paramBlock) {
      this.arguments_.push(paramBlock.getTitleText('NAME'));
      paramIds.push(paramBlock.id);
      paramBlock = paramBlock.nextConnection &&
          paramBlock.nextConnection.targetBlock();
    }
    this.updateParams_();
    Blockly.Procedures.mutateCallers(this.getTitleText('NAME'),
                                     this.workspace, this.arguments_, paramIds);
  },
  destroy: function() {
    var name = this.getTitleText('NAME');
    var editable = this.editable;
    var workspace = this.workspace;
    // Call parent's destructor.
    Blockly.Block.prototype.destroy.call(this);
    if (this.editable) {
      // Destroy any callers.
      Blockly.Procedures.destroyCallers(name, workspace);
    }
  },
  getProcedureDef: function() {
    // Return the name of the defined procedure,
    // a list of all its arguments,
    // and that it DOES NOT have a return value.
    return [this.getTitleText('NAME'), this.arguments_, false];
  },
  getVars: function() {
    return this.arguments_;
  },
  renameVar: function(oldName, newName) {
    var change = false;
    for (var x = 0; x < this.arguments_.length; x++) {
      if (Blockly.Names.equals(oldName, this.arguments_[x])) {
        this.arguments_[x] = newName;
        change = true;
      }
    }
    if (change) {
      this.updateParams_();
      // Update the mutator's variables if the mutator is open.
      if (this.mutator.isVisible_()) {
        var blocks = this.mutator.workspace_.getAllBlocks();
        for (var x = 0, block; block = blocks[x]; x++) {
          if (block.type == 'procedures_mutatorarg' &&
              Blockly.Names.equals(oldName, block.getTitleText('NAME'))) {
            block.setTitleText(newName, 'NAME');
          }
        }
      }
    }
  }
};

Blockly.Language.procedures_defreturn = {
  // Define a procedure with a return value.
  category: null,  // Procedures are handled specially.
  helpUrl: Blockly.LANG_PROCEDURES_DEFRETURN_HELPURL,
  init: function() {
    this.setColour(290);
    var name = Blockly.Procedures.findLegalName(
        Blockly.LANG_PROCEDURES_DEFRETURN_PROCEDURE, this);
    this.appendTitle(
        new Blockly.FieldTextInput(name, Blockly.Procedures.rename), 'NAME');
    this.appendInput(['', 'PARAMS'], Blockly.DUMMY_INPUT);
    this.appendInput(Blockly.LANG_PROCEDURES_DEFRETURN_DO,
        Blockly.NEXT_STATEMENT, 'STACK');
    this.appendInput(Blockly.LANG_PROCEDURES_DEFRETURN_RETURN,
        Blockly.INPUT_VALUE, 'RETURN', null);
    this.setMutator(new Blockly.Mutator(['procedures_mutatorarg']));
    this.setTooltip(Blockly.LANG_PROCEDURES_DEFRETURN_TOOLTIP_1);
    this.arguments_ = [];
  },
  updateParams_: Blockly.Language.procedures_defnoreturn.updateParams_,
  mutationToDom: Blockly.Language.procedures_defnoreturn.mutationToDom,
  domToMutation: Blockly.Language.procedures_defnoreturn.domToMutation,
  decompose: Blockly.Language.procedures_defnoreturn.decompose,
  compose: Blockly.Language.procedures_defnoreturn.compose,
  destroy: Blockly.Language.procedures_defnoreturn.destroy,
  getProcedureDef: function() {
    // Return the name of the defined procedure,
    // a list of all its arguments,
    // and that it DOES have a return value.
    return [this.getTitleText('NAME'), this.arguments_, true];
  },
  getVars: Blockly.Language.procedures_defnoreturn.getVars,
  renameVar: Blockly.Language.procedures_defnoreturn.renameVar
};

Blockly.Language.procedures_mutatorcontainer = {
  // Procedure container (for mutator dialog).
  init: function() {
    this.setColour(290);
    this.appendTitle(Blockly.LANG_PROCEDURES_MUTATORCONTAINER_TITLE);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip('');
    this.contextMenu = false;
  }
};

Blockly.Language.procedures_mutatorarg = {
  // Procedure argument (for mutator dialog).
  init: function() {
    this.setColour(290);
    this.appendTitle(Blockly.LANG_PROCEDURES_MUTATORARG_TITLE);
    this.appendTitle(new Blockly.FieldTextInput('x',
        Blockly.Language.procedures_mutatorarg.validator), 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
    this.contextMenu = false;
  }
};

Blockly.Language.procedures_mutatorarg.validator = function(newVar) {
  // Merge runs of whitespace.  Strip leading and trailing whitespace.
  // Beyond this, all names are legal.
  newVar = newVar.replace(/[\s\xa0]+/g, ' ').replace(/^ | $/g, '');;
  return newVar || null;
};

Blockly.Language.procedures_callnoreturn = {
  // Call a procedure with no return value.
  category: null,  // Procedures are handled specially.
  helpUrl: Blockly.LANG_PROCEDURES_CALLNORETURN_HELPURL,
  init: function() {
    this.setColour(290);
    this.appendTitle(Blockly.LANG_PROCEDURES_CALLNORETURN_CALL);
    this.appendTitle(Blockly.LANG_PROCEDURES_CALLNORETURN_PROCEDURE, 'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.LANG_PROCEDURES_CALLNORETURN_TOOLTIP_1);
    this.arguments_ = [];
    this.quarkConnections_ = null;
    this.quarkArguments_ = null;
  },
  getProcedureCall: function() {
    return this.getTitleText('NAME');
  },
  renameProcedure: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getTitleText('NAME'))) {
      this.setTitleText(newName, 'NAME');
    }
  },
  setProcedureParameters: function(paramNames, paramIds) {
    if (!paramIds) {
      // Reset the quarks (a mutator is about to open).
      this.quarkConnections_ = {};
      this.quarkArguments_ = null;
      console.log('Clearing quarks.');
      return;
    }
    if (paramIds.length != paramNames.length) {
      throw 'Error: paramNames and paramIds must be the same length.';
    }
    if (!this.quarkArguments_) {
      // Initialize tracking for this block.
      this.quarkConnections_ = {};
      if (paramNames.join('\n') == this.arguments_.join('\n')) {
        // No change to the parameters, allow quarkConnections_ to be
        // populated with the existing connections.
        this.quarkArguments_ = paramIds;
        console.log('Priming the quarks.');
      }
    }
    // Update the quarkConnections_ with existing connections.
    for (var x = 0; x < this.arguments_.length; x++) {
      var connection = this.getInput('ARG' + x).targetConnection;
      this.quarkConnections_[this.quarkArguments_[x]] = connection;
    }
    // Disconnect all argument blocks and destroy all inputs.
    for (var x = this.arguments_.length - 1; x >= 0 ; x--) {
      this.removeInput('ARG' + x);
    }
    // Rebuild the block's arguments.
    this.arguments_ = [].concat(paramNames);
    this.quarkArguments_ = paramIds;
    for (var x = 0; x < this.arguments_.length; x++) {
      var input = this.appendInput(this.arguments_[x], Blockly.INPUT_VALUE,
          'ARG' + x, null);
      if (this.quarkArguments_) {
        // Reconnect any child blocks.
        var quarkName = this.quarkArguments_[x];
        if (quarkName in this.quarkConnections_) {
          var connection = this.quarkConnections_[quarkName];
          if (!connection || connection.targetConnection ||
              connection.sourceBlock_.workspace != this.workspace) {
            // Block no longer exists or has been attached elsewhere.
            delete this.quarkConnections_[quarkName];
          } else {
            input.connect(connection);
          }
        }
      }
    }
  },
  mutationToDom: function() {
    // Save the name and arguments (none of which are editable).
    var container = document.createElement('mutation');
    container.setAttribute('name', this.getTitleText('NAME'));
    for (var x = 0; x < this.arguments_.length; x++) {
      var parameter = document.createElement('arg');
      parameter.setAttribute('name', this.arguments_[x]);
      container.appendChild(parameter);
    }
    return container;
  },
  domToMutation: function(xmlElement) {
    // Restore the name and parameters.
    var name = xmlElement.getAttribute('name');
    this.setTitleText(name, 'NAME');
    this.arguments_ = [];
    for (var x = 0, childNode; childNode = xmlElement.childNodes[x]; x++) {
      if (childNode.tagName && childNode.tagName.toLowerCase() == 'arg') {
        var paramName = childNode.getAttribute('name');
        this.appendInput(paramName, Blockly.INPUT_VALUE,
            'ARG' + this.arguments_.length, null);
        this.arguments_.push(paramName);
      }
    }
  },
  renameVar: function(oldName, newName) {
    for (var x = 0; x < this.arguments_.length; x++) {
      if (Blockly.Names.equals(oldName, this.arguments_[x])) {
        this.arguments_[x] = newName;
        this.getInput('ARG' + x).label.setText(newName);
      }
    }
  },
  customContextMenu: function(options) {
    // Add option to find caller.
    var option = {enabled: true};
    option.text = Blockly.LANG_PROCEDURES_HIGHLIGHT_DEF;
    var name = this.getTitleText('NAME');
    var workspace = this.workspace;
    option.callback = function() {
      var blocks = workspace.getAllBlocks(false);
      for (var x = 0; x < blocks.length; x++) {
        var func = blocks[x].getProcedureDef;
        if (func) {
          var tuple = func.call(blocks[x]);
          if (tuple && Blockly.Names.equals(tuple[0], name)) {
            blocks[x].select();
            break;
          }
        }
      }
    };
    options.push(option);
  }
};

Blockly.Language.procedures_callreturn = {
  // Call a procedure with a return value.
  category: null,  // Procedures are handled specially.
  helpUrl: Blockly.LANG_PROCEDURES_CALLRETURN_HELPURL,
  init: function() {
    this.setColour(290);
    this.appendTitle(Blockly.LANG_PROCEDURES_CALLRETURN_CALL);
    this.appendTitle(Blockly.LANG_PROCEDURES_CALLRETURN_PROCEDURE, 'NAME');
    this.setOutput(true, null);
    this.setTooltip(Blockly.LANG_PROCEDURES_CALLRETURN_TOOLTIP_1);
    this.arguments_ = [];
    this.quarkMap_ = null;
    this.quarkList_ = null;
  },
  getProcedureCall: Blockly.Language.procedures_callnoreturn.getProcedureCall,
  renameProcedure: Blockly.Language.procedures_callnoreturn.renameProcedure,
  setProcedureParameters:
      Blockly.Language.procedures_callnoreturn.setProcedureParameters,
  mutationToDom: Blockly.Language.procedures_callnoreturn.mutationToDom,
  domToMutation: Blockly.Language.procedures_callnoreturn.domToMutation,
  renameVar: Blockly.Language.procedures_callnoreturn.renameVar,
  customContextMenu: Blockly.Language.procedures_callnoreturn.customContextMenu
};



/**
 * @fileoverview Math blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

if (!Blockly.Language) Blockly.Language = {};

Blockly.Language.math_number = {
  // Numeric value.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_NUMBER_HELPURL,
  init: function() {
    this.setColour(230);
    this.appendTitle(new Blockly.FieldTextInput('0',
        Blockly.Language.math_number.validator), 'NUM');
    this.setOutput(true, Number);
    this.setTooltip(Blockly.LANG_MATH_NUMBER_TOOLTIP_1);
  }
};

Blockly.Language.math_number.validator = function(text) {
  // Ensure that only a number may be entered.
  // TODO: Handle cases like 'o', 'ten', '1,234', '3,14', etc.
  var n = parseFloat(text || 0);
  return isNaN(n) ? null : String(n);
};

Blockly.Language.math_arithmetic = {
  // Basic arithmetic operator.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_ARITHMETIC_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    this.appendInput('', Blockly.INPUT_VALUE, 'A', Number);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([dropdown, 'OP'], Blockly.INPUT_VALUE, 'B', Number);
    this.setInputsInline(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var mode = thisBlock.getTitleValue('OP');
      return Blockly.Language.math_arithmetic.TOOLTIPS[mode];
    });
  }
};

Blockly.Language.math_arithmetic.OPERATORS =
    [['+', 'ADD'],
     ['-', 'MINUS'],
     ['\u00D7', 'MULTIPLY'],
     ['\u00F7', 'DIVIDE'],
     ['^', 'POWER']];

Blockly.Language.math_arithmetic.TOOLTIPS = {
  ADD: Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_ADD,
  MINUS: Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MINUS,
  MULTIPLY: Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MULTIPLY,
  DIVIDE: Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_DIVIDE,
  POWER: Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_POWER
};

Blockly.Language.math_change = {
  // Add to a variable in place.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_CHANGE_HELPURL,
  init: function() {
    this.setColour(230);
    this.appendTitle(Blockly.LANG_MATH_CHANGE_TITLE_CHANGE);
    this.appendTitle(new Blockly.FieldDropdown(
        Blockly.Variables.dropdownCreate, Blockly.Variables.dropdownChange),
        'VAR').setText(Blockly.LANG_MATH_CHANGE_TITLE_ITEM);
    this.appendInput(Blockly.LANG_MATH_CHANGE_INPUT_BY,
        Blockly.INPUT_VALUE, 'DELTA', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      return Blockly.LANG_MATH_CHANGE_TOOLTIP_1.replace('%1',
          thisBlock.getTitleText('VAR'));
    });
  },
  getVars: function() {
    return [this.getTitleText('VAR')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getTitleText('VAR'))) {
      this.setTitleText(newName, 'VAR');
    }
  }
};


Blockly.Language.math_single = {
  // Advanced math operators with single operand.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_SINGLE_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([dropdown, 'OP'], Blockly.INPUT_VALUE, 'NUM', Number);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var mode = thisBlock.getTitleValue('OP');
      return Blockly.Language.math_single.TOOLTIPS[mode];
    });
  }
};

Blockly.Language.math_single.OPERATORS =
    [[Blockly.LANG_MATH_SINGLE_OP_ROOT, 'ROOT'],
     [Blockly.LANG_MATH_SINGLE_OP_ABSOLUTE, 'ABS'],
     ['-', 'NEG'],
     ['ln', 'LN'],
     ['log10', 'LOG10'],
     ['e^', 'EXP'],
     ['10^', 'POW10']];

Blockly.Language.math_single.TOOLTIPS = {
  ROOT: Blockly.LANG_MATH_SINGLE_TOOLTIP_ROOT,
  ABS: Blockly.LANG_MATH_SINGLE_TOOLTIP_ABS,
  NEG: Blockly.LANG_MATH_SINGLE_TOOLTIP_NEG,
  LN: Blockly.LANG_MATH_SINGLE_TOOLTIP_LN,
  LOG10: Blockly.LANG_MATH_SINGLE_TOOLTIP_LOG10,
  EXP: Blockly.LANG_MATH_SINGLE_TOOLTIP_EXP,
  POW10: Blockly.LANG_MATH_SINGLE_TOOLTIP_POW10
};


Blockly.Language.math_round = {
  // Rounding functions.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_ROUND_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([dropdown, 'OP'], Blockly.INPUT_VALUE, 'NUM', Number);
    this.setTooltip(Blockly.LANG_MATH_ROUND_TOOLTIP_1);
  }
};

Blockly.Language.math_round.OPERATORS =
    [[Blockly.LANG_MATH_ROUND_OPERATOR_ROUND, 'ROUND'],
     [Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDUP, 'ROUNDUP'],
     [Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDDOWN, 'ROUNDDOWN']];

Blockly.Language.math_trig = {
  // Trigonometry operators.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_TRIG_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([dropdown, 'OP'], Blockly.INPUT_VALUE, 'NUM', Number);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var mode = thisBlock.getTitleValue('OP');
      return Blockly.Language.math_trig.TOOLTIPS[mode];
    });
  }
};

Blockly.Language.math_trig.OPERATORS =
    [['sin', 'SIN'],
     ['cos', 'COS'],
     ['tan', 'TAN'],
     ['asin', 'ASIN'],
     ['acos', 'ACOS'],
     ['atan', 'ATAN']];

Blockly.Language.math_trig.TOOLTIPS = {
  SIN: Blockly.LANG_MATH_TRIG_TOOLTIP_SIN,
  COS: Blockly.LANG_MATH_TRIG_TOOLTIP_COS,
  TAN: Blockly.LANG_MATH_TRIG_TOOLTIP_TAN,
  ASIN: Blockly.LANG_MATH_TRIG_TOOLTIP_ASIN,
  ACOS: Blockly.LANG_MATH_TRIG_TOOLTIP_ACOS,
  ATAN: Blockly.LANG_MATH_TRIG_TOOLTIP_ATAN
};

Blockly.Language.math_on_list = {
  // Evaluate a list of numbers to return sum, average, min, max, etc.
  // Some functions also work on text (min, max, mode, median).
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_ONLIST_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, [Number, Array]);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendTitle(dropdown, 'OP');
    this.appendInput(Blockly.LANG_MATH_ONLIST_INPUT_OFLIST,
        Blockly.INPUT_VALUE, 'LIST', Array);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var mode = thisBlock.getTitleValue('OP');
      return Blockly.Language.math_on_list.TOOLTIPS[mode];
    });
  }
};

Blockly.Language.math_on_list.OPERATORS =
    [[Blockly.LANG_MATH_ONLIST_OPERATOR_SUM, 'SUM'],
     [Blockly.LANG_MATH_ONLIST_OPERATOR_MIN, 'MIN'],
     [Blockly.LANG_MATH_ONLIST_OPERATOR_MAX, 'MAX'],
     [Blockly.LANG_MATH_ONLIST_OPERATOR_AVERAGE, 'AVERAGE'],
     [Blockly.LANG_MATH_ONLIST_OPERATOR_MEDIAN, 'MEDIAN'],
     [Blockly.LANG_MATH_ONLIST_OPERATOR_MODE, 'MODE'],
     [Blockly.LANG_MATH_ONLIST_OPERATOR_STD_DEV, 'STD_DEV'],
     [Blockly.LANG_MATH_ONLIST_OPERATOR_RANDOM, 'RANDOM']];

Blockly.Language.math_on_list.TOOLTIPS = {
  SUM: Blockly.LANG_MATH_ONLIST_TOOLTIP_SUM,
  MIN: Blockly.LANG_MATH_ONLIST_TOOLTIP_MIN,
  MAX: Blockly.LANG_MATH_ONLIST_TOOLTIP_MAX,
  AVERAGE: Blockly.LANG_MATH_ONLIST_TOOLTIP_AVERAGE,
  MEDIAN: Blockly.LANG_MATH_ONLIST_TOOLTIP_MEDIAN,
  MODE: Blockly.LANG_MATH_ONLIST_TOOLTIP_MODE,
  STD_DEV: Blockly.LANG_MATH_ONLIST_TOOLTIP_STD_DEV,
  RANDOM: Blockly.LANG_MATH_ONLIST_TOOLTIP_RANDOM
};

Blockly.Language.math_constrain = {
  // Constrain a number between two limits.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_CONSTRAIN_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    this.appendInput(Blockly.LANG_MATH_CONSTRAIN_INPUT_CONSTRAIN,
        Blockly.INPUT_VALUE, 'VALUE', Number);
    this.appendInput(Blockly.LANG_MATH_CONSTRAIN_INPUT_LOW,
        Blockly.INPUT_VALUE, 'LOW', Number);
    this.appendInput(Blockly.LANG_MATH_CONSTRAIN_INPUT_HIGH,
        Blockly.INPUT_VALUE, 'HIGH', Number);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_MATH_CONSTRAIN_TOOLTIP_1);
  }
};

Blockly.Language.math_modulo = {
  // Remainder of a division.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_MODULO_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    this.appendInput(Blockly.LANG_MATH_MODULO_INPUT_DIVIDEND,
        Blockly.INPUT_VALUE, 'DIVIDEND', Number);
    this.appendInput('\u00F7', Blockly.INPUT_VALUE, 'DIVISOR', Number);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_MATH_MODULO_TOOLTIP_1);
  }
};

Blockly.Language.math_random_int = {
  // Random integer between [X] and [Y].
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_RANDOM_INT_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    this.appendTitle(Blockly.LANG_MATH_RANDOM_INT_TITLE_RANDOM);
    this.appendInput(Blockly.LANG_MATH_RANDOM_INT_INPUT_FROM,
        Blockly.INPUT_VALUE, 'FROM', Number);
    this.appendInput(Blockly.LANG_MATH_RANDOM_INT_INPUT_TO,
        Blockly.INPUT_VALUE, 'TO', Number);
    // TODO: Ensure that only number blocks may used to set range.
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_MATH_RANDOM_INT_TOOLTIP_1);
  }
};

Blockly.Language.math_random_float = {
  // Random fraction between 0 and 1.
  category: Blockly.LANG_CATEGORY_MATH,
  helpUrl: Blockly.LANG_MATH_RANDOM_FLOAT_HELPURL,
  init: function() {
    this.setColour(230);
    this.setOutput(true, Number);
    this.appendTitle(Blockly.LANG_MATH_RANDOM_FLOAT_TITLE_RANDOM);
    this.setTooltip(Blockly.LANG_MATH_RANDOM_FLOAT_TOOLTIP_1);
  }
};


/**
 * @fileoverview Logic blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

if (!Blockly.Language) Blockly.Language = {};

Blockly.Language.logic_compare = {
  // Comparison operator.
  category: Blockly.LANG_CATEGORY_LOGIC,
  helpUrl: Blockly.LANG_LOGIC_COMPARE_HELPURL,
  init: function() {
    this.setColour(120);
    this.setOutput(true, Boolean);
    this.appendInput('', Blockly.INPUT_VALUE, 'A', null);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([dropdown, 'OP'], Blockly.INPUT_VALUE, 'B', null);
    this.setInputsInline(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var op = thisBlock.getTitleValue('OP');
      return Blockly.Language.logic_compare.TOOLTIPS[op];
    });
  }
};

Blockly.Language.logic_compare.OPERATORS =
    [['=', 'EQ'],
     ['\u2260', 'NEQ'],
     ['<', 'LT'],
     ['\u2264', 'LTE'],
     ['>', 'GT'],
     ['\u2265', 'GTE']];

Blockly.Language.logic_compare.TOOLTIPS = {
  EQ: Blockly.LANG_LOGIC_COMPARE_TOOLTIP_EQ,
  NEQ: Blockly.LANG_LOGIC_COMPARE_TOOLTIP_NEQ,
  LT: Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LT,
  LTE: Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LTE,
  GT: Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GT,
  GTE: Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GTE
};

Blockly.Language.logic_operation = {
  // Logical operations: 'and', 'or'.
  category: Blockly.LANG_CATEGORY_LOGIC,
  helpUrl: Blockly.LANG_LOGIC_OPERATION_HELPURL,
  init: function() {
    this.setColour(120);
    this.setOutput(true, Boolean);
    this.appendInput('', Blockly.INPUT_VALUE, 'A', Boolean);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([dropdown, 'OP'], Blockly.INPUT_VALUE, 'B', Boolean);
    this.setInputsInline(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var op = thisBlock.getTitleValue('OP');
      return Blockly.Language.logic_operation.TOOLTIPS[op];
    });
  }
};

Blockly.Language.logic_operation.OPERATORS =
    [[Blockly.LANG_LOGIC_OPERATION_AND, 'AND'],
     [Blockly.LANG_LOGIC_OPERATION_OR, 'OR']];

Blockly.Language.logic_operation.TOOLTIPS = {
  AND: Blockly.LANG_LOGIC_OPERATION_TOOLTIP_AND,
  OR: Blockly.LANG_LOGIC_OPERATION_TOOLTIP_OR
};

Blockly.Language.logic_negate = {
  // Negation.
  category: Blockly.LANG_CATEGORY_LOGIC,
  helpUrl: Blockly.LANG_LOGIC_NEGATE_HELPURL,
  init: function() {
    this.setColour(120);
    this.setOutput(true, Boolean);
    this.appendInput(Blockly.LANG_LOGIC_NEGATE_INPUT_NOT,
        Blockly.INPUT_VALUE, 'BOOL', Boolean);
    this.setTooltip(Blockly.LANG_LOGIC_NEGATE_TOOLTIP_1);
  }
};

Blockly.Language.logic_boolean = {
  // Boolean data type: true and false.
  category: Blockly.LANG_CATEGORY_LOGIC,
  helpUrl: Blockly.LANG_LOGIC_BOOLEAN_HELPURL,
  init: function() {
    this.setColour(120);
    this.setOutput(true, Boolean);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendTitle(dropdown, 'BOOL');
    this.setTooltip(Blockly.LANG_LOGIC_BOOLEAN_TOOLTIP_1);
  }
};

Blockly.Language.logic_boolean.OPERATORS =
    [[Blockly.LANG_LOGIC_BOOLEAN_TRUE, 'TRUE'],
     [Blockly.LANG_LOGIC_BOOLEAN_FALSE, 'FALSE']];



/**
 * @fileoverview List blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

if (!Blockly.Language) Blockly.Language = {};

Blockly.Language.lists_create_empty = {
  // Create an empty list.
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: Blockly.LANG_LISTS_CREATE_EMPTY_HELPURL,
  init: function() {
    this.setColour(210);
    this.setOutput(true, Array);
    this.appendTitle(Blockly.LANG_LISTS_CREATE_EMPTY_TITLE_1);
    this.setTooltip(Blockly.LANG_LISTS_CREATE_EMPTY_TOOLTIP_1);
  }
};

Blockly.Language.lists_create_with = {
  // Create a list with any number of elements of any type.
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: '',
  init: function() {
    this.setColour(210);
    this.appendTitle(Blockly.LANG_LISTS_CREATE_WITH_INPUT_WITH);
    this.appendInput('', Blockly.INPUT_VALUE, 'ADD0', null);
    this.appendInput('', Blockly.INPUT_VALUE, 'ADD1', null);
    this.appendInput('', Blockly.INPUT_VALUE, 'ADD2', null);
    this.setOutput(true, Array);
    this.setMutator(new Blockly.Mutator(['lists_create_with_item']));
    this.setTooltip(Blockly.LANG_LISTS_CREATE_WITH_TOOLTIP_1);
    this.itemCount_ = 3;
  },
  mutationToDom: function(workspace) {
    var container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  domToMutation: function(container) {
    for (var x = 0; x < this.itemCount_; x++) {
      this.removeInput('ADD' + x);
    }
    this.itemCount_ = parseInt(container.getAttribute('items'), 10);
    for (var x = 0; x < this.itemCount_; x++) {
      this.appendInput('', Blockly.INPUT_VALUE, 'ADD' + x, null);
    }
  },
  decompose: function(workspace) {
    var containerBlock = new Blockly.Block(workspace,
                                           'lists_create_with_container');
    containerBlock.initSvg();
    var connection = containerBlock.inputList[0];
    for (var x = 0; x < this.itemCount_; x++) {
      var itemBlock = new Blockly.Block(workspace, 'lists_create_with_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    // Disconnect all input blocks and destroy all inputs.
    for (var x = this.itemCount_ - 1; x >= 0; x--) {
      this.removeInput('ADD' + x);
    }
    this.itemCount_ = 0;
    // Rebuild the block's inputs.
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    while (itemBlock) {
      var input = this.appendInput('', Blockly.INPUT_VALUE,
                                   'ADD' + this.itemCount_, null);
      // Reconnect any child blocks.
      if (itemBlock.valueInput_) {
        input.connect(itemBlock.valueInput_);
      }
      this.itemCount_++;
      itemBlock = itemBlock.nextConnection &&
          itemBlock.nextConnection.targetBlock();
    }
  },
  saveConnections: function(containerBlock) {
    // Store a pointer to any connected child blocks.
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var x = 0;
    while (itemBlock) {
      var input = this.getInput('ADD' + x);
      itemBlock.valueInput_ = input && input.targetConnection;
      x++;
      itemBlock = itemBlock.nextConnection &&
          itemBlock.nextConnection.targetBlock();
    }
  }
};

Blockly.Language.lists_create_with_container = {
  // Container.
  init: function() {
    this.setColour(210);
    this.appendTitle(Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TITLE_ADD);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip(Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.lists_create_with_item = {
  // Add items.
  init: function() {
    this.setColour(210);
    this.appendTitle(Blockly.LANG_LISTS_CREATE_WITH_ITEM_TITLE);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.LANG_LISTS_CREATE_WITH_ITEM_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.lists_repeat = {
  // Create a list with one element repeated.
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: Blockly.LANG_LISTS_REPEAT_HELPURL,
  init: function() {
    this.setColour(210);
    this.setOutput(true, Array);
    this.appendTitle(Blockly.LANG_LISTS_REPEAT_TITLE_CREATELIST);
    this.appendInput(Blockly.LANG_LISTS_REPEAT_INPUT_WITH,
        Blockly.INPUT_VALUE, 'ITEM', null);
    this.appendInput(Blockly.LANG_LISTS_REPEAT_INPIT_REPEATED,
        Blockly.INPUT_VALUE, 'NUM', Number);
    this.appendInput(Blockly.LANG_LISTS_REPEAT_INPIT_TIMES,
        Blockly.DUMMY_INPUT, '', null);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_LISTS_REPEAT_TOOLTIP_1);
  }
};

Blockly.Language.lists_length = {
  // List length.
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: Blockly.LANG_LISTS_LENGTH_HELPURL,
  init: function() {
    this.setColour(210);
    this.appendInput(Blockly.LANG_LISTS_LENGTH_INPUT_LENGTH,
        Blockly.INPUT_VALUE, 'VALUE', [Array, String]);
    this.setOutput(true, Number);
    this.setTooltip(Blockly.LANG_LISTS_LENGTH_TOOLTIP_1);
  }
};

Blockly.Language.lists_isEmpty = {
  // Is the list empty?
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: Blockly.LANG_LISTS_IS_EMPTY_HELPURL,
  init: function() {
    this.setColour(210);
    this.appendInput(Blockly.LANG_LISTS_INPUT_IS_EMPTY,
        Blockly.INPUT_VALUE, 'VALUE', [Array, String]);
    this.setOutput(true, Boolean);
    this.setTooltip(Blockly.LANG_LISTS_TOOLTIP_1);
  }
};

Blockly.Language.lists_indexOf = {
  // Find an item in the list.
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: Blockly.LANG_LISTS_INDEX_OF_HELPURL,
  init: function() {
    this.setColour(210);
    this.setOutput(true, Number);
    this.appendTitle(Blockly.LANG_LISTS_INDEX_OF_TITLE_FIND);
    var menu = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendTitle(menu, 'END');
    this.appendInput(Blockly.LANG_LISTS_INDEX_OF_INPUT_OCCURRENCE,
        Blockly.INPUT_VALUE, 'FIND', null);
    this.appendInput(Blockly.LANG_LISTS_INDEX_OF_INPUT_IN_LIST,
        Blockly.INPUT_VALUE, 'VALUE', Array);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_LISTS_INDEX_OF_TOOLTIP_1);
  }
};

Blockly.Language.lists_indexOf.OPERATORS =
    [[Blockly.LANG_LISTS_INDEX_OF_FIRST, 'FIRST'],
     [Blockly.LANG_LISTS_INDEX_OF_LAST, 'LAST']];

Blockly.Language.lists_getIndex = {
  // Get element at index.
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: Blockly.LANG_LISTS_GET_INDEX_HELPURL,
  init: function() {
    this.setColour(210);
    this.setOutput(true, null);
    this.appendTitle(Blockly.LANG_LISTS_GET_INDEX_TITLE);
    this.appendInput(Blockly.LANG_LISTS_GET_INDEX_INPUT_AT,
        Blockly.INPUT_VALUE, 'AT', Number);
    this.appendInput(Blockly.LANG_LISTS_GET_INDEX_INPUT_IN_LIST,
        Blockly.INPUT_VALUE, 'VALUE', Array);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_1);
  }
};

Blockly.Language.lists_setIndex = {
  // Set element at index.
  category: Blockly.LANG_CATEGORY_LISTS,
  helpUrl: Blockly.LANG_LISTS_SET_INDEX_HELPURL,
  init: function() {
    this.setColour(210);
    this.appendTitle(Blockly.LANG_LISTS_SET_INDEX_TITLE);
    this.appendInput(Blockly.LANG_LISTS_SET_INDEX_INPUT_AT,
        Blockly.INPUT_VALUE, 'AT', Number);
    this.appendInput(Blockly.LANG_LISTS_SET_INDEX_INPUT_IN_LIST,
        Blockly.INPUT_VALUE, 'LIST', Array);
    this.appendInput(Blockly.LANG_LISTS_SET_INDEX_INPUT_TO,
        Blockly.INPUT_VALUE, 'TO', null);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_1);
  }
};



/**
 * @fileoverview Control blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

if (!Blockly.Language) Blockly.Language = {};

Blockly.Language.controls_if = {
  // If/elseif/else condition.
  category: Blockly.LANG_CATEGORY_CONTROLS,
  helpUrl: Blockly.LANG_CONTROLS_IF_HELPURL,
  init: function() {
    this.setColour(120);
    this.appendInput(this.MSG_IF, Blockly.INPUT_VALUE, 'IF0', Boolean);
    this.appendInput(this.MSG_THEN, Blockly.NEXT_STATEMENT, 'DO0');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setMutator(new Blockly.Mutator(['controls_if_elseif',
                                         'controls_if_else']));
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      if (!thisBlock.elseifCount_ && !thisBlock.elseCount_) {
        return Blockly.LANG_CONTROLS_IF_TOOLTIP_1;
      } else if (!thisBlock.elseifCount_ && thisBlock.elseCount_) {
        return Blockly.LANG_CONTROLS_IF_TOOLTIP_2;
      } else if (thisBlock.elseifCount_ && !thisBlock.elseCount_) {
        return Blockly.LANG_CONTROLS_IF_TOOLTIP_3;
      } else if (thisBlock.elseifCount_ && thisBlock.elseCount_) {
        return Blockly.LANG_CONTROLS_IF_TOOLTIP_4;
      }
      return '';
    });
    this.elseifCount_ = 0;
    this.elseCount_ = 0;
  },
  MSG_IF: Blockly.LANG_CONTROLS_IF_MSG_IF,
  MSG_ELSEIF: Blockly.LANG_CONTROLS_IF_MSG_ELSEIF,
  MSG_ELSE: Blockly.LANG_CONTROLS_IF_MSG_ELSE,
  MSG_THEN: Blockly.LANG_CONTROLS_IF_MSG_THEN,
  mutationToDom: function() {
    if (!this.elseifCount_ && !this.elseCount_) {
      return null;
    }
    var container = document.createElement('mutation');
    if (this.elseifCount_) {
      container.setAttribute('elseif', this.elseifCount_);
    }
    if (this.elseCount_) {
      container.setAttribute('else', 1);
    }
    return container;
  },
  domToMutation: function(xmlElement) {
    this.elseifCount_ = parseInt(xmlElement.getAttribute('elseif'), 10);
    this.elseCount_ = parseInt(xmlElement.getAttribute('else'), 10);
    for (var x = 1; x <= this.elseifCount_; x++) {
      this.appendInput(this.MSG_ELSEIF, Blockly.INPUT_VALUE, 'IF' + x, Boolean);
      this.appendInput(this.MSG_THEN, Blockly.NEXT_STATEMENT, 'DO' + x);
    }
    if (this.elseCount_) {
      this.appendInput(this.MSG_ELSE, Blockly.NEXT_STATEMENT, 'ELSE');
    }
  },
  decompose: function(workspace) {
    var containerBlock = new Blockly.Block(workspace, 'controls_if_if');
    containerBlock.initSvg();
    var connection = containerBlock.inputList[0];
    for (var x = 1; x <= this.elseifCount_; x++) {
      var elseifBlock = new Blockly.Block(workspace, 'controls_if_elseif');
      elseifBlock.initSvg();
      connection.connect(elseifBlock.previousConnection);
      connection = elseifBlock.nextConnection;
    }
    if (this.elseCount_) {
      var elseBlock = new Blockly.Block(workspace, 'controls_if_else');
      elseBlock.initSvg();
      connection.connect(elseBlock.previousConnection);
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    // Disconnect the else input blocks and destroy the inputs.
    if (this.elseCount_) {
      this.removeInput('ELSE');
    }
    this.elseCount_ = 0;
    // Disconnect all the elseif input blocks and destroy the inputs.
    for (var x = this.elseifCount_; x > 0; x--) {
      this.removeInput('IF' + x);
      this.removeInput('DO' + x);
    }
    this.elseifCount_ = 0;
    // Rebuild the block's optional inputs.
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'controls_if_elseif':
          this.elseifCount_++;
          var ifInput = this.appendInput(this.MSG_ELSEIF, Blockly.INPUT_VALUE,
              'IF' + this.elseifCount_, Boolean);
          var doInput = this.appendInput(this.MSG_THEN, Blockly.NEXT_STATEMENT,
              'DO' + this.elseifCount_);
          // Reconnect any child blocks.
          if (clauseBlock.valueInput_) {
            ifInput.connect(clauseBlock.valueInput_);
          }
          if (clauseBlock.statementInput_) {
            doInput.connect(clauseBlock.statementInput_);
          }
          break;
        case 'controls_if_else':
          this.elseCount_++;
          var elseInput = this.appendInput(this.MSG_ELSE,
              Blockly.NEXT_STATEMENT, 'ELSE');
          // Reconnect any child blocks.
          if (clauseBlock.statementInput_) {
            elseInput.connect(clauseBlock.statementInput_);
          }
          break;
        default:
          throw 'Unknown block type.';
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  },
  saveConnections: function(containerBlock) {
    // Store a pointer to any connected child blocks.
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var x = 1;
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'controls_if_elseif':
          var inputIf = this.getInput('IF' + x);
          var inputDo = this.getInput('DO' + x);
          clauseBlock.valueInput_ = inputIf && inputIf.targetConnection;
          clauseBlock.statementInput_ = inputDo && inputDo.targetConnection;
          x++;
          break;
        case 'controls_if_else':
          var inputDo = this.getInput('ELSE');
          clauseBlock.statementInput_ = inputDo && inputDo.targetConnection;
          break;
        default:
          throw 'Unknown block type.';
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  }
};

Blockly.Language.controls_if_if = {
  // If condition.
  init: function() {
    this.setColour(120);
    this.appendTitle(Blockly.LANG_CONTROLS_IF_IF_TITLE_IF);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip(Blockly.LANG_CONTROLS_IF_IF_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.controls_if_elseif = {
  // Else-If condition.
  init: function() {
    this.setColour(120);
    this.appendTitle(Blockly.LANG_CONTROLS_IF_ELSEIF_TITLE_ELSEIF);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.LANG_CONTROLS_IF_ELSEIF_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.controls_if_else = {
  // Else condition.
  init: function() {
    this.setColour(120);
    this.appendTitle(Blockly.LANG_CONTROLS_IF_ELSE_TITLE_ELSE);
    this.setPreviousStatement(true);
    this.setTooltip(Blockly.LANG_CONTROLS_IF_ELSE_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.controls_whileUntil = {
  // Do while/until loop.
  category: Blockly.LANG_CATEGORY_CONTROLS,
  helpUrl: Blockly.LANG_CONTROLS_WHILEUNTIL_HELPURL,
  init: function() {
    this.setColour(120);
    this.appendTitle(Blockly.LANG_CONTROLS_WHILEUNTIL_TITLE_REPEAT);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendTitle(dropdown, 'MODE');
    this.appendInput('', Blockly.INPUT_VALUE, 'BOOL', Boolean);
    this.appendInput(Blockly.LANG_CONTROLS_WHILEUNTIL_INPUT_DO,
                     Blockly.NEXT_STATEMENT, 'DO');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var op = thisBlock.getTitleValue('MODE');
      return Blockly.Language.controls_whileUntil.TOOLTIPS[op];
    });
  }
};

Blockly.Language.controls_whileUntil.OPERATORS =
    [[Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_WHILE, 'WHILE'],
     [Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_UNTIL, 'UNTIL']];

Blockly.Language.controls_whileUntil.TOOLTIPS = {
  WHILE: Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_WHILE,
  UNTIL: Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_UNTIL
};

Blockly.Language.controls_for = {
  // For loop.
  category: Blockly.LANG_CATEGORY_CONTROLS,
  helpUrl: Blockly.LANG_CONTROLS_FOR_HELPURL,
  init: function() {
    this.setColour(120);
    this.appendTitle(Blockly.LANG_CONTROLS_FOR_TITLE_COUNT);
    this.appendInput(Blockly.LANG_CONTROLS_FOR_INPUT_WITH,
        Blockly.LOCAL_VARIABLE, 'VAR').setText(
        Blockly.LANG_CONTROLS_FOR_INPUT_VAR);
    this.appendInput(Blockly.LANG_CONTROLS_FOR_INPUT_FROM,
        Blockly.INPUT_VALUE, 'FROM', Number);
    this.appendInput(Blockly.LANG_CONTROLS_FOR_INPUT_TO,
        Blockly.INPUT_VALUE, 'TO', Number);
    this.appendInput(Blockly.LANG_CONTROLS_FOR_INPUT_DO,
        Blockly.NEXT_STATEMENT, 'DO');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setInputsInline(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      return Blockly.LANG_CONTROLS_FOR_TOOLTIP_1.replace('%1',
          thisBlock.getInputVariable('VAR'));
    });
  },
  getVars: function() {
    return [this.getInputVariable('VAR')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getInputVariable('VAR'))) {
      this.setInputVariable('VAR', newName);
    }
  }
};

Blockly.Language.controls_forEach = {
  // For each loop.
  category: Blockly.LANG_CATEGORY_CONTROLS,
  helpUrl: Blockly.LANG_CONTROLS_FOREACH_HELPURL,
  init: function() {
    this.setColour(120);
    this.appendTitle(Blockly.LANG_CONTROLS_FOREACH_TITLE_FOREACH);
    this.appendInput(Blockly.LANG_CONTROLS_FOREACH_INPUT_ITEM,
        Blockly.LOCAL_VARIABLE, 'VAR').setText(
        Blockly.LANG_CONTROLS_FOREACH_INPUT_VAR);
    this.appendInput(Blockly.LANG_CONTROLS_FOREACH_INPUT_INLIST,
        Blockly.INPUT_VALUE, 'LIST', Array);
    this.appendInput(Blockly.LANG_CONTROLS_FOREACH_INPUT_DO,
        Blockly.NEXT_STATEMENT, 'DO');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      return Blockly.LANG_CONTROLS_FOREACH_TOOLTIP_1.replace('%1',
          thisBlock.getInputVariable('VAR'));
    });
  },
  getVars: function() {
    return [this.getInputVariable('VAR')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getInputVariable('VAR'))) {
      this.setInputVariable('VAR', newName);
    }
  }
};

Blockly.Language.controls_flow_statements = {
  // Flow statements: continue, break.
  category: Blockly.LANG_CATEGORY_CONTROLS,
  helpUrl: Blockly.LANG_CONTROLS_FLOW_STATEMENTS_HELPURL,
  init: function() {
    this.setColour(120);
    var dropdown = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendTitle(dropdown, 'FLOW');
    this.appendTitle(Blockly.LANG_CONTROLS_FLOW_STATEMENTS_INPUT_OFLOOP);
    this.setPreviousStatement(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var op = thisBlock.getTitleValue('FLOW');
      return Blockly.Language.controls_flow_statements.TOOLTIPS[op];
    });
  },
  onchange: function() {
    if (!this.workspace) {
      // Block has been deleted.
      return;
    }
    var legal = false;
    // Is the block nested in a control statement?
    var block = this;
    do {
      if (block.type == 'controls_forEach' ||
          block.type == 'controls_for' ||
          block.type == 'controls_whileUntil') {
        legal = true;
        break;
      }
      block = block.getSurroundParent();
    } while (block);
    if (legal) {
      this.setWarningText(null);
    } else {
      this.setWarningText(Blockly.LANG_CONTROLS_FLOW_STATEMENTS_WARNING);
    }
  }
};

Blockly.Language.controls_flow_statements.OPERATORS =
    [[Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_BREAK, 'BREAK'],
     [Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_CONTINUE, 'CONTINUE']];

Blockly.Language.controls_flow_statements.TOOLTIPS = {
  BREAK: Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_BREAK,
  CONTINUE: Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_CONTINUE
};

// Text strings (factored out to make multi-language easier).

/**
 * Due to the frequency of long strings, the 80-column wrap rule need not apply
 * to message files.
 */

// Context menus.
Blockly.MSG_DUPLICATE_BLOCK = 'Duplicate';
Blockly.MSG_REMOVE_COMMENT = 'Remove Comment';
Blockly.MSG_ADD_COMMENT = 'Add Comment';
Blockly.MSG_EXTERNAL_INPUTS = 'External Inputs';
Blockly.MSG_INLINE_INPUTS = 'Inline Inputs';
Blockly.MSG_DELETE_BLOCK = 'Delete Block';
Blockly.MSG_DELETE_X_BLOCKS = 'Delete %1 Blocks';
Blockly.MSG_COLLAPSE_BLOCK = 'Collapse Block';
Blockly.MSG_EXPAND_BLOCK = 'Expand Block';
Blockly.MSG_DISABLE_BLOCK = 'Disable Block';
Blockly.MSG_ENABLE_BLOCK = 'Enable Block';
Blockly.MSG_HELP = 'Help';

// Variable renaming.
Blockly.MSG_CHANGE_VALUE_TITLE = 'Change value:';
Blockly.MSG_NEW_VARIABLE = 'New variable...';
Blockly.MSG_NEW_VARIABLE_TITLE = 'New variable name:';
Blockly.MSG_RENAME_VARIABLE = 'Rename variable...';
Blockly.MSG_RENAME_VARIABLE_TITLE = 'Rename all "%1" variables to:';

// Toolbox.
Blockly.MSG_VARIABLE_CATEGORY = 'Variables';
Blockly.MSG_PROCEDURE_CATEGORY = 'Procedures';

// Control Blocks
Blockly.LANG_CATEGORY_CONTROLS = 'Control';
Blockly.LANG_CONTROLS_IF_HELPURL = 'http://code.google.com/p/blockly/wiki/If_Then';
Blockly.LANG_CONTROLS_IF_TOOLTIP_1 = 'If a value is true, then do some statements.';
Blockly.LANG_CONTROLS_IF_TOOLTIP_2 = 'If a value is true, then do the first block of statements.\n' +
               'Otherwise, do the second block of statements.';
Blockly.LANG_CONTROLS_IF_TOOLTIP_3 = 'If the first value is true, then do the first block of statements.\n' +
               'Otherwise, if the second value is true, do the second block of statements.';
Blockly.LANG_CONTROLS_IF_TOOLTIP_4 = 'If the first value is true, then do the first block of statements.\n' +
               'Otherwise, if the second value is true, do the second block of statements.\n' +
               'If none of the values are true, do the last block of statements.';
Blockly.LANG_CONTROLS_IF_MSG_IF = 'if';
Blockly.LANG_CONTROLS_IF_MSG_ELSEIF = 'else if';
Blockly.LANG_CONTROLS_IF_MSG_ELSE = 'else';
Blockly.LANG_CONTROLS_IF_MSG_THEN = 'then';

Blockly.LANG_CONTROLS_IF_IF_TITLE_IF = 'if';
Blockly.LANG_CONTROLS_IF_IF_TOOLTIP_1 = 'Add, remove, or reorder sections\n' +
                    'to reconfigure this if block.';

Blockly.LANG_CONTROLS_IF_ELSEIF_TITLE_ELSEIF = 'else if';
Blockly.LANG_CONTROLS_IF_ELSEIF_TOOLTIP_1 = 'Add a condition to the if block.';

Blockly.LANG_CONTROLS_IF_ELSE_TITLE_ELSE = 'else';
Blockly.LANG_CONTROLS_IF_ELSE_TOOLTIP_1 = 'Add a final, catch-all condition to the if block.';

Blockly.LANG_CONTROLS_WHILEUNTIL_HELPURL = 'http://code.google.com/p/blockly/wiki/Repeat';
Blockly.LANG_CONTROLS_WHILEUNTIL_TITLE_REPEAT= 'repeat';
Blockly.LANG_CONTROLS_WHILEUNTIL_INPUT_DO = 'do';
Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_WHILE = 'while';
Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_UNTIL = 'until';
Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_WHILE = 'While a value is true, then do some statements.';
Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_UNTIL = 'While a value is false, then do some statements.';

Blockly.LANG_CONTROLS_FOR_HELPURL = 'http://en.wikipedia.org/wiki/For_loop';
Blockly.LANG_CONTROLS_FOR_TITLE_COUNT = 'count';
Blockly.LANG_CONTROLS_FOR_INPUT_WITH = 'with';
Blockly.LANG_CONTROLS_FOR_INPUT_VAR = 'x';
Blockly.LANG_CONTROLS_FOR_INPUT_FROM = 'from';
Blockly.LANG_CONTROLS_FOR_INPUT_TO = 'to';
Blockly.LANG_CONTROLS_FOR_INPUT_DO = 'do';
Blockly.LANG_CONTROLS_FOR_TOOLTIP_1 = 'Count from a start number to an end number.\n' +
    'For each count, set the current count number to\n' +
    'variable "%1", and then do some statements.';        

Blockly.LANG_CONTROLS_FOREACH_HELPURL = 'http://en.wikipedia.org/wiki/For_loop';
Blockly.LANG_CONTROLS_FOREACH_TITLE_FOREACH = 'for each';
Blockly.LANG_CONTROLS_FOREACH_INPUT_ITEM = 'item'; 
Blockly.LANG_CONTROLS_FOREACH_INPUT_VAR = 'x';
Blockly.LANG_CONTROLS_FOREACH_INPUT_INLIST = 'in list';
Blockly.LANG_CONTROLS_FOREACH_INPUT_DO = 'do';
Blockly.LANG_CONTROLS_FOREACH_TOOLTIP_1 = 'For each item in a list, set the item to\n' +
  'variable "%1", and then do some statements.';

Blockly.LANG_CONTROLS_FLOW_STATEMENTS_HELPURL = 'http://en.wikipedia.org/wiki/Control_flow';
Blockly.LANG_CONTROLS_FLOW_STATEMENTS_INPUT_OFLOOP = 'of loop';
Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_BREAK = 'break out';
Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_CONTINUE = 'continue with next iteration';
Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_BREAK = 'Break out of the containing loop.';
Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_CONTINUE = 'Skip the rest of this loop, and\n' +
    'continue with the next iteration.';
Blockly.LANG_CONTROLS_FLOW_STATEMENTS_WARNING = 'Warning:\n' +
    'This block may only\n' +
    'be used within a loop.';

// Logic Blocks.
Blockly.LANG_CATEGORY_LOGIC = 'Logic';
Blockly.LANG_LOGIC_COMPARE_HELPURL = 'http://en.wikipedia.org/wiki/Inequality_(mathematics)';
Blockly.LANG_LOGIC_COMPARE_TOOLTIP_EQ = 'Return true if both inputs equal each other.';
Blockly.LANG_LOGIC_COMPARE_TOOLTIP_NEQ = 'Return true if both inputs are not equal to each other.';
Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LT = 'Return true if the first input is smaller\n' +
      'than the second input.';
Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LTE = 'Return true if the first input is smaller\n' +
       'than or equal to the second input.';
Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GT = 'Return true if the first input is greater\n' +
      'than the second input.';
Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GTE = 'Return true if the first input is greater\n' +
       'than or equal to the second input.';

Blockly.LANG_LOGIC_OPERATION_HELPURL = 'http://code.google.com/p/blockly/wiki/And_Or';
Blockly.LANG_LOGIC_OPERATION_AND = 'and';
Blockly.LANG_LOGIC_OPERATION_OR = 'or';
Blockly.LANG_LOGIC_OPERATION_TOOLTIP_AND = 'Return true if both inputs are true.';
Blockly.LANG_LOGIC_OPERATION_TOOLTIP_OR = 'Return true if either inputs are true.';

Blockly.LANG_LOGIC_NEGATE_HELPURL = 'http://code.google.com/p/blockly/wiki/Not';
Blockly.LANG_LOGIC_NEGATE_INPUT_NOT = 'not';
Blockly.LANG_LOGIC_NEGATE_TOOLTIP_1 = 'Returns true if the input is false.\n' +
                    'Returns false if the input is true.';

Blockly.LANG_LOGIC_BOOLEAN_HELPURL = 'http://code.google.com/p/blockly/wiki/True_False';
Blockly.LANG_LOGIC_BOOLEAN_TRUE = 'true';
Blockly.LANG_LOGIC_BOOLEAN_FALSE = 'false';
Blockly.LANG_LOGIC_BOOLEAN_TOOLTIP_1 = 'Returns either true or false.';

// Math Blocks.
Blockly.LANG_CATEGORY_MATH = 'Math';
Blockly.LANG_MATH_NUMBER_HELPURL = 'http://en.wikipedia.org/wiki/Number';
Blockly.LANG_MATH_NUMBER_TOOLTIP_1 = 'A number.';

Blockly.LANG_MATH_ARITHMETIC_HELPURL = 'http://en.wikipedia.org/wiki/Arithmetic';
Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_ADD = 'Return the sum of the two numbers.';
Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MINUS = 'Return the difference of the two numbers.';
Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MULTIPLY = 'Return the product of the two numbers.';
Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_DIVIDE = 'Return the quotient of the two numbers.';
Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_POWER = 'Return the first number raised to\n' +
    'the power of the second number.';

Blockly.LANG_MATH_CHANGE_HELPURL = 'http://en.wikipedia.org/wiki/Negation';
Blockly.LANG_MATH_CHANGE_TITLE_CHANGE = 'change';
Blockly.LANG_MATH_CHANGE_TITLE_ITEM = 'item';
Blockly.LANG_MATH_CHANGE_INPUT_BY = 'by';
Blockly.LANG_MATH_CHANGE_TOOLTIP_1 = 'Add a number to variable "%1".';

Blockly.LANG_MATH_SINGLE_HELPURL = 'http://en.wikipedia.org/wiki/Square_root';
Blockly.LANG_MATH_SINGLE_OP_ROOT = 'square root';
Blockly.LANG_MATH_SINGLE_OP_ABSOLUTE = 'absolute';
Blockly.LANG_MATH_SINGLE_TOOLTIP_ROOT = 'Return the square root of a number.';
Blockly.LANG_MATH_SINGLE_TOOLTIP_ABS = 'Return the absolute value of a number.';
Blockly.LANG_MATH_SINGLE_TOOLTIP_NEG = 'Return the negation of a number.';
Blockly.LANG_MATH_SINGLE_TOOLTIP_LN = 'Return the natural logarithm of a number.';
Blockly.LANG_MATH_SINGLE_TOOLTIP_LOG10 = 'Return the base 10 logarithm of a number.';
Blockly.LANG_MATH_SINGLE_TOOLTIP_EXP = 'Return e to the power of a number.';
Blockly.LANG_MATH_SINGLE_TOOLTIP_POW10 = 'Return 10 to the power of a number.';

Blockly.LANG_MATH_ROUND_HELPURL = 'http://en.wikipedia.org/wiki/Rounding';
Blockly.LANG_MATH_ROUND_TOOLTIP_1 = 'Round a number up or down.';
Blockly.LANG_MATH_ROUND_OPERATOR_ROUND = 'round';
Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDUP = 'round up';
Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDDOWN = 'round down';

Blockly.LANG_MATH_TRIG_HELPURL = 'http://en.wikipedia.org/wiki/Trigonometric_functions';
Blockly.LANG_MATH_TRIG_TOOLTIP_SIN = 'Return the sine of a degree.';
Blockly.LANG_MATH_TRIG_TOOLTIP_COS = 'Return the cosine of a degree.';
Blockly.LANG_MATH_TRIG_TOOLTIP_TAN = 'Return the tangent of a degree.';
Blockly.LANG_MATH_TRIG_TOOLTIP_ASIN = 'Return the arcsine of a number.';
Blockly.LANG_MATH_TRIG_TOOLTIP_ACOS = 'Return the arccosine of a number.';
Blockly.LANG_MATH_TRIG_TOOLTIP_ATAN = 'Return the arctangent of a number.';

Blockly.LANG_MATH_ONLIST_HELPURL = '';
Blockly.LANG_MATH_ONLIST_INPUT_OFLIST = 'of list';
Blockly.LANG_MATH_ONLIST_OPERATOR_SUM = 'sum'; 
Blockly.LANG_MATH_ONLIST_OPERATOR_MIN = 'min';
Blockly.LANG_MATH_ONLIST_OPERATOR_MAX = 'max';
Blockly.LANG_MATH_ONLIST_OPERATOR_AVERAGE = 'average';
Blockly.LANG_MATH_ONLIST_OPERATOR_MEDIAN = 'median';
Blockly.LANG_MATH_ONLIST_OPERATOR_MODE = 'modes';
Blockly.LANG_MATH_ONLIST_OPERATOR_STD_DEV = 'standard deviation';
Blockly.LANG_MATH_ONLIST_OPERATOR_RANDOM = 'random item';
Blockly.LANG_MATH_ONLIST_TOOLTIP_SUM = 'Return the sum of all the numbers in the list.';
Blockly.LANG_MATH_ONLIST_TOOLTIP_MIN = 'Return the smallest number in the list.';
Blockly.LANG_MATH_ONLIST_TOOLTIP_MAX = 'Return the largest number in the list.';
Blockly.LANG_MATH_ONLIST_TOOLTIP_AVERAGE = 'Return the arithmetic mean of the list.';
Blockly.LANG_MATH_ONLIST_TOOLTIP_MEDIAN = 'Return the median number in the list.';
Blockly.LANG_MATH_ONLIST_TOOLTIP_MODE = 'Return a list of the most common item(s) in the list.';
Blockly.LANG_MATH_ONLIST_TOOLTIP_STD_DEV = 'Return the standard deviation of the list.';
Blockly.LANG_MATH_ONLIST_TOOLTIP_RANDOM = 'Return a random element from the list.';

Blockly.LANG_MATH_CONSTRAIN_HELPURL = 'http://en.wikipedia.org/wiki/Clamping_%28graphics%29';
Blockly.LANG_MATH_CONSTRAIN_INPUT_CONSTRAIN = 'constrain';
Blockly.LANG_MATH_CONSTRAIN_INPUT_LOW = 'between (low)';
Blockly.LANG_MATH_CONSTRAIN_INPUT_HIGH = 'and (high)';
Blockly.LANG_MATH_CONSTRAIN_TOOLTIP_1 = 'Constrain a number to be between the specified limits (inclusive).';

Blockly.LANG_MATH_MODULO_HELPURL = 'http://en.wikipedia.org/wiki/Modulo_operation';
Blockly.LANG_MATH_MODULO_INPUT_DIVIDEND = 'remainder of';
Blockly.LANG_MATH_MODULO_TOOLTIP_1 = 'Return the remainder of dividing both numbers.';

Blockly.LANG_MATH_RANDOM_INT_HELPURL = 'http://en.wikipedia.org/wiki/Random_number_generation';
Blockly.LANG_MATH_RANDOM_INT_TITLE_RANDOM = 'random integer';
Blockly.LANG_MATH_RANDOM_INT_INPUT_FROM = 'from';
Blockly.LANG_MATH_RANDOM_INT_INPUT_TO = 'to';
Blockly.LANG_MATH_RANDOM_INT_TOOLTIP_1 = 'Return a random integer between the two\n' +
    'specified limits, inclusive.';

Blockly.LANG_MATH_RANDOM_FLOAT_HELPURL = 'http://en.wikipedia.org/wiki/Random_number_generation';
Blockly.LANG_MATH_RANDOM_FLOAT_TITLE_RANDOM = 'random fraction';
Blockly.LANG_MATH_RANDOM_FLOAT_TOOLTIP_1 = 'Return a random fraction between\n' +
    '0.0 (inclusive) and 1.0 (exclusive).';

// Text Blocks.
Blockly.LANG_CATEGORY_TEXT = 'Text';
Blockly.LANG_TEXT_TEXT_HELPURL = 'http://en.wikipedia.org/wiki/String_(computer_science)';
Blockly.LANG_TEXT_TEXT_TOOLTIP_1 = 'A letter, word, or line of text.';

Blockly.LANG_TEXT_JOIN_HELPURL = '';
Blockly.LANG_TEXT_JOIN_TITLE_CREATEWITH = 'create text with';
Blockly.LANG_TEXT_JOIN_TOOLTIP_1 = 'Create a piece of text by joining\n' +
                    'together any number of items.';

Blockly.LANG_TEXT_CREATE_JOIN_TITLE_JOIN = 'join';
Blockly.LANG_TEXT_CREATE_JOIN_TOOLTIP_1 = 'Add, remove, or reorder sections to reconfigure this text block.';

Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TITLE_ITEM = 'item';
Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TOOLTIP_1 = 'Add an item to the text.';

Blockly.LANG_TEXT_LENGTH_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html'; 
Blockly.LANG_TEXT_LENGTH_INPUT_LENGTH = 'length';
Blockly.LANG_TEXT_LENGTH_TOOLTIP_1 = 'Returns number of letters (including spaces)\n' +
                    'in the provided text.';
                    
Blockly.LANG_TEXT_ISEMPTY_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html';
Blockly.LANG_TEXT_ISEMPTY_INPUT_ISEMPTY = 'is empty';
Blockly.LANG_TEXT_ISEMPTY_TOOLTIP_1 = 'Returns true if the provided text is empty.';

Blockly.LANG_TEXT_ENDSTRING_HELPURL = 'http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm';
Blockly.LANG_TEXT_ENDSTRING_INPUT = 'letters in text';
Blockly.LANG_TEXT_ENDSTRING_TOOLTIP_1 = 'Returns specified number of letters at the beginning or end of the text.';
Blockly.LANG_TEXT_ENDSTRING_OPERATOR_FIRST = 'first';
Blockly.LANG_TEXT_ENDSTRING_OPERATOR_LAST = 'last';

Blockly.LANG_TEXT_INDEXOF_HELPURL = 'http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm';
Blockly.LANG_TEXT_INDEXOF_TITLE_FIND = 'find';
Blockly.LANG_TEXT_INDEXOF_INPUT_OCCURRENCE = 'occurrence of text';
Blockly.LANG_TEXT_INDEXOF_INPUT_INTEXT = 'in text';
Blockly.LANG_TEXT_INDEXOF_TOOLTIP_1 = 'Returns the index of the first/last occurrence\n' +
                    'of first text in the second text.\n' +
                    'Returns 0 if text is not found.';
Blockly.LANG_TEXT_INDEXOF_OPERATOR_FIRST = 'first';
Blockly.LANG_TEXT_INDEXOF_OPERATOR_LAST = 'last';

Blockly.LANG_TEXT_CHARAT_HELPURL = 'http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm'
Blockly.LANG_TEXT_CHARAT_TITLE_LETTER = 'letter';
Blockly.LANG_TEXT_CHARAT_INPUT_AT = 'at';
Blockly.LANG_TEXT_CHARAT_INPUT_INTEXT = 'in text';
Blockly.LANG_TEXT_CHARAT_TOOLTIP_1 = 'Returns the letter at the specified position.';

Blockly.LANG_TEXT_CHANGECASE_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html';
Blockly.LANG_TEXT_CHANGECASE_TITLE_TO = 'to';
Blockly.LANG_TEXT_CHANGECASE_TOOLTIP_1 = 'Return a copy of the text in a different case.';
Blockly.LANG_TEXT_CHANGECASE_OPERATOR_UPPERCASE = 'UPPER CASE';
Blockly.LANG_TEXT_CHANGECASE_OPERATOR_LOWERCASE = 'lower case';
Blockly.LANG_TEXT_CHANGECASE_OPERATOR_TITLECASE = 'Title Case';

Blockly.LANG_TEXT_TRIM_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html';
Blockly.LANG_TEXT_TRIM_TITLE_SPACE = 'trim spaces from';
Blockly.LANG_TEXT_TRIM_TITLE_SIDES = 'sides';
Blockly.LANG_TEXT_TRIM_TOOLTIP_1 = 'Return a copy of the text with spaces\n' +
                    'removed from one or both ends.';
Blockly.LANG_TEXT_TRIM_TITLE_SIDES = 'sides';
Blockly.LANG_TEXT_TRIM_TITLE_SIDE = 'side';
Blockly.LANG_TEXT_TRIM_OPERATOR_BOTH = 'both';
Blockly.LANG_TEXT_TRIM_OPERATOR_LEFT = 'left';
Blockly.LANG_TEXT_TRIM_OPERATOR_RIGHT = 'right';

Blockly.LANG_TEXT_PRINT_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html';
Blockly.LANG_TEXT_PRINT_TITLE_PRINT = 'print';
Blockly.LANG_TEXT_PRINT_TOOLTIP_1 = 'Print the specified text, number or other value.';

Blockly.LANG_TEXT_PROMPT_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode92.html';
Blockly.LANG_TEXT_PROMPT_TITLE_PROMPT_FOR = 'prompt for';
Blockly.LANG_TEXT_PROMPT_TITILE_WITH_MESSAGE = 'with message';
Blockly.LANG_TEXT_PROMPT_TOOLTIP_1 = 'Prompt for user input with the specified text.';
Blockly.LANG_TEXT_PROMPT_TYPE_TEXT = 'text';
Blockly.LANG_TEXT_PROMPT_TYPE_NUMBER = 'number';

// Lists Blocks.
Blockly.LANG_CATEGORY_LISTS = 'Lists';
Blockly.LANG_LISTS_CREATE_EMPTY_HELPURL = 'http://en.wikipedia.org/wiki/Linked_list#Empty_lists';
Blockly.LANG_LISTS_CREATE_EMPTY_TITLE_1 = 'create empty list';
Blockly.LANG_LISTS_CREATE_EMPTY_TOOLTIP_1 = 'Returns a list, of length 0, containing no data records';

Blockly.LANG_LISTS_CREATE_WITH_INPUT_WITH = 'create list with';
Blockly.LANG_LISTS_CREATE_WITH_TOOLTIP_1 = 'Create a list with any number of items.';

Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TITLE_ADD = 'list';
Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TOOLTIP_1 = 'Add, remove, or reorder sections to reconfigure this list block.';

Blockly.LANG_LISTS_CREATE_WITH_ITEM_TITLE = 'item';
Blockly.LANG_LISTS_CREATE_WITH_ITEM_TOOLTIP_1 = 'Add an item to the list.';

Blockly.LANG_LISTS_REPEAT_HELPURL = 'http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm';
Blockly.LANG_LISTS_REPEAT_TITLE_CREATELIST = 'create list';
Blockly.LANG_LISTS_REPEAT_INPUT_WITH = 'with item';
Blockly.LANG_LISTS_REPEAT_INPIT_REPEATED = 'repeated';
Blockly.LANG_LISTS_REPEAT_INPIT_TIMES = 'times';
Blockly.LANG_LISTS_REPEAT_TOOLTIP_1 = 'Creates a list consisting of the given value\n' +
                    'repeated the specified number of times.';

Blockly.LANG_LISTS_LENGTH_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html';
Blockly.LANG_LISTS_LENGTH_INPUT_LENGTH = 'length';
Blockly.LANG_LISTS_LENGTH_TOOLTIP_1 = 'Returns the length of a list.';

Blockly.LANG_LISTS_IS_EMPTY_HELPURL = 'http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html';
Blockly.LANG_LISTS_INPUT_IS_EMPTY = 'is empty';
Blockly.LANG_LISTS_TOOLTIP_1 = 'Returns true if the list is empty.';

Blockly.LANG_LISTS_INDEX_OF_HELPURL = 'http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm';
Blockly.LANG_LISTS_INDEX_OF_TITLE_FIND = 'find';
Blockly.LANG_LISTS_INDEX_OF_INPUT_OCCURRENCE = 'occurrence of item';
Blockly.LANG_LISTS_INDEX_OF_INPUT_IN_LIST = 'in list';
Blockly.LANG_LISTS_INDEX_OF_TOOLTIP_1 = 'Returns the index of the first/last occurrence\n' +
                    'of the item in the list.\n' +
                    'Returns 0 if text is not found.';
Blockly.LANG_LISTS_INDEX_OF_FIRST = 'first';
Blockly.LANG_LISTS_INDEX_OF_LAST = 'last';

Blockly.LANG_LISTS_GET_INDEX_HELPURL = 'http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm';
Blockly.LANG_LISTS_GET_INDEX_TITLE = 'get item';
Blockly.LANG_LISTS_GET_INDEX_INPUT_AT = 'at';
Blockly.LANG_LISTS_GET_INDEX_INPUT_IN_LIST = 'in list';
Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_1 = 'Returns the value at the specified position in a list.';

Blockly.LANG_LISTS_SET_INDEX_HELPURL = 'http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm';
Blockly.LANG_LISTS_SET_INDEX_TITLE = 'set item';
Blockly.LANG_LISTS_SET_INDEX_INPUT_AT = 'at';
Blockly.LANG_LISTS_SET_INDEX_INPUT_IN_LIST = 'in list';
Blockly.LANG_LISTS_SET_INDEX_INPUT_TO = 'to';
Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_1 = 'Sets the value at the specified position in a list.';

// Variables Blocks.
Blockly.LANG_VARIABLES_GET_HELPURL = 'http://en.wikipedia.org/wiki/Variable_(computer_science)';
Blockly.LANG_VARIABLES_GET_TITLE_1 = 'get';
Blockly.LANG_VARIABLES_GET_ITEM = 'item';
Blockly.LANG_VARIABLES_GET_TOOLTIP_1 = 'Returns the value of this variable.';

Blockly.LANG_VARIABLES_SET_HELPURL = 'http://en.wikipedia.org/wiki/Variable_(computer_science)';
Blockly.LANG_VARIABLES_SET_TITLE_1 = 'set';
Blockly.LANG_VARIABLES_SET_ITEM = 'item';
Blockly.LANG_VARIABLES_SET_TOOLTIP_1 = 'Sets this variable to be equal to the input.';

// Procedures Blocks.
Blockly.LANG_PROCEDURES_DEFNORETURN_HELPURL = 'http://en.wikipedia.org/wiki/Procedure_%28computer_science%29';
Blockly.LANG_PROCEDURES_DEFNORETURN_PROCEDURE = 'procedure';
Blockly.LANG_PROCEDURES_DEFNORETURN_DO = 'do';
Blockly.LANG_PROCEDURES_DEFNORETURN_TOOLTIP_1 = 'A procedure with no return value.';

Blockly.LANG_PROCEDURES_DEFRETURN_HELPURL = 'http://en.wikipedia.org/wiki/Procedure_%28computer_science%29';
Blockly.LANG_PROCEDURES_DEFRETURN_PROCEDURE = Blockly.LANG_PROCEDURES_DEFNORETURN_PROCEDURE;
Blockly.LANG_PROCEDURES_DEFRETURN_DO = Blockly.LANG_PROCEDURES_DEFNORETURN_DO;
Blockly.LANG_PROCEDURES_DEFRETURN_RETURN = 'return';
Blockly.LANG_PROCEDURES_DEFRETURN_TOOLTIP_1 = 'A procedure with a return value.';

Blockly.LANG_PROCEDURES_DEF_DUPLICATE_WARNING = 'Warning:\n' +
    'This procedure has\n' +
    'duplicate parameters.';

Blockly.LANG_PROCEDURES_CALLNORETURN_HELPURL = 'http://en.wikipedia.org/wiki/Procedure_%28computer_science%29';
Blockly.LANG_PROCEDURES_CALLNORETURN_CALL = 'call';
Blockly.LANG_PROCEDURES_CALLNORETURN_PROCEDURE = 'procedure';
Blockly.LANG_PROCEDURES_CALLNORETURN_TOOLTIP_1 = 'Call a procedure with no return value.';

Blockly.LANG_PROCEDURES_CALLRETURN_HELPURL = 'http://en.wikipedia.org/wiki/Procedure_%28computer_science%29';
Blockly.LANG_PROCEDURES_CALLRETURN_CALL = Blockly.LANG_PROCEDURES_CALLNORETURN_CALL;
Blockly.LANG_PROCEDURES_CALLRETURN_PROCEDURE = Blockly.LANG_PROCEDURES_CALLNORETURN_PROCEDURE;
Blockly.LANG_PROCEDURES_CALLRETURN_TOOLTIP_1 = 'Call a procedure with a return value.';

Blockly.LANG_PROCEDURES_MUTATORCONTAINER_TITLE = 'parameters';
Blockly.LANG_PROCEDURES_MUTATORARG_TITLE = 'variable:';

Blockly.LANG_PROCEDURES_HIGHLIGHT_DEF = 'Highlight Procedure';



/**
 * @fileoverview Generating JavaScript for variable blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

Blockly.JavaScript.variables_get = function() {
  // Variable getter.
  var code = Blockly.JavaScript.variableDB_.getName(this.getTitleText('VAR'),
      Blockly.Variables.NAME_TYPE);
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript.variables_set = function() {
  // Variable setter.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'VALUE',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  var varName = Blockly.JavaScript.variableDB_.getName(
      this.getTitleText('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' = ' + argument0 + ';\n';
};



/**
 * @fileoverview Generating JavaScript for procedure blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

Blockly.JavaScript.procedures_defreturn = function() {
  // Define a procedure with a return value.
  var funcName = Blockly.JavaScript.variableDB_.getName(
      this.getTitleText('NAME'), Blockly.Procedures.NAME_TYPE);
  var branch = Blockly.JavaScript.statementToCode(this, 'STACK');
  var returnValue = Blockly.JavaScript.valueToCode(this, 'RETURN',
      Blockly.JavaScript.ORDER_NONE) || '';
  if (returnValue) {
    returnValue = '  return ' + returnValue + ';\n';
  }
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.JavaScript.variableDB_.getName(this.arguments_[x],
        Blockly.Variables.NAME_TYPE);
  }
  var code = 'function ' + funcName + '(' + args.join(', ') + ') {\n' +
      branch + returnValue + '}\n';
  code = Blockly.JavaScript.scrub_(this, code);
  Blockly.JavaScript.definitions_[funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.JavaScript.procedures_defnoreturn =
    Blockly.JavaScript.procedures_defreturn;

Blockly.JavaScript.procedures_callreturn = function() {
  // Call a procedure with a return value.
  var funcName = Blockly.JavaScript.variableDB_.getName(
      this.getTitleText('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.JavaScript.valueToCode(this, 'ARG' + x,
        Blockly.JavaScript.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.procedures_callnoreturn = function() {
  // Call a procedure with no return value.
  var funcName = Blockly.JavaScript.variableDB_.getName(
      this.getTitleText('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.JavaScript.valueToCode(this, 'ARG' + x,
        Blockly.JavaScript.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ');\n';
  return code;
};


/**
 * @fileoverview Generating JavaScript for math blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

Blockly.JavaScript.math_number = function() {
  // Numeric value.
  var code = parseFloat(this.getTitleText('NUM'));
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript.math_arithmetic = function() {
  // Basic arithmetic operators, and power.
  var mode = this.getTitleValue('OP');
  var tuple = Blockly.JavaScript.math_arithmetic.OPERATORS[mode];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.JavaScript.valueToCode(this, 'A', order) || '0';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'B', order) || '0';
  var code;
  if (!operator) {
    code = 'Math.pow(' + argument0 + ', ' + argument1 + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.JavaScript.math_arithmetic.OPERATORS = {
  ADD: [' + ', Blockly.JavaScript.ORDER_ADDITION],
  MINUS: [' - ', Blockly.JavaScript.ORDER_SUBTRACTION],
  MULTIPLY: [' * ', Blockly.JavaScript.ORDER_MULTIPLICATION],
  DIVIDE: [' / ', Blockly.JavaScript.ORDER_DIVISION],
  POWER: [null, Blockly.JavaScript.ORDER_COMMA]
};

Blockly.JavaScript.math_change = function() {
  // Add to a variable in place.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'DELTA',
      Blockly.JavaScript.ORDER_ADDITION) || '0';
  var varName = Blockly.JavaScript.variableDB_.getName(this.getTitleText('VAR'),
      Blockly.Variables.NAME_TYPE);
  return varName + ' = (typeof ' + varName + ' == \'number\' ? ' + varName +
      ' : 0) + ' + argument0 + ';\n';
};

Blockly.JavaScript.math_single = function() {
  // Math operators with single operand.
  var operator = this.getTitleValue('OP');
  var code;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedents.
    var argument = Blockly.JavaScript.valueToCode(this, 'NUM',
        Blockly.JavaScript.ORDER_UNARY_NEGATION) || '0';
    if (argument.charAt(0) == '-') {
      // --3 is not legal in JS.
      argument = ' ' + argument;
    }
    code = '-' + argument;
    return [code, Blockly.JavaScript.ORDER_UNARY_NEGATION];
  }
  var argNaked = Blockly.JavaScript.valueToCode(this, 'NUM',
      Blockly.JavaScript.ORDER_NONE) || '0';
  var argParen = Blockly.JavaScript.valueToCode(this, 'NUM',
      Blockly.JavaScript.ORDER_DIVISION) || '0';
  // First, handle cases which generate values that don't need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ABS':
      code = 'Math.abs(' + argNaked + ')';
      break;
    case 'ROOT':
      code = 'Math.sqrt(' + argNaked + ')';
      break;
    case 'LN':
      code = 'Math.log(' + argNaked + ')';
      break;
    case 'EXP':
      code = 'Math.exp(' + argNaked + ')';
      break;
    case '10POW':
      code = 'Math.pow(10,' + argNaked + ')';
      break;
    case 'ROUND':
      code = 'Math.round(' + argNaked + ')';
      break;
    case 'ROUNDUP':
      code = 'Math.ceil(' + argNaked + ')';
      break;
    case 'ROUNDDOWN':
      code = 'Math.floor(' + argNaked + ')';
      break;
    case 'SIN':
      code = 'Math.sin(' + argParen + ' / 180 * Math.PI)';
      break;
    case 'COS':
      code = 'Math.cos(' + argParen + ' / 180 * Math.PI)';
      break;
    case 'TAN':
      code = 'Math.tan(' + argParen + ' / 180 * Math.PI)';
      break;
  }
  if (code) {
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  }
  // Second, handle cases which generate values that may need parentheses
  // wrapping the code.
  switch (operator) {
    case 'LOG10':
      code = 'Math.log(' + argNaked + ') / Math.log(10)';
      break;
    case 'ASIN':
      code = 'Math.asin(' + argNaked + ') / Math.PI * 180';
      break;
    case 'ACOS':
      code = 'Math.acos(' + argNaked + ') / Math.PI * 180';
      break;
    case 'ATAN':
      code = 'Math.atan(' + argNaked + ') / Math.PI * 180';
      break;
    default:
      throw 'Unknown math operator.';
  }
  return [code, Blockly.JavaScript.ORDER_DIVISION];
};

// Rounding functions have a single operand.
Blockly.JavaScript.math_round = Blockly.JavaScript.math_single;
// Trigonometry functions have a single operand.
Blockly.JavaScript.math_trig = Blockly.JavaScript.math_single;

Blockly.JavaScript.math_on_list = function() {
  // Math functions for lists.
  var func = this.getTitleValue('OP');
  var list, code;
  switch (func) {
    case 'SUM':
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_MEMBER) || '[]';
      code = list + '.reduce(function(x, y) {return x + y;})';
      break;
    case 'MIN':
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_COMMA) || '[]';
      code = 'Math.min.apply(null, ' + list + ')';
      break;
    case 'MAX':
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_COMMA) || '[]';
      code = 'Math.max.apply(null, ' + list + ')';
      break;
    case 'AVERAGE':
      // math_median([null,null,1,3]) == 2.0.
      if (!Blockly.JavaScript.definitions_['math_mean']) {
        var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
            'math_mean', Blockly.Generator.NAME_TYPE);
        Blockly.JavaScript.math_on_list.math_mean = functionName;
        var func = [];
        func.push('function ' + functionName + '(myList) {');
        func.push('  return myList.reduce(function(x, y) {return x + y;}) / ' +
                  'myList.length;');
        func.push('}');
        Blockly.JavaScript.definitions_['math_mean'] = func.join('\n');
      }
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_NONE) || '[]';
      code = Blockly.JavaScript.math_on_list.math_mean + '(' + list + ')';
      break;
    case 'MEDIAN':
      // math_median([null,null,1,3]) == 2.0.
      if (!Blockly.JavaScript.definitions_['math_median']) {
        var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
            'math_median', Blockly.Generator.NAME_TYPE);
        Blockly.JavaScript.math_on_list.math_median = functionName;
        var func = [];
        func.push('function ' + functionName + '(myList) {');
        func.push('  var localList = myList.filter(function (x) ' +
                  '{return typeof x == \'number\';});');
        func.push('  if (!localList.length) return null;');
        func.push('  localList.sort(function(a, b) {return b - a;});');
        func.push('  if (localList.length % 2 == 0) {');
        func.push('    return (localList[localList.length / 2 - 1] + ' +
                  'localList[localList.length / 2]) / 2;');
        func.push('  } else {');
        func.push('    return localList[(localList.length - 1) / 2];');
        func.push('  }');
        func.push('}');
        Blockly.JavaScript.definitions_['math_median'] = func.join('\n');
      }
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_NONE) || '[]';
      code = Blockly.JavaScript.math_on_list.math_median + '(' + list + ')';
      break;
    case 'MODE':
      if (!Blockly.JavaScript.definitions_['math_modes']) {
        var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
            'math_modes', Blockly.Generator.NAME_TYPE);
        Blockly.JavaScript.math_on_list.math_modes = functionName;
        // As a list of numbers can contain more than one mode,
        // the returned result is provided as an array.
        // Mode of [3, 'x', 'x', 1, 1, 2, '3'] -> ['x', 1].
        var func = [];
        func.push('function ' + functionName + '(values) {');
        func.push('  var modes = [];');
        func.push('  var counts = [];');
        func.push('  var maxCount = 0;');
        func.push('  for (var i = 0; i < values.length; i++) {');
        func.push('    var value = values[i];');
        func.push('    var found = false;');
        func.push('    var thisCount;');
        func.push('    for (var j = 0; j < counts.length; j++) {');
        func.push('      if (counts[j][0] === value) {');
        func.push('        thisCount = ++counts[j][1];');
        func.push('        found = true;');
        func.push('        break;');
        func.push('      }');
        func.push('    }');
        func.push('    if (!found) {');
        func.push('      counts.push([value, 1]);');
        func.push('      thisCount = 1;');
        func.push('    }');
        func.push('    maxCount = Math.max(thisCount, maxCount);');
        func.push('  }');
        func.push('  for (var j = 0; j < counts.length; j++) {');
        func.push('    if (counts[j][1] == maxCount) {');
        func.push('        modes.push(counts[j][0]);');
        func.push('    }');
        func.push('  }');
        func.push('  return modes;');
        func.push('}');
        Blockly.JavaScript.definitions_['math_modes'] = func.join('\n');
      }
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_NONE) || '[]';
      code = Blockly.JavaScript.math_on_list.math_modes + '(' + list + ')';
      break;
    case 'STD_DEV':
      if (!Blockly.JavaScript.definitions_['math_standard_deviation']) {
        var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
            'math_standard_deviation', Blockly.Generator.NAME_TYPE);
        Blockly.JavaScript.math_on_list.math_standard_deviation = functionName;
        var func = [];
        func.push('function ' + functionName + '(numbers) {');
        func.push('  var n = numbers.length;');
        func.push('  if (!n) return null;');
        func.push('  var mean = numbers.reduce(function(x, y) ' +
                  '{return x + y;}) / n;');
        func.push('  var variance = 0;');
        func.push('  for (var j = 0; j < n; j++) {');
        func.push('    variance += Math.pow(numbers[j] - mean, 2);');
        func.push('  }');
        func.push('  variance = variance / n;');
        func.push('  standard_dev = Math.sqrt(variance);');
        func.push('  return standard_dev;');
        func.push('}');
        Blockly.JavaScript.definitions_['math_standard_deviation'] =
            func.join('\n');
      }
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_NONE) || '[]';
      code = Blockly.JavaScript.math_on_list.math_standard_deviation +
          '(' + list + ')';
      break;
    case 'RANDOM':
      if (!Blockly.JavaScript.definitions_['math_random_item']) {
        var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
            'math_random_item', Blockly.Generator.NAME_TYPE);
        Blockly.JavaScript.math_on_list.math_random_item = functionName;
        var func = [];
        func.push('function ' + functionName + '(list) {');
        func.push('  var x = Math.floor(Math.random() * list.length);');
        func.push('  return list[x];');
        func.push('}');
        Blockly.JavaScript.definitions_['math_random_item'] = func.join('\n');
      }
      list = Blockly.JavaScript.valueToCode(this, 'LIST',
          Blockly.JavaScript.ORDER_NONE) || '[]';
      code = Blockly.JavaScript.math_on_list.math_random_item +
          '(' + list + ')';
      break;
    default:
      throw 'Unknown operator.';
  }
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.math_constrain = function() {
  // Constrain a number between two limits.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'VALUE',
      Blockly.JavaScript.ORDER_COMMA) || '0';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'LOW',
      Blockly.JavaScript.ORDER_COMMA) || '0';
  var argument2 = Blockly.JavaScript.valueToCode(this, 'HIGH',
      Blockly.JavaScript.ORDER_COMMA) || '0';
  var code = 'Math.min(Math.max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.math_modulo = function() {
  // Remainder computation.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'DIVIDEND',
      Blockly.JavaScript.ORDER_MODULUS) || '0';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'DIVISOR',
      Blockly.JavaScript.ORDER_MODULUS) || '0';
  var code = argument0 + ' % ' + argument1;
  return [code, Blockly.JavaScript.ORDER_MODULUS];
};

Blockly.JavaScript.math_random_int = function() {
  // Random integer between [X] and [Y].
  var argument0 = Blockly.JavaScript.valueToCode(this, 'FROM',
      Blockly.JavaScript.ORDER_COMMA) || '0';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'TO',
      Blockly.JavaScript.ORDER_COMMA) || '0';
  if (!Blockly.JavaScript.definitions_['math_random_int']) {
    var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
        'math_random_int', Blockly.Generator.NAME_TYPE);
    Blockly.JavaScript.math_random_int.random_function = functionName;
    var func = [];
    func.push('function ' + functionName + '(a, b) {');
    func.push('  if (a > b) {');
    func.push('    // Swap a and b to ensure a is smaller.');
    func.push('    var c = a;');
    func.push('    a = b;');
    func.push('    b = c;');
    func.push('  }');
    func.push('  return Math.floor(Math.random() * (b - a + 1) + a);');
    func.push('}');
    Blockly.JavaScript.definitions_['math_random_int'] = func.join('\n');
  }
  code = Blockly.JavaScript.math_random_int.random_function +
      '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.math_random_float = function() {
  // Random fraction between 0 and 1.
  return ['Math.random()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
};


/**
 * @fileoverview Generating JavaScript for logic blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

Blockly.JavaScript.logic_compare = function() {
  // Comparison operator.
  var mode = this.getTitleValue('OP');
  var operator = Blockly.JavaScript.logic_compare.OPERATORS[mode];
  var order = (operator == '==' || operator == '!=') ?
      Blockly.JavaScript.ORDER_EQUALITY : Blockly.JavaScript.ORDER_RELATIONAL;
  var argument0 = Blockly.JavaScript.valueToCode(this, 'A', order) || '0';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.JavaScript.logic_compare.OPERATORS = {
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>='
};

Blockly.JavaScript.logic_operation = function() {
  // Operations 'and', 'or'.
  var operator = (this.getTitleValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.JavaScript.ORDER_LOGICAL_AND :
      Blockly.JavaScript.ORDER_LOGICAL_OR;
  var argument0 = Blockly.JavaScript.valueToCode(this, 'A', order) || 'false';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'B', order) || 'false';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.JavaScript.logic_negate = function() {
  // Negation.
  var order = Blockly.JavaScript.ORDER_LOGICAL_NOT;
  var argument0 = Blockly.JavaScript.valueToCode(this, 'BOOL', order) ||
      'false';
  var code = '!' + argument0;
  return [code, order];
};

Blockly.JavaScript.logic_boolean = function() {
  // Boolean values true and false.
  var code = (this.getTitleValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};


/**
 * @fileoverview Generating JavaScript for list blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

Blockly.JavaScript.lists_create_empty = function() {
  // Create an empty list.
  return ['[]', Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript.lists_create_with = function() {
  // Create a list with any number of elements of any type.
  var code = new Array(this.itemCount_);
  for (var n = 0; n < this.itemCount_; n++) {
    code[n] = Blockly.JavaScript.valueToCode(this, 'ADD' + n,
        Blockly.JavaScript.ORDER_COMMA) || 'null';
  }
  code = '[' + code.join(', ') + ']';
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript.lists_repeat = function() {
  // Create a list with one element repeated.
  if (!Blockly.JavaScript.definitions_['lists_repeat']) {
    // Function copied from Closure's goog.array.repeat.
    var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
        'lists_repeat', Blockly.Generator.NAME_TYPE);
    Blockly.JavaScript.lists_repeat.repeat = functionName;
    var func = [];
    func.push('function ' + functionName + '(value, n) {');
    func.push('  var array = [];');
    func.push('  for (var i = 0; i < n; i++) {');
    func.push('    array[i] = value;');
    func.push('  }');
    func.push('  return array;');
    func.push('}');
    Blockly.JavaScript.definitions_['lists_repeat'] = func.join('\n');
  }
  var argument0 = Blockly.JavaScript.valueToCode(this, 'ITEM',
      Blockly.JavaScript.ORDER_COMMA) || 'null';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'NUM',
      Blockly.JavaScript.ORDER_COMMA) || '0';
  var code = Blockly.JavaScript.lists_repeat.repeat +
      '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.lists_length = function() {
  // Testing the length of a list is the same as for a string.
  return Blockly.JavaScript.text_length.call(this);
};

Blockly.JavaScript.lists_isEmpty = function() {
  // Testing a list for being empty is the same as for a string.
  return Blockly.JavaScript.text_isEmpty.call(this);
};

Blockly.JavaScript.lists_indexOf = function() {
  // Searching a list for a value is the same as search for a substring.
  return Blockly.JavaScript.text_indexOf.call(this);
};

Blockly.JavaScript.lists_getIndex = function() {
  // Indexing into a list is the same as indexing into a string.
  return Blockly.JavaScript.text_charAt.call(this);
};

Blockly.JavaScript.lists_setIndex = function() {
  // Set element at index.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'AT',
      Blockly.JavaScript.ORDER_NONE) || '1';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'LIST',
      Blockly.JavaScript.ORDER_MEMBER) || '[]';
  var argument2 = Blockly.JavaScript.valueToCode(this, 'TO',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || 'null';
  // Blockly uses one-based indicies.
  if (argument0.match(/^\d+$/)) {
    // If the index is a naked number, decrement it right now.
    argument0 = parseInt(argument0, 10) - 1;
  } else {
    // If the index is dynamic, decrement it in code.
    argument0 += ' - 1';
  }
  return argument1 + '[' + argument0 + '] = ' + argument2 + ';\n';
};


/**
 * @fileoverview Generating JavaScript for control blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

Blockly.JavaScript.controls_if = function() {
  // If/elseif/else condition.
  var n = 0;
  var argument = Blockly.JavaScript.valueToCode(this, 'IF' + n,
      Blockly.JavaScript.ORDER_NONE) || 'false';
  var branch = Blockly.JavaScript.statementToCode(this, 'DO' + n);
  var code = 'if (' + argument + ') {\n' + branch + '}';
  for (n = 1; n <= this.elseifCount_; n++) {
    argument = Blockly.JavaScript.valueToCode(this, 'IF' + n,
        Blockly.JavaScript.ORDER_NONE) || 'false';
    branch = Blockly.JavaScript.statementToCode(this, 'DO' + n);
    code += ' else if (' + argument + ') {\n' + branch + '}';
  }
  if (this.elseCount_) {
    branch = Blockly.JavaScript.statementToCode(this, 'ELSE');
    code += ' else {\n' + branch + '}';
  }
  return code + '\n';
};

Blockly.JavaScript.controls_whileUntil = function() {
  // Do while/until loop.
  var until = this.getTitleValue('MODE') == 'UNTIL';
  var argument0 = Blockly.JavaScript.valueToCode(this, 'BOOL',
      until ? Blockly.JavaScript.ORDER_LOGICAL_NOT :
      Blockly.JavaScript.ORDER_NONE) || 'false';
  var branch0 = Blockly.JavaScript.statementToCode(this, 'DO');
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while (' + argument0 + ') {\n' + branch0 + '}\n';
};

Blockly.JavaScript.controls_for = function() {
  // For loop.
  var variable0 = Blockly.JavaScript.variableDB_.getName(
      this.getInputVariable('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.JavaScript.valueToCode(this, 'FROM',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'TO',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  var branch0 = Blockly.JavaScript.statementToCode(this, 'DO');
  var code;
  if (argument1.match(/^\w+$/)) {
    code = 'for (' + variable0 + ' = ' + argument0 + '; ' +
                 variable0 + ' <= ' + argument1 + '; ' +
                 variable0 + '++) {\n' +
        branch0 + '}\n';
  } else {
    // The end value appears to be more complicated than a simple variable.
    // Cache it to a variable to prevent repeated look-ups.
    var endVar = Blockly.JavaScript.variableDB_.getDistinctName(
        variable0 + '_end', Blockly.Variables.NAME_TYPE);
    code = 'var ' + endVar + ' = ' + argument1 + ';\n' +
        'for (' + variable0 + ' = ' + argument0 + '; ' +
              variable0 + ' <= ' + endVar + '; ' +
              variable0 + '++) {\n' +
        branch0 + '}\n';
  }
  return code;
};

Blockly.JavaScript.controls_forEach = function() {
  // For each loop.
  var variable0 = Blockly.JavaScript.variableDB_.getName(
      this.getInputVariable('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.JavaScript.valueToCode(this, 'LIST',
      Blockly.JavaScript.ORDER_ASSIGNMENT) || '[]';
  var branch0 = Blockly.JavaScript.statementToCode(this, 'DO');
  var code;
  var indexVar = Blockly.JavaScript.variableDB_.getDistinctName(
      variable0 + '_index', Blockly.Variables.NAME_TYPE);
  if (argument0.match(/^\w+$/)) {
    branch0 = '  ' + variable0 + ' = ' + argument0 + '[' + indexVar + '];\n' +
        branch0;
    code = 'for (var ' + indexVar + ' in  ' + argument0 + ') {\n' +
        branch0 + '}\n';
  } else {
    // The list appears to be more complicated than a simple variable.
    // Cache it to a variable to prevent repeated look-ups.
    var listVar = Blockly.JavaScript.variableDB_.getDistinctName(
        variable0 + '_list', Blockly.Variables.NAME_TYPE);
    branch0 = '  ' + variable0 + ' = ' + listVar + '[' + indexVar + '];\n' +
        branch0;
    code = 'var ' + listVar + ' = ' + argument0 + ';\n' +
        'for (var ' + indexVar + ' in ' + listVar + ') {\n' +
        branch0 + '}\n';
  }
  return code;
};

Blockly.JavaScript.controls_flow_statements = function() {
  // Flow statements: continue, break.
  switch (this.getTitleValue('FLOW')) {
    case 'BREAK':
      return 'break;\n';
    case 'CONTINUE':
      return 'continue;\n';
  }
  throw 'Unknown flow statement.';
};


/**
 * @fileoverview Text blocks for Blockly.
 * @author fraser@google.com (Neil Fraser)
 */

if (!Blockly.Language) Blockly.Language = {};

Blockly.Language.text = {
  // Text value.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_TEXT_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendTitle('\u201C');
    this.appendTitle(new Blockly.FieldTextInput(''), 'TEXT');
    this.appendTitle('\u201D');
    this.setOutput(true, String);
    this.setTooltip(Blockly.LANG_TEXT_TEXT_TOOLTIP_1);
  }
};

Blockly.Language.text_join = {
  // Create a string made up of any number of elements of any type.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_JOIN_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_JOIN_TITLE_CREATEWITH);
    this.appendInput('', Blockly.INPUT_VALUE, 'ADD0', null);
    this.appendInput('', Blockly.INPUT_VALUE, 'ADD1', null);
    this.setOutput(true, String);
    this.setMutator(new Blockly.Mutator(['text_create_join_item']));
    this.setTooltip(Blockly.LANG_TEXT_JOIN_TOOLTIP_1);
    this.itemCount_ = 2;
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  domToMutation: function(xmlElement) {
    for (var x = 0; x < this.itemCount_; x++) {
      this.removeInput('ADD' + x);
    }
    this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    for (var x = 0; x < this.itemCount_; x++) {
      this.appendInput('', Blockly.INPUT_VALUE, 'ADD' + x, null);
    }
  },
  decompose: function(workspace) {
    var containerBlock = new Blockly.Block(workspace,
                                           'text_create_join_container');
    containerBlock.initSvg();
    var connection = containerBlock.inputList[0];
    for (var x = 0; x < this.itemCount_; x++) {
      var itemBlock = new Blockly.Block(workspace, 'text_create_join_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    // Disconnect all input blocks and destroy all inputs.
    for (var x = this.itemCount_ - 1; x >= 0; x--) {
      this.removeInput('ADD' + x);
    }
    this.itemCount_ = 0;
    // Rebuild the block's inputs.
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    while (itemBlock) {
      var input = this.appendInput('', Blockly.INPUT_VALUE,
                                   'ADD' + this.itemCount_, null);
      // Reconnect any child blocks.
      if (itemBlock.valueInput_) {
        input.connect(itemBlock.valueInput_);
      }
      this.itemCount_++;
      itemBlock = itemBlock.nextConnection &&
          itemBlock.nextConnection.targetBlock();
    }
  },
  saveConnections: function(containerBlock) {
    // Store a pointer to any connected child blocks.
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var x = 0;
    while (itemBlock) {
      var input = this.getInput('ADD' + x);
      itemBlock.valueInput_ = input && input.targetConnection;
      x++;
      itemBlock = itemBlock.nextConnection &&
          itemBlock.nextConnection.targetBlock();
    }
  }
};

Blockly.Language.text_create_join_container = {
  // Container.
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_CREATE_JOIN_TITLE_JOIN);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip(Blockly.LANG_TEXT_CREATE_JOIN_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.text_create_join_item = {
  // Add items.
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TITLE_ITEM);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.text_length = {
  // String length.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_LENGTH_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendInput(Blockly.LANG_TEXT_LENGTH_INPUT_LENGTH,
        Blockly.INPUT_VALUE, 'VALUE', [String, Array]);
    this.setOutput(true, Number);
    this.setTooltip(Blockly.LANG_TEXT_LENGTH_TOOLTIP_1);
  }
};

Blockly.Language.text_isEmpty = {
  // Is the string null?
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_ISEMPTY_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendInput(Blockly.LANG_TEXT_ISEMPTY_INPUT_ISEMPTY,
        Blockly.INPUT_VALUE, 'VALUE', [String, Array]);
    this.setOutput(true, Boolean);
    this.setTooltip(Blockly.LANG_TEXT_ISEMPTY_TOOLTIP_1);
  }
};

Blockly.Language.text_endString = {
  // Return a leading or trailing substring.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_ENDSTRING_HELPURL,
  init: function() {
    this.setColour(160);
    this.setOutput(true, String);
    var menu = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([menu, 'END'], Blockly.INPUT_VALUE, 'NUM', Number);
    this.appendInput(Blockly.LANG_TEXT_ENDSTRING_INPUT,
        Blockly.INPUT_VALUE, 'TEXT', String);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_TEXT_ENDSTRING_TOOLTIP_1);
  }
};

Blockly.Language.text_endString.OPERATORS =
    [[Blockly.LANG_TEXT_ENDSTRING_OPERATOR_FIRST, 'FIRST'],
     [Blockly.LANG_TEXT_ENDSTRING_OPERATOR_LAST, 'LAST']];

Blockly.Language.text_indexOf = {
  // Find a substring in the text.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_INDEXOF_HELPURL,
  init: function() {
    this.setColour(160);
    this.setOutput(true, Number);
    this.appendTitle(Blockly.LANG_TEXT_INDEXOF_TITLE_FIND);
    var menu = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendTitle(menu, 'END');
    this.appendInput(Blockly.LANG_TEXT_INDEXOF_INPUT_OCCURRENCE,
        Blockly.INPUT_VALUE, 'FIND', String);
    this.appendInput(Blockly.LANG_TEXT_INDEXOF_INPUT_INTEXT,
        Blockly.INPUT_VALUE, 'VALUE', String);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_TEXT_INDEXOF_TOOLTIP_1);
  }
};

Blockly.Language.text_indexOf.OPERATORS =
    [[Blockly.LANG_TEXT_INDEXOF_OPERATOR_FIRST, 'FIRST'],
     [Blockly.LANG_TEXT_INDEXOF_OPERATOR_LAST, 'LAST']];

Blockly.Language.text_charAt = {
  // Get a character from the string.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_CHARAT_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_CHARAT_TITLE_LETTER);
    this.setOutput(true, String);
    this.appendInput(Blockly.LANG_TEXT_CHARAT_INPUT_AT,
        Blockly.INPUT_VALUE, 'AT', Number);
    this.appendInput(Blockly.LANG_TEXT_CHARAT_INPUT_INTEXT,
        Blockly.INPUT_VALUE, 'VALUE', String);
    this.setInputsInline(true);
    this.setTooltip(Blockly.LANG_TEXT_CHARAT_TOOLTIP_1);
  }
};

Blockly.Language.text_changeCase = {
  // Change capitalization.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_CHANGECASE_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_CHANGECASE_TITLE_TO);
    var menu = new Blockly.FieldDropdown(this.OPERATORS);
    this.appendInput([menu, 'CASE'], Blockly.INPUT_VALUE, 'TEXT', String);
    this.setOutput(true, String);
    this.setTooltip(Blockly.LANG_TEXT_CHANGECASE_TOOLTIP_1);
  }
};

Blockly.Language.text_changeCase.OPERATORS =
    [[Blockly.LANG_TEXT_CHANGECASE_OPERATOR_UPPERCASE, 'UPPERCASE'],
     [Blockly.LANG_TEXT_CHANGECASE_OPERATOR_LOWERCASE, 'LOWERCASE'],
     [Blockly.LANG_TEXT_CHANGECASE_OPERATOR_TITLECASE, 'TITLECASE']];

Blockly.Language.text_trim = {
  // Trim spaces.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_TRIM_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_TRIM_TITLE_SPACE);
    var menu = new Blockly.FieldDropdown(this.OPERATORS, function(text) {
      var newTitle = (text == Blockly.LANG_TEXT_TRIM_OPERATOR_BOTH) ?
          Blockly.LANG_TEXT_TRIM_TITLE_SIDES :
          Blockly.LANG_TEXT_TRIM_TITLE_SIDE;
      this.sourceBlock_.setTitleText(newTitle, 'SIDES');
      this.setText(text);
    });
    this.appendTitle(menu, 'MODE');
    this.appendTitle(Blockly.LANG_TEXT_TRIM_TITLE_SIDES, 'SIDES');
    this.appendInput('', Blockly.INPUT_VALUE, 'TEXT', String);
    this.setOutput(true, String);
    this.setTooltip(Blockly.LANG_TEXT_TRIM_TOOLTIP_1);
  },
  mutationToDom: function() {
    // Save whether the 'sides' title should be plural or singular.
    var container = document.createElement('mutation');
    var plural = (this.getTitleValue('MODE') == 'BOTH');
    container.setAttribute('plural', plural);
    return container;
  },
  domToMutation: function(xmlElement) {
    // Restore the 'sides' title as plural or singular.
    var plural = (xmlElement.getAttribute('plural') == 'true');
    this.setTitleText(plural ? Blockly.LANG_TEXT_TRIM_TITLE_SIDES :
                      Blockly.LANG_TEXT_TRIM_TITLE_SIDE, 'SIDES');
  }
};

Blockly.Language.text_trim.OPERATORS =
    [[Blockly.LANG_TEXT_TRIM_OPERATOR_BOTH, 'BOTH'],
     [Blockly.LANG_TEXT_TRIM_OPERATOR_LEFT, 'LEFT'],
     [Blockly.LANG_TEXT_TRIM_OPERATOR_RIGHT, 'RIGHT']];

Blockly.Language.text_print = {
  // Print statement.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_PRINT_TITLE_PRINT);
    this.appendInput('', Blockly.INPUT_VALUE, 'TEXT', null);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.LANG_TEXT_PRINT_TOOLTIP_1);
  }
};

// text test for CrowdBotBlock
Blockly.Language.text_strobe = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Strobe");
    this.appendInput('LED@', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Strobe");
  }
};
Blockly.Language.text_on = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("On");
    this.appendInput('LED@', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("On");
  }
};
Blockly.Language.text_off = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Off");
    this.appendInput('LED@', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Off");
  }
};
// Servo init, min, max, center, move, sweep
Blockly.Language.servo_init = {
  category: "Motor",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Init");
    this.appendInput('Servo@', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Init Servo");
  }
};
Blockly.Language.servo_move = {
  category: "Motor",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Move");
    this.appendInput('Servo@', Blockly.INPUT_VALUE, 'NUM', Number);
    this.appendInput('to', Blockly.INPUT_VALUE, 'NUM2', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Move Servo");
  }
};
// wait function
Blockly.Language.wait = {
  category: "Arduino",
  helpUrl: Blockly.LANG_CONTROLS_WHILEUNTIL_HELPURL,
  init: function() {
    this.setColour(80);
    this.appendTitle("Wait");
    this.appendInput('for', Blockly.INPUT_VALUE, 'NUM', Number);
    this.appendInput('then', Blockly.NEXT_STATEMENT, 'DO');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Wait");
  }
};
// button / bumper init and callback
Blockly.Language.button = {
  category: "Arduino",
  helpUrl: Blockly.LANG_CONTROLS_WHILEUNTIL_HELPURL,
  init: function() {
    this.setColour(80);
    this.appendTitle("Button");
    this.appendInput('@', Blockly.INPUT_VALUE, 'PIN', Number);
    this.appendInput('Hit:', Blockly.NEXT_STATEMENT, 'HIT');
    this.appendInput('Release:', Blockly.NEXT_STATEMENT, 'RELEASE');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Button");
  }
};
// piezo init and tone
Blockly.Language.piezo_init = {
  category: "Sound",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Init");
    this.appendInput('Piezo@', Blockly.INPUT_VALUE, 'PIN', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Init Piezo");
  }
};
Blockly.Language.piezo_tone = {
  category: "Sound",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Tone");
    this.appendInput('Piezo@', Blockly.INPUT_VALUE, 'PIN', Number);
    this.appendInput('Volume', Blockly.INPUT_VALUE, 'VOL', Number);
    this.appendInput('Time', Blockly.INPUT_VALUE, 'TIME', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Piezo Tone");
  }
};
Blockly.Language.piezo_fade = {
  category: "Sound",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Fade");
    this.appendInput('Piezo@', Blockly.INPUT_VALUE, 'PIN', Number);
    this.appendInput('Volume', Blockly.INPUT_VALUE, 'VOL', Number);
    this.appendInput('Time', Blockly.INPUT_VALUE, 'TIME', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Piezo Fade");
  }
};

Blockly.Language.text_prompt = {
  // Prompt function.
  category: Blockly.LANG_CATEGORY_TEXT,
  helpUrl: Blockly.LANG_TEXT_PROMPT_HELPURL,
  init: function() {
    this.setColour(160);
    this.appendTitle(Blockly.LANG_TEXT_PROMPT_TITLE_PROMPT_FOR);
    var menu = new Blockly.FieldDropdown(this.TYPES);
    this.appendTitle(menu, 'TYPE');
    this.appendTitle(Blockly.LANG_TEXT_PROMPT_TITILE_WITH_MESSAGE);
    this.appendTitle(new Blockly.FieldTextInput(''), 'TEXT');
    this.setOutput(true, [Number, String]);
    this.setTooltip(Blockly.LANG_TEXT_PROMPT_TOOLTIP_1);
  }
};

Blockly.Language.text_prompt.TYPES =
    [[Blockly.LANG_TEXT_PROMPT_TYPE_TEXT, 'TEXT'],
     [Blockly.LANG_TEXT_PROMPT_TYPE_NUMBER, 'NUMBER']];


/**
 * @fileoverview Generating JavaScript for text blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.JavaScript = Blockly.Generator.get('JavaScript');

Blockly.JavaScript.text = function() {
  // Text value.
  var code = Blockly.JavaScript.quote_(this.getTitleText('TEXT'));
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript.text_join = function() {
  // Create a string made up of any number of elements of any type.
  var code;
  if (this.itemCount_ == 0) {
    return ['\'\'', Blockly.JavaScript.ORDER_ATOMIC];
  } else if (this.itemCount_ == 1) {
    var argument0 = Blockly.JavaScript.valueToCode(this, 'ADD0',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    code = 'String(' + argument0 + ')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  } else if (this.itemCount_ == 2) {
    var argument0 = Blockly.JavaScript.valueToCode(this, 'ADD0',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    var argument1 = Blockly.JavaScript.valueToCode(this, 'ADD1',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    code = 'String(' + argument0 + ') + String(' + argument1 + ')';
    return [code, Blockly.JavaScript.ORDER_ADDITION];
  } else {
    code = new Array(this.itemCount_);
    for (var n = 0; n < this.itemCount_; n++) {
      code[n] = Blockly.JavaScript.valueToCode(this, 'ADD' + n,
          Blockly.JavaScript.ORDER_COMMA) || '\'\'';
    }
    code = '[' + code.join(',') + '].join(\'\')';
    return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
  }
};

Blockly.JavaScript.text_length = function() {
  // String length.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'VALUE',
      Blockly.JavaScript.ORDER_FUNCTION_CALL) || '\'\'';
  return [argument0 + '.length', Blockly.JavaScript.ORDER_MEMBER];
};

Blockly.JavaScript.text_isEmpty = function() {
  // Is the string null?
  var argument0 = Blockly.JavaScript.valueToCode(this, 'VALUE',
      Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
  return ['!' + argument0 + '.length', Blockly.JavaScript.ORDER_LOGICAL_NOT];
};

Blockly.JavaScript.text_endString = function() {
  // Return a leading or trailing substring.
  var first = this.getTitleValue('END') == 'FIRST';
  var code;
  if (first) {
    var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM',
        Blockly.JavaScript.ORDER_COMMA) || '1';
    var argument1 = Blockly.JavaScript.valueToCode(this, 'TEXT',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    code = argument1 + '.substring(0, ' + argument0 + ')';
  } else {
    if (!Blockly.JavaScript.definitions_['text_tailString']) {
      var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
          'text_tailString', Blockly.Generator.NAME_TYPE);
      Blockly.JavaScript.text_endString.text_tailString = functionName;
      var func = [];
      func.push('function ' + functionName + '(n, myString) {');
      func.push('  // Return a trailing substring of n characters.');
      func.push('  return myString.substring(myString.length - n);');
      func.push('}');
      Blockly.JavaScript.definitions_['text_tailString'] = func.join('\n');
    }
    var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM',
        Blockly.JavaScript.ORDER_COMMA) || '1';
    var argument1 = Blockly.JavaScript.valueToCode(this, 'TEXT',
        Blockly.JavaScript.ORDER_COMMA) || '\'\'';
    code = Blockly.JavaScript.text_endString.text_tailString +
        '(' + argument0 + ', ' + argument1 + ')';
  }
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.text_indexOf = function() {
  // Search the text for a substring.
  var operator = this.getTitleValue('END') == 'FIRST' ?
      'indexOf' : 'lastIndexOf';
  var argument0 = Blockly.JavaScript.valueToCode(this, 'FIND',
      Blockly.JavaScript.ORDER_NONE) || '\'\'';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'VALUE',
      Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
  var code = argument1 + '.' + operator + '(' + argument0 + ') + 1';
  return [code, Blockly.JavaScript.ORDER_MEMBER];
};

Blockly.JavaScript.text_charAt = function() {
  // Get letter at index.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'AT',
      Blockly.JavaScript.ORDER_NONE) || '1';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'VALUE',
      Blockly.JavaScript.ORDER_MEMBER) || '[]';
  // Blockly uses one-based indicies.
  if (argument0.match(/^\d+$/)) {
    // If the index is a naked number, decrement it right now.
    argument0 = parseInt(argument0, 10) - 1;
  } else {
    // If the index is dynamic, decrement it in code.
    argument0 += ' - 1';
  }
  var code = argument1 + '[' + argument0 + ']';
  return [code, Blockly.JavaScript.ORDER_MEMBER];
};

Blockly.JavaScript.text_changeCase = function() {
  // Change capitalization.
  var mode = this.getTitleValue('CASE');
  var operator = Blockly.JavaScript.text_changeCase.OPERATORS[mode];
  var code;
  if (operator) {
    // Upper and lower case are functions built into JavaScript.
    var argument0 = Blockly.JavaScript.valueToCode(this, 'TEXT',
        Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
    code = argument0 + operator;
  } else {
    if (!Blockly.JavaScript.definitions_['text_toTitleCase']) {
      // Title case is not a native JavaScript function.  Define one.
      var functionName = Blockly.JavaScript.variableDB_.getDistinctName(
          'text_toTitleCase', Blockly.Generator.NAME_TYPE);
      Blockly.JavaScript.text_changeCase.toTitleCase = functionName;
      var func = [];
      func.push('function ' + functionName + '(str) {');
      func.push('  return str.replace(/\\S+/g,');
      func.push('      function(txt) {return txt.charAt(0).toUpperCase() + ' +
                'txt.substr(1).toLowerCase();});');
      func.push('}');
      Blockly.JavaScript.definitions_['text_toTitleCase'] = func.join('\n');
    }
    var argument0 = Blockly.JavaScript.valueToCode(this, 'TEXT',
        Blockly.JavaScript.ORDER_NONE) || '\'\'';
    code = Blockly.JavaScript.text_changeCase.toTitleCase +
        '(' + argument0 + ')';
  }
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.text_changeCase.OPERATORS = {
  UPPERCASE: '.toUpperCase()',
  LOWERCASE: '.toLowerCase()',
  TITLECASE: null
};

Blockly.JavaScript.text_trim = function() {
  // Trim spaces.
  var mode = this.getTitleValue('MODE');
  var operator = Blockly.JavaScript.text_trim.OPERATORS[mode];
  var argument0 = Blockly.JavaScript.valueToCode(this, 'TEXT',
      Blockly.JavaScript.ORDER_MEMBER) || '\'\'';
  return [argument0 + operator, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

Blockly.JavaScript.text_trim.OPERATORS = {
  LEFT: '.replace(/^\\s+/, \'\')',
  RIGHT: '.replace(/\\s+$/, \'\')',
  BOTH: '.replace(/^\\s+|\\s+$/g, \'\')'
};

Blockly.JavaScript.text_print = function() {
  // Print statement.
  var argument0 = Blockly.JavaScript.valueToCode(this, 'TEXT',
      Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'console.log(' + argument0 + ');\n';
};

// attempt CrowdBotBlock code
Blockly.JavaScript.text_strobe = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return '(new five.Led(' + (argument0*1) + ')).strobe();\n';
};
Blockly.JavaScript.text_on = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return '(new five.Led(' + (argument0*1) + ')).on();\n';
};
Blockly.JavaScript.text_off = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return '(new five.Led(' + (argument0*1) + ')).off();\n';
};
Blockly.JavaScript.servo_init = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'var servo' + (argument0*1) + ' = new five.Servo(' + (argument0*1) + ');\nboard.repl.inject({servo: servo' + (argument0*1) + '});\n';
};
Blockly.JavaScript.servo_move = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  var argument1 = Blockly.JavaScript.valueToCode(this, 'NUM2', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'servo' + (argument0*1) + '.move(' + (argument1*1) + ');\n';
};
// Wait callback
Blockly.JavaScript.wait = function() {
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  var branch0 = Blockly.JavaScript.statementToCode(this, 'DO');
  return 'board.wait(' + (argument0*1) + ', function(){\n' + branch0 + '});\n';
};
// Button callbacks
Blockly.JavaScript.button = function() {
  var argument0 = Blockly.JavaScript.valueToCode(this, 'PIN', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  var branch0 = Blockly.JavaScript.statementToCode(this, 'HIT');
  var branch1 = Blockly.JavaScript.statementToCode(this, 'RELEASE');
  argument0 *= 1;
  return 'var bumper' + argument0 + ' = new five.Button(' + argument0 + ');\nbumper' + argument0 + '.on("hit", function(){\n' + branch0 + '}).on("release", function(){\n' + branch1 + '\n});';
};
// Piezo init, tone, and fade
Blockly.JavaScript.piezo_init = function(){
  var pin = Blockly.JavaScript.valueToCode(this, 'PIN', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  pin *= 1;
  return 'var piezo' + pin + ' = new five.Piezo(' + pin + ');\nboard.repl.inject({piezo: piezo' + pin +'});\n';
};
Blockly.JavaScript.piezo_tone = function(){
  var pin = Blockly.JavaScript.valueToCode(this, 'PIN', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  pin *= 1;
  var volume = Blockly.JavaScript.valueToCode(this, 'VOL', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  volume *= 1;
  var time = Blockly.JavaScript.valueToCode(this, 'TIME', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  time *= 1;
  return 'piezo' + pin + '.tone(' + volume + ',' + time + ');\n';
};
Blockly.JavaScript.piezo_fade = function(){
  var pin = Blockly.JavaScript.valueToCode(this, 'PIN', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  pin *= 1;
  var volume = Blockly.JavaScript.valueToCode(this, 'VOL', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  volume *= 1;
  var time = Blockly.JavaScript.valueToCode(this, 'TIME', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  time *= 1;
  return 'piezo' + pin + '.fade(' + volume + ',' + time + ');\n';
};

Blockly.JavaScript.text_prompt = function() {
  // Prompt function.
  var msg = Blockly.JavaScript.quote_(this.getTitleValue('TEXT'));
  var code = 'prompt(' + msg + ')';
  var toNumber = this.getTitleValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'parseFloat(' + code + ')';
  }
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};

/**
 * @fileoverview XML reader and writer.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.Xml = {};

/**
 * Encode a block tree as XML.
 * @param {!Object} workspace The SVG workspace.
 * @return {!Element} XML document.
 */
Blockly.Xml.workspaceToDom = function(workspace) {
  var xml = document.createElement('xml');
  var blocks = workspace.getTopBlocks(false);
  for (var i = 0, block; block = blocks[i]; i++) {
    var element = Blockly.Xml.blockToDom_(block);
    var xy = block.getRelativeToSurfaceXY();
    element.setAttribute('x', Blockly.RTL ? -xy.x : xy.x);
    element.setAttribute('y', xy.y);
    xml.appendChild(element);
  }
  return xml;
};

/**
 * Encode a block subtree as XML.
 * @param {!Blockly.Block} block The root block to encode.
 * @return {!Element} Tree of XML elements.
 * @private
 */
Blockly.Xml.blockToDom_ = function(block) {
  var element = document.createElement('block');
  element.setAttribute('type', block.type);
  if (block.mutationToDom) {
    // Custom data for an advanced block.
    var mutation = block.mutationToDom();
    if (mutation) {
      element.appendChild(mutation);
    }
  }
  function titleToDom(title) {
    if (title.name && title.EDITABLE) {
      var container = document.createElement('title');
      container.setAttribute('name', title.name);
      var titleText = document.createTextNode(title.getValue());
      container.appendChild(titleText);
      element.appendChild(container);
    }
  }
  for (var i = 0, title; title = block.titleRow[i]; i++) {
    titleToDom(title);
  }
  for (var x = 0, input; input = block.inputList[x]; x++) {
    if (input.label) {
      titleToDom(input.label);
    }
  }

  if (block.comment) {
    var commentElement = document.createElement('comment');
    var commentText = document.createTextNode(block.comment.getText());
    commentElement.appendChild(commentText);
    commentElement.setAttribute('pinned', block.comment.isPinned());
    var xy = block.comment.getBubbleLocation();
    commentElement.setAttribute('x', xy.x);
    commentElement.setAttribute('y', xy.y);
    var hw = block.comment.getBubbleSize();
    commentElement.setAttribute('h', hw.height);
    commentElement.setAttribute('w', hw.width);
    element.appendChild(commentElement);
  }

  var hasValues = false;
  for (var i = 0, input; input = block.inputList[i]; i++) {
    var container;
    var empty = true;
    if (input.type == Blockly.DUMMY_INPUT) {
      continue;
    } else if (input.type == Blockly.LOCAL_VARIABLE) {
      container = document.createElement('variable');
      container.setAttribute('data', input.getText());
      empty = false;
    } else {
      var childBlock = input.targetBlock();
      if (input.type == Blockly.INPUT_VALUE) {
        container = document.createElement('value');
        hasValues = true;
      } else if (input.type == Blockly.NEXT_STATEMENT) {
        container = document.createElement('statement');
      }
      if (childBlock) {
        container.appendChild(Blockly.Xml.blockToDom_(childBlock));
        empty = false;
      }
    }
    container.setAttribute('name', input.name);
    if (!empty) {
      element.appendChild(container);
    }
  }
  if (hasValues) {
    element.setAttribute('inline', block.inputsInline);
  }
  if (block.collapsed) {
    element.setAttribute('collapsed', true);
  }
  if (block.disabled) {
    element.setAttribute('disabled', true);
  }

  if (block.nextConnection) {
    var nextBlock = block.nextConnection.targetBlock();
    if (nextBlock) {
      var container = document.createElement('next');
      container.appendChild(Blockly.Xml.blockToDom_(nextBlock));
      element.appendChild(container);
    }
  }

  return element;
};

/**
 * Converts a DOM structure into plain text.
 * Currently the text format is fairly ugly: all one line with no whitespace.
 * @param {!Element} dom A tree of XML elements.
 * @return {string} Text representation.
 */
Blockly.Xml.domToText = function(dom) {
  var oSerializer = new XMLSerializer();
  return oSerializer.serializeToString(dom);
};

/**
 * Converts a DOM structure into properly indented text.
 * @param {!Element} dom A tree of XML elements.
 * @return {string} Text representation.
 */
Blockly.Xml.domToPrettyText = function(dom) {
  // This function is not guaranteed to be correct for all XML.
  // But it handles the XML that Blockly generates.
  var line = Blockly.Xml.domToText(dom);
  // Add place every open and close tag on its own line.
  var lines = line.split('<');
  // Indent every line.
  var indent = '';
  for (var x = 1; x < lines.length; x++) {
    var nextChar = lines[x][0];
    if (nextChar == '/') {
      indent = indent.substring(2);
    }
    lines[x] = indent + '<' + lines[x];
    if (nextChar != '/') {
      indent += '  ';
    }
  }
  // Pull simple tags back together.
  // E.g. <foo></foo>
  var text = lines.join('\n');
  text = text.replace(/(<(\w+)[^>]*>[^\n]*)\n *<\/\2>/g, '$1</$2>');
  // Trim leading blank line.
  return text.replace(/^\n/, '');
};

/**
 * Converts plain text into a DOM structure.
 * Throws an error if XML doesn't parse.
 * @param {string} text Text representation.
 * @return {!Element} A tree of XML elements.
 */
Blockly.Xml.textToDom = function(text) {
  var oParser = new DOMParser();
  var dom = oParser.parseFromString(text, 'text/xml');
  // The DOM should have one and only one top-level node, an XML tag.
  if (!dom || !dom.firstChild || dom.firstChild.tagName != 'xml' ||
      dom.firstChild !== dom.lastChild) {
    // Whatever we got back from the parser is not XML.
    throw 'Blockly.Xml.textToDom did not obtain a valid XML tree.';
  }
  return dom.firstChild;
};

/**
 * Decode an XML DOM and create blocks on the workspace.
 * @param {!Object} workspace The SVG workspace.
 * @param {!Element} xml XML DOM.
 */
Blockly.Xml.domToWorkspace = function(workspace, xml) {
  for (var x = 0, xmlChild; xmlChild = xml.childNodes[x]; x++) {
    if (xmlChild.nodeName && xmlChild.nodeName.toLowerCase() == 'block') {
      var block = Blockly.Xml.domToBlock_(workspace, xmlChild);
      var blockX = parseInt(xmlChild.getAttribute('x'), 10);
      var blockY = parseInt(xmlChild.getAttribute('y'), 10);
      if (!isNaN(blockX) && !isNaN(blockY)) {
        block.moveBy(Blockly.RTL ? -blockX : blockX, blockY);
      }
    }
  }
};

/**
 * Decode an XML block tag and create a block (and possibly sub blocks) on the
 * workspace.
 * @param {!Object} workspace The SVG workspace.
 * @param {!Element} xmlBlock XML block element.
 * @return {!Blockly.Block} The root block created.
 * @private
 */
Blockly.Xml.domToBlock_ = function(workspace, xmlBlock) {
  var prototypeName = xmlBlock.getAttribute('type');
  var block = new Blockly.Block(workspace, prototypeName);
  block.initSvg();

  for (var x = 0, xmlChild; xmlChild = xmlBlock.childNodes[x]; x++) {
    if (xmlChild.nodeType == 3 && xmlChild.data.match(/^\s*$/)) {
      // Extra whitespace between tags does not concern us.
      continue;
    }
    var blockChild = null;
    var input;

    // Find the first 'real' grandchild node (that isn't whitespace).
    var firstRealGrandchild = null;
    for (var y = 0, grandchildNode; grandchildNode = xmlChild.childNodes[y];
         y++) {
      if (grandchildNode.nodeType != 3 || !grandchildNode.data.match(/^\s*$/)) {
        firstRealGrandchild = grandchildNode;
      }
    }

    var name = xmlChild.getAttribute('name');
    switch (xmlChild.tagName.toLowerCase()) {
      case 'mutation':
        // Custom data for an advanced block.
        if (block.domToMutation) {
          block.domToMutation(xmlChild);
        }
        break;
      case 'comment':
        block.setCommentText(xmlChild.textContent);
        var pinned = xmlChild.getAttribute('pinned');
        if (pinned) {
          block.comment.setPinned(pinned == 'true');
        }
        var bubbleX = parseInt(xmlChild.getAttribute('x'), 10);
        var bubbleY = parseInt(xmlChild.getAttribute('y'), 10);
        if (!isNaN(bubbleX) && !isNaN(bubbleY)) {
          block.comment.setBubbleLocation(bubbleX, bubbleY, false);
        }
        var bubbleW = parseInt(xmlChild.getAttribute('w'), 10);
        var bubbleH = parseInt(xmlChild.getAttribute('h'), 10);
        if (!isNaN(bubbleW) && !isNaN(bubbleH)) {
          block.comment.setBubbleSize(bubbleW, bubbleH);
        }
        break;
      case 'title':
        block.setTitleValue(xmlChild.textContent, name);
        break;
      case 'variable':
        var data = xmlChild.getAttribute('data');
        if (data !== null) {
          input = block.getInput(name);
          if (!input) {
            throw 'Variable input does not exist.';
          }
          input.setText(data);
        }
        break;
      case 'value':
      case 'statement':
        input = block.getInput(name);
        if (!input) {
          throw 'Input does not exist.';
        }
        if (firstRealGrandchild && firstRealGrandchild.tagName &&
            firstRealGrandchild.tagName.toLowerCase() == 'block') {
          blockChild = Blockly.Xml.domToBlock_(workspace, firstRealGrandchild);
          if (blockChild.outputConnection) {
            input.connect(blockChild.outputConnection);
          } else if (blockChild.previousConnection) {
            input.connect(blockChild.previousConnection);
          } else {
            throw 'Child block does not have output or previous statement.';
          }
        }
        break;
      case 'next':
        if (firstRealGrandchild && firstRealGrandchild.tagName &&
            firstRealGrandchild.tagName.toLowerCase() == 'block') {
          if (!block.nextConnection) {
            throw 'Next statement does not exist.';
          } else if (block.nextConnection.targetConnection) {
            // This could happen if there is more than one XML 'next' tag.
            throw 'Next statement is already connected.';
          }
          blockChild = Blockly.Xml.domToBlock_(workspace, firstRealGrandchild);
          if (!blockChild.previousConnection) {
            throw 'Next block does not have previous statement.';
          }
          block.nextConnection.connect(blockChild.previousConnection);
        }
        break;
      default:
        // Unknown tag; ignore.  Same principle as HTML parsers.
    }
  }

  var inline = xmlBlock.getAttribute('inline');
  if (inline) {
    block.setInputsInline(inline == 'true');
  }

  var collapsed = xmlBlock.getAttribute('collapsed');
  if (collapsed) {
    block.setCollapsed(collapsed == 'true');
  }

  var disabled = xmlBlock.getAttribute('disabled');
  if (disabled) {
    block.setDisabled(disabled == 'true');
  }

  block.render();
  return block;
};

/**
 * Find the first 'real' child of a node, skipping whitespace text nodes.
 * Return true if that child is of the the specified type (case insensitive).
 * @param {!Node} parentNode The parent node.
 * @param {string} tagName The node type to check for.
 * @return {boolean} True if the first real child is the specified type.
 * @private
 */
Blockly.Xml.isFirstRealChild_ = function(parentNode, tagName) {
  for (var x = 0, childNode; childNode = parentNode.childNodes[x]; x++) {
    if (childNode.nodeType != 3 || !childNode.data.match(/^\s*$/)) {
      return childNode.tagName && childNode.tagName.toLowerCase() == tagName;
    }
  }
  return false;
};

exports.Blockly = Blockly;