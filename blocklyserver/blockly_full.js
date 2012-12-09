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
  } else if (e.target.nodeName == 'svg' || false) {
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
    if (Blockly.selected &&
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
  if (false) {
    return;
  }
  /* Hotspot coordinates are baked into the CUR file, but they are still
     required due to a Chrome bug.
     http://code.google.com/p/chromium/issues/detail?id=1446 */
  var cursor = '';
  if (closed) {
    cursor = 'url(' + Blockly.pathToBlockly + 'media/handclosed.cur) 7 3, auto';
  }
  //if (Blockly.selected) {
    //Blockly.selected.getSvgRoot().style.cursor = cursor;
  //}
  // Set cursor on the SVG surface as well as block so that rapid movements
  // don't result in cursor changing to an arrow momentarily.
  //Blockly.svgDoc.getElementsByTagName('svg')[0].style.cursor = cursor;
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
    //
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
    //
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
 * Class for a database of variables.
 * @param {Array.<string>} reservedWords An array of words that are illegal for
 *     use as variable names in a language (e.g. ['new', 'if', 'this', ...]).
 * @constructor
 */
Blockly.Variables = {};

Blockly.Variables.NAME_TYPE = 'variable';

/**
 * Find all user-created variables.
 * @param {Blockly.Block} opt_block Optional root block.
 * @return {!Array.<string>} Array of variable names.
 */
Blockly.Variables.allVariables = function(opt_block) {
  var blocks;
  if (opt_block) {
    blocks = opt_block.getDescendants();
  } else {
    blocks = Blockly.mainWorkspace.getAllBlocks();
  }
  var variableHash = {};
  // Iterate through every block and add each variable to the hash.
  for (var x = 0; x < blocks.length; x++) {
    var func = blocks[x].getVars;
    if (func) {
      var blockVariables = func.call(blocks[x]);
      for (var y = 0; y < blockVariables.length; y++) {
        var varName = blockVariables[y];
        // Variable name may be null if the block is only half-built.
        if (varName) {
          variableHash[Blockly.Names.PREFIX_ +
              varName.toLowerCase()] = varName;
        }
      }
    }
  }
  // Flatten the hash into a list.
  var variableList = [];
  for (var name in variableHash) {
    variableList.push(variableHash[name]);
  }
  return variableList;
};

/**
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Utility functions for handling variables and procedure names.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class for a database of entity names (variables, functions, etc).
 * @param {Array.<string>} reservedWords An array of words that are illegal for
 *     use as names in a language (e.g. ['new', 'if', 'this', ...]).
 * @constructor
 */
Blockly.Names = function(reservedWords) {
  this.reservedDict_ = {};
  if (reservedWords) {
    for (var x = 0; x < reservedWords.length; x++) {
      this.reservedDict_[Blockly.Names.PREFIX_ + reservedWords[x]] = true;
    }
  }
  this.reset();
};

/**
 * When JavaScript (or most other languages) is generated, variable 'foo' and
 * procedure 'foo' would collide.  However, Blockly has no such problems since
 * variable get 'foo' and procedure call 'foo' are unambiguous.
 * Therefore, Blockly keeps a separate type name to disambiguate.
 * getName('foo', 'variable') -> 'foo'
 * getName('foo', 'procedure') -> 'foo2'
 */

/**
 * JavaScript doesn't have a true hashtable, it uses object properties.
 * Since even clean objects have a few properties, prepend this prefix onto
 * names so that they don't collide with any builtins.
 * @private
 */
Blockly.Names.PREFIX_ = 'v_';

/**
 * Empty the database and start from scratch.  The reserved words are kept.
 */
Blockly.Names.prototype.reset = function() {
  this.db_ = {};
  this.dbReverse_ = {};
};

/**
 * Convert a Blockly entity name to a legal exportable entity name.
 * @param {string} name The Blockly entity name (no constraints).
 * @param {string} type The type of entity in Blockly
 *     ('variable', 'procedure', 'builtin', etc...).
 * @return {string} An entity name legal for the exported language.
 */
Blockly.Names.prototype.getName = function(name, type) {
  var normalized = Blockly.Names.PREFIX_ + name.toLowerCase() + 'X' + type;
  if (normalized in this.db_) {
    return this.db_[normalized];
  } else {
    return this.getDistinctName(name, type);
  }
};

/**
 * Convert a Blockly entity name to a legal exportable entity name.
 * Ensure that this is a new name not overlapping any previously defined name.
 * Also check against list of reserved words for the current language and
 * ensure name doesn't collide.
 * @param {string} name The Blockly entity name (no constraints).
 * @param {string} type The type of entity in Blockly
 *     ('variable', 'procedure', 'builtin', etc...).
 * @return {string} An entity name legal for the exported language.
 */
Blockly.Names.prototype.getDistinctName = function(name, type) {
  var safeName = this.safeName_(name);
  var i = '';
  while (this.dbReverse_[Blockly.Names.PREFIX_ + safeName + i] ||
      (Blockly.Names.PREFIX_ + safeName + i) in this.reservedDict_) {
    // Collision with existing name.  Create a unique name.
    i = i ? i + 1 : 2;
  }
  safeName += i;
  this.db_[Blockly.Names.PREFIX_ + name.toLowerCase() + 'X' + type] = safeName;
  this.dbReverse_[Blockly.Names.PREFIX_ + safeName] = true;
  return safeName;
};

/**
 * Given a proposed entity name, generate a name that conforms to the
 * [_A-Za-z][_A-Za-z0-9]* format that most languages consider legal for
 * variables.
 * @param {string} name Potentially illegal entity name.
 * @return {string} Safe entity name.
 * @private
 */
Blockly.Names.prototype.safeName_ = function(name) {
  if (!name) {
    name = 'unnamed';
  } else {
    // Unfortunately names in non-latin characters will look like
    // _E9_9F_B3_E4_B9_90 which is pretty meaningless.
    name = encodeURI(name.replace(/ /g, '_')).replace(/[^\w]/g, '_');
    // Most languages don't allow names with leading numbers.
    if ('0123456789'.indexOf(name.charAt(0)) != -1) {
      name = 'my_' + name;
    }
  }
  return name;
};

/**
 * Do the given two entity names refer to the same entity?
 * Blockly names are case-insensitive.
 * @param {string} name1 First name.
 * @param {string} name2 Second name.
 * @return {boolean} True if names are the same.
 */
Blockly.Names.equals = function(name1, name2) {
  return name1.toLowerCase() == name2.toLowerCase();
};


/**
 * Return a sorted list of variable names for variable dropdown menus.
 * Include a special option at the end for creating a new variable name.
 * @return {!Array.<string>} Array of variable names.
 */
Blockly.Variables.dropdownCreate = function() {
  var variableList = Blockly.Variables.allVariables();
  // Ensure that the currently selected variable is an option.
  var name = this.getText();
  if (name && variableList.indexOf(name) == -1) {
    variableList.push(name);
  }
  variableList.sort(Blockly.caseInsensitiveComparator);
  variableList.push(Blockly.MSG_RENAME_VARIABLE);
  variableList.push(Blockly.MSG_NEW_VARIABLE);
  // Variables are not language-specific, use the name as both the user-facing
  // text and the internal representation.
  var options = [];
  for (var x = 0; x < variableList.length; x++) {
    options[x] = [variableList[x], variableList[x]];
  }
  return options;
};

/**
 * Event handler for a change in variable name.
 * Special case the 'New variable...' and 'Rename variable...' options.
 * In both of these special cases, prompt the user for a new name.
 * @param {string} text The selected dropdown menu option.
 */
Blockly.Variables.dropdownChange = function(text) {
  function promptName(promptText, defaultText) {
    Blockly.hideChaff();
    var newVar = window.prompt(promptText, defaultText);
    // Merge runs of whitespace.  Strip leading and trailing whitespace.
    // Beyond this, all names are legal.
    return newVar && newVar.replace(/[\s\xa0]+/g, ' ').replace(/^ | $/g, '');
  }
  if (text == Blockly.MSG_RENAME_VARIABLE) {
    var oldVar = this.getText();
    text = promptName(Blockly.MSG_RENAME_VARIABLE_TITLE.replace('%1', oldVar),
                      oldVar);
    if (text) {
      Blockly.Variables.renameVariable(oldVar, text);
    }
  } else {
    if (text == Blockly.MSG_NEW_VARIABLE) {
      text = promptName(Blockly.MSG_NEW_VARIABLE_TITLE, '');
      // Since variables are case-insensitive, ensure that if the new variable
      // matches with an existing variable, the new case prevails throughout.
      Blockly.Variables.renameVariable(text, text);
    }
    if (text) {
      this.setText(text);
    }
  }
  window.setTimeout(Blockly.Variables.refreshFlyoutCategory, 1);
};

/**
 * Find all instances of the specified variable and rename them.
 * @param {string} oldName Variable to rename.
 * @param {string} newName New variable name.
 */
Blockly.Variables.renameVariable = function(oldName, newName) {
  var blocks = Blockly.mainWorkspace.getAllBlocks();
  // Iterate through every block.
  for (var x = 0; x < blocks.length; x++) {
    var func = blocks[x].renameVar;
    if (func) {
      func.call(blocks[x], oldName, newName);
    }
  }
};

/**
 * Construct the blocks required by the flyout for the variable category.
 * @param {!Array.<!Blockly.Block>} blocks List of blocks to show.
 * @param {!Array.<number>} gaps List of widths between blocks.
 * @param {number} margin Standard margin width for calculating gaps.
 * @param {!Blockly.Workspace} workspace The flyout's workspace.
 */
Blockly.Variables.flyoutCategory = function(blocks, gaps, margin, workspace) {
  var variableList = Blockly.Variables.allVariables();
  variableList.sort(Blockly.caseInsensitiveComparator);
  // In addition to the user's variables, we also want to display the default
  // variable name at the top.  We also don't want this duplicated if the
  // user has created a variable of the same name.
  variableList.unshift(null);
  var defaultVariable = undefined;
  for (var i = 0; i < variableList.length; i++) {
    if (variableList[i] === defaultVariable) {
      continue;
    }
    var getBlock = Blockly.Language.variables_get ?
        new Blockly.Block(workspace, 'variables_get') : null;
    getBlock && getBlock.initSvg();
    var setBlock = Blockly.Language.variables_set ?
        new Blockly.Block(workspace, 'variables_set') : null;
    setBlock && setBlock.initSvg();
    if (variableList[i] === null) {
      defaultVariable = (getBlock || setBlock).getVars()[0];
    } else {
      getBlock && getBlock.setTitleText(variableList[i], 'VAR');
      setBlock && setBlock.setTitleText(variableList[i], 'VAR');
    }
    setBlock && blocks.push(setBlock);
    getBlock && blocks.push(getBlock);
    if (getBlock && setBlock) {
      gaps.push(margin, margin * 3);
    } else {
      gaps.push(margin * 2);
    }
  }
};

/**
 * Refresh the variable flyout if it is open.
 * Only used if the flyout's autoClose is false.
 */
Blockly.Variables.refreshFlyoutCategory = function() {
  if (Blockly.Toolbox && Blockly.Toolbox.flyout_.isVisible() &&
      Blockly.Toolbox.selectedOption_.cat == Blockly.MSG_VARIABLE_CATEGORY) {
    Blockly.Toolbox.flyout_.hide();
    Blockly.Toolbox.flyout_.show(Blockly.MSG_VARIABLE_CATEGORY);
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
    var editable = true;
    var workspace = this.workspace;
    // Call parent's destructor.
    Blockly.Block.prototype.destroy.call(this);
    if (true) {
      // Destroy any callers.
      //Blockly.Procedures.destroyCallers(name, workspace);
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
    this.appendTitle(Blockly.LANG_PROCEDURES_MUTATORCONTAINER_TITLE);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip('');
    this.contextMenu = false;
  }
};

Blockly.Language.procedures_mutatorarg = {
  // Procedure argument (for mutator dialog).
  init: function() {
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
    
    this.appendTitle(Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TITLE_ADD);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip(Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.lists_create_with_item = {
  // Add items.
  init: function() {
    
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
    
    this.appendTitle(Blockly.LANG_CONTROLS_IF_IF_TITLE_IF);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip(Blockly.LANG_CONTROLS_IF_IF_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.controls_if_elseif = {
  // Else-If condition.
  init: function() {
    
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

Blockly.LANG_ARDUINO_PURPLE = "purple";
Blockly.LANG_ARDUINO_GREEN = "green";
Blockly.LANG_ARDUINO_BLUE = "blue";
Blockly.LANG_ARDUINO_RED = "red";

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
    
    this.appendTitle(Blockly.LANG_TEXT_CREATE_JOIN_TITLE_JOIN);
    this.appendInput('', Blockly.NEXT_STATEMENT, 'STACK');
    this.setTooltip(Blockly.LANG_TEXT_CREATE_JOIN_TOOLTIP_1);
    this.contextMenu = false;
  }
};

Blockly.Language.text_create_join_item = {
  // Add items.
  init: function() {
    
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
    
    this.appendTitle("Off");
    this.appendInput('LED@', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Off");
  }
};
Blockly.Language.sensorinit = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Init");
    this.appendInput('Sensor@', Blockly.INPUT_VALUE, 'PIN', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Init Sensor");
  }
};
Blockly.Language.sensorval = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Read");
    this.appendInput('Sensor@', Blockly.INPUT_VALUE, 'PIN', Number);
    this.setOutput(true, Number);
    this.setTooltip("Read Sensor");
  }
};
// wiring objects
Blockly.Language.selectled = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.leds = [
      [Blockly.LANG_ARDUINO_PURPLE, 'PURPLE'],
      [Blockly.LANG_ARDUINO_GREEN, 'GREEN'],
      [Blockly.LANG_ARDUINO_BLUE, 'BLUE'],
      [Blockly.LANG_ARDUINO_RED, 'RED']
    ];
    var menu = new Blockly.FieldDropdown(this.leds);
    this.appendTitle(menu, 'LED');
    this.appendTitle(" LED");
    this.setOutput(true, Number);
    this.setTooltip("Select LED");
  }
};
Blockly.Language.multimeter = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Multimeter");
    this.setOutput(true, Number);
    this.setTooltip("Multimeter");
  }
};
Blockly.Language.servopin = {
  category: "Motor",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("My Servo");
    this.setOutput(true, Number);
    this.setTooltip("My Servo");
  }
};
Blockly.Language.lightsensor = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Light Sensor");
    this.setOutput(true, Number);
    this.setTooltip("Light Sensor");
  }
};
Blockly.Language.audioplug = {
  category: "Arduino",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Audio Plug");
    this.setOutput(true, Number);
    this.setTooltip("Audio Plug");
  }
};
Blockly.Language.drive_init = {
  category: "Drive",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Set up Drive Motors");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Set up Drive Motors");
  }
};
Blockly.Language.drive_fwd = {
  category: "Drive",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Drive forward");
    this.appendInput('for', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Drive forward");
  }
};
Blockly.Language.drive_rev = {
  category: "Drive",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Drive backward");
    this.appendInput('for', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Drive backward");
  }
};
Blockly.Language.drive_left = {
  category: "Drive",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Turn left");
    this.appendInput('for', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Turn left");
  }
};
Blockly.Language.drive_right = {
  category: "Drive",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Turn right");
    this.appendInput('for', Blockly.INPUT_VALUE, 'NUM', Number);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Turn right");
  }
};
Blockly.Language.drive_stop = {
  category: "Drive",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    this.setColour(250);
    this.appendTitle("Stop");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Stop");
  }
};
// Servo init, min, max, center, move, sweep
Blockly.Language.servo_init = {
  category: "Motor",
  helpUrl: Blockly.LANG_TEXT_PRINT_HELPURL,
  init: function(){
    
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
Blockly.JavaScript.drive_init = function(){
  return 'var leftMotor = new five.Motor({ pin: 3 });\nvar rightMotor = new five.Motor({ pin: 11 });\nboard.repl.inject({ motor: leftMotor });\nboard.repl.inject({ motor: rightMotor });\n var leftDir = new five.Led({ pin: 12 });\nvar rightDir = new five.Led({ pin: 13 });\n';
};
Blockly.JavaScript.drive_fwd = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'leftDir.on();\nrightDir.on();\nleftMotor.start();\nrightMotor.start();\nboard.wait( ' + argument0 * 1000 + ', function(){\n  leftMotor.stop();\n  rightMotor.stop();\n});\n';
};
Blockly.JavaScript.drive_rev = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'leftDir.off();\nrightDir.off();\nleftMotor.start();\nrightMotor.start();\nboard.wait( ' + argument0 * 1000 + ', function(){\n  leftMotor.stop();\n  rightMotor.stop();\n});\n';
};
Blockly.JavaScript.drive_left = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'leftDir.off();\nrightDir.on();\nleftMotor.start();\nrightMotor.start();\nboard.wait( ' + argument0 * 1000 + ', function(){\n  leftMotor.stop();\n  rightMotor.stop();\n});\n';
};
Blockly.JavaScript.drive_right = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'leftDir.on();\nrightDir.off();\nleftMotor.start();\nrightMotor.start();\nboard.wait( ' + argument0 * 1000 + ', function(){\n  leftMotor.stop();\n  rightMotor.stop();\n});\n';
};
Blockly.JavaScript.drive_stop = function(){
  return 'leftMotor.stop();\n  rightMotor.stop();\n';
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
Blockly.JavaScript.sensorinit = function(){
  var pin = Blockly.JavaScript.valueToCode(this, 'PIN', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  pin *= 1;
  return 'var sensor' + pin +'_val = 0;\nvar sensor' + pin + ' = new five.Sensor({ pin: "A' + pin + '", freq: 250 });\nboard.repl.inject({ sensor: sensor' + pin + ' });\nsensor' + pin + '.scale([ 0, 1000 ]).on("read", function(){\n  sensor' + pin + '_val = this.scaled.toFixed(0);\n});\n';
};
Blockly.JavaScript.sensorval = function(){
  var pin = Blockly.JavaScript.valueToCode(this, 'PIN', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  pin *= 1;
  return ['(sensor' + pin + '_val)', Blockly.JavaScript.ORDER_MEMBER];
};
// Robot wiring config
Blockly.JavaScript.selectled = function(){
  var myled = this.getTitleValue('LED');
  var ledpin = 0;
  switch(myled){
    case "PURPLE":
      ledpin = 2;
      break;
    case "GREEN":
      ledpin = 4;
      break;
    case "BLUE":
      ledpin = 6;
      break;
    case "RED":
      ledpin = 10;
      break;
  }
  return [ledpin, Blockly.JavaScript.ORDER_MEMBER];
};
Blockly.JavaScript.multimeter = function(){
  return ['8', Blockly.JavaScript.ORDER_MEMBER];
};
Blockly.JavaScript.servopin = function(){
  return ['9', Blockly.JavaScript.ORDER_MEMBER];
};
Blockly.JavaScript.lightsensor = function(){
  return ['0', Blockly.JavaScript.ORDER_MEMBER];
};
Blockly.JavaScript.audioplug = function(){
  return ['4', Blockly.JavaScript.ORDER_MEMBER];
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
 * @fileoverview Helper functions for generating Wiring (C for Arduino) with blocks.
 * @author nickd@codeforamerica.org (Nick Doiron)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.Wiring.RESERVED_WORDS_ =
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
Blockly.Wiring.ORDER_ATOMIC = 0;         // 0 "" ...
Blockly.Wiring.ORDER_MEMBER = 1;         // . []
Blockly.Wiring.ORDER_NEW = 1;            // new
Blockly.Wiring.ORDER_FUNCTION_CALL = 2;  // ()
Blockly.Wiring.ORDER_INCREMENT = 3;      // ++
Blockly.Wiring.ORDER_DECREMENT = 3;      // --
Blockly.Wiring.ORDER_LOGICAL_NOT = 4;    // !
Blockly.Wiring.ORDER_BITWISE_NOT = 4;    // ~
Blockly.Wiring.ORDER_UNARY_PLUS = 4;     // +
Blockly.Wiring.ORDER_UNARY_NEGATION = 4; // -
Blockly.Wiring.ORDER_TYPEOF = 4;         // typeof
Blockly.Wiring.ORDER_VOID = 4;           // void
Blockly.Wiring.ORDER_DELETE = 4;         // delete
Blockly.Wiring.ORDER_MULTIPLICATION = 5; // *
Blockly.Wiring.ORDER_DIVISION = 5;       // /
Blockly.Wiring.ORDER_MODULUS = 5;        // %
Blockly.Wiring.ORDER_ADDITION = 6;       // +
Blockly.Wiring.ORDER_SUBTRACTION = 6;    // -
Blockly.Wiring.ORDER_BITWISE_SHIFT = 7;  // << >> >>>
Blockly.Wiring.ORDER_RELATIONAL = 8;     // < <= > >=
Blockly.Wiring.ORDER_IN = 8;             // in
Blockly.Wiring.ORDER_INSTANCEOF = 8;     // instanceof
Blockly.Wiring.ORDER_EQUALITY = 9;       // == != === !==
Blockly.Wiring.ORDER_BITWISE_AND = 10;   // &
Blockly.Wiring.ORDER_BITWISE_XOR = 11;   // ^
Blockly.Wiring.ORDER_BITWISE_OR = 12;    // |
Blockly.Wiring.ORDER_LOGICAL_AND = 13;   // &&
Blockly.Wiring.ORDER_LOGICAL_OR = 14;    // ||
Blockly.Wiring.ORDER_CONDITIONAL = 15;   // ?:
Blockly.Wiring.ORDER_ASSIGNMENT = 16;    // = += -= *= /= %= <<= >>= ...
Blockly.Wiring.ORDER_COMMA = 17;         // ,
Blockly.Wiring.ORDER_NONE = 99;          // (...)

/**
 * Initialise the database of variable names.
 */
Blockly.Wiring.init = function() {
  // Create a dictionary of definitions to be printed before the code.
  Blockly.Wiring.definitions_ = {};

  if (Blockly.Variables) {
    if (!Blockly.Wiring.variableDB_) {
      Blockly.Wiring.variableDB_ =
          new Blockly.Names(Blockly.Wiring.RESERVED_WORDS_.split(','));
    } else {
      Blockly.Wiring.variableDB_.reset();
    }

    var defvars = [];
    var variables = Blockly.Variables.allVariables();
    for (var x = 0; x < variables.length; x++) {
      defvars[x] = 'var ' +
          Blockly.Wiring.variableDB_.getDistinctName(variables[x],
          Blockly.Variables.NAME_TYPE) + ';';
    }
    Blockly.Wiring.definitions_['variables'] = defvars.join('\n');
  }
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.Wiring.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var definitions = [];
  for (var name in Blockly.Wiring.definitions_) {
    definitions.push(Blockly.Wiring.definitions_[name]);
  }
  return "void setup(){\n" + definitions.join('\n') + '}\n\nvoid loop(){\n' + code + "\n}";
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  A trailing semicolon is needed to make this legal.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.Wiring.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Encode a string as a properly escaped Wiring string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} Wiring string.
 * @private
 */
Blockly.Wiring.quote_ = function(string) {
  // TODO: This is a quick hack.  Replace with goog.string.quote
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/'/g, '\\\'');
  return '\'' + string + '\'';
};

/**
 * Common tasks for generating Wiring from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The Wiring code created for this block.
 * @return {string} Wiring code with comments and subsequent blocks added.
 * @private
 */
Blockly.Wiring.scrub_ = function(block, code) {
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
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Generating Wiring for control blocks.
 * @author fraser@google.com (Neil Fraser)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

Blockly.Wiring.controls_if = function() {
  // If/elseif/else condition.
  var n = 0;
  var argument = Blockly.Wiring.valueToCode(this, 'IF' + n,
      Blockly.Wiring.ORDER_NONE) || 'false';
  var branch = Blockly.Wiring.statementToCode(this, 'DO' + n);
  var code = 'if (' + argument + ') {\n' + branch + '}';
  for (n = 1; n <= this.elseifCount_; n++) {
    argument = Blockly.Wiring.valueToCode(this, 'IF' + n,
        Blockly.Wiring.ORDER_NONE) || 'false';
    branch = Blockly.Wiring.statementToCode(this, 'DO' + n);
    code += ' else if (' + argument + ') {\n' + branch + '}';
  }
  if (this.elseCount_) {
    branch = Blockly.Wiring.statementToCode(this, 'ELSE');
    code += ' else {\n' + branch + '}';
  }
  return code + '\n';
};

Blockly.Wiring.controls_whileUntil = function() {
  // Do while/until loop.
  var until = this.getTitleValue('MODE') == 'UNTIL';
  var argument0 = Blockly.Wiring.valueToCode(this, 'BOOL',
      until ? Blockly.Wiring.ORDER_LOGICAL_NOT :
      Blockly.Wiring.ORDER_NONE) || 'false';
  var branch0 = Blockly.Wiring.statementToCode(this, 'DO');
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while (' + argument0 + ') {\n' + branch0 + '}\n';
};

Blockly.Wiring.controls_for = function() {
  // For loop.
  var variable0 = Blockly.Wiring.variableDB_.getName(
      this.getInputVariable('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.Wiring.valueToCode(this, 'FROM',
      Blockly.Wiring.ORDER_ASSIGNMENT) || '0';
  var argument1 = Blockly.Wiring.valueToCode(this, 'TO',
      Blockly.Wiring.ORDER_ASSIGNMENT) || '0';
  var branch0 = Blockly.Wiring.statementToCode(this, 'DO');
  var code;
  if (argument1.match(/^\w+$/)) {
    code = 'for (' + variable0 + ' = ' + argument0 + '; ' +
                 variable0 + ' <= ' + argument1 + '; ' +
                 variable0 + '++) {\n' +
        branch0 + '}\n';
  } else {
    // The end value appears to be more complicated than a simple variable.
    // Cache it to a variable to prevent repeated look-ups.
    var endVar = Blockly.Wiring.variableDB_.getDistinctName(
        variable0 + '_end', Blockly.Variables.NAME_TYPE);
    code = 'var ' + endVar + ' = ' + argument1 + ';\n' +
        'for (' + variable0 + ' = ' + argument0 + '; ' +
              variable0 + ' <= ' + endVar + '; ' +
              variable0 + '++) {\n' +
        branch0 + '}\n';
  }
  return code;
};

Blockly.Wiring.controls_forEach = function() {
  // For each loop.
  var variable0 = Blockly.Wiring.variableDB_.getName(
      this.getInputVariable('VAR'), Blockly.Variables.NAME_TYPE);
  var argument0 = Blockly.Wiring.valueToCode(this, 'LIST',
      Blockly.Wiring.ORDER_ASSIGNMENT) || '{ }';
  var branch0 = Blockly.Wiring.statementToCode(this, 'DO');
  var code;
  var indexVar = Blockly.Wiring.variableDB_.getDistinctName(
      variable0 + '_index', Blockly.Variables.NAME_TYPE);
  if (argument0.match(/^\w+$/)) {
    branch0 = '  ' + variable0 + ' = ' + argument0 + '[' + indexVar + '];\n' +
        branch0;
    code = 'for (var ' + indexVar + ' in  ' + argument0 + ') {\n' +
        branch0 + '}\n';
  } else {
    // The list appears to be more complicated than a simple variable.
    // Cache it to a variable to prevent repeated look-ups.
    var listVar = Blockly.Wiring.variableDB_.getDistinctName(
        variable0 + '_list', Blockly.Variables.NAME_TYPE);
    branch0 = '  ' + variable0 + ' = ' + listVar + '[' + indexVar + '];\n' +
        branch0;
    code = 'var ' + listVar + ' = ' + argument0 + ';\n' +
        'for (var ' + indexVar + ' in ' + listVar + ') {\n' +
        branch0 + '}\n';
  }
  return code;
};

Blockly.Wiring.controls_flow_statements = function() {
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
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Generating Wiring (C for Arduino) for list blocks.
 * @author nickd@codeforamerica.org (Nick Doiron)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

Blockly.Wiring.lists_create_empty = function() {
  // Create an empty list.
  return ['[]', Blockly.Wiring.ORDER_ATOMIC];
};

Blockly.Wiring.lists_create_with = function() {
  // Create a list with any number of elements of any type.
  var code = new Array(this.itemCount_);
  for (var n = 0; n < this.itemCount_; n++) {
    code[n] = Blockly.Wiring.valueToCode(this, 'ADD' + n,
        Blockly.Wiring.ORDER_COMMA) || 'null';
  }
  code = '[' + code.join(', ') + ']';
  return [code, Blockly.Wiring.ORDER_ATOMIC];
};

Blockly.Wiring.lists_repeat = function() {
  // Create a list with one element repeated.
  if (!Blockly.Wiring.definitions_['lists_repeat']) {
    // Function copied from Closure's goog.array.repeat.
    var functionName = Blockly.Wiring.variableDB_.getDistinctName(
        'lists_repeat', Blockly.Generator.NAME_TYPE);
    Blockly.Wiring.lists_repeat.repeat = functionName;
    var func = [];
    func.push('Array ' + functionName + '(value, n) {');
    func.push('  Array a = [];');
    func.push('  for (int i = 0; i < n; i++) {');
    func.push('    a[i] = value;');
    func.push('  }');
    func.push('  return a;');
    func.push('}');
    Blockly.Wiring.definitions_['lists_repeat'] = func.join('\n');
  }
  var argument0 = Blockly.Wiring.valueToCode(this, 'ITEM',
      Blockly.Wiring.ORDER_COMMA) || 'null';
  var argument1 = Blockly.Wiring.valueToCode(this, 'NUM',
      Blockly.Wiring.ORDER_COMMA) || '0';
  var code = Blockly.Wiring.lists_repeat.repeat +
      '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.lists_length = function() {
  // Testing the length of a list is the same as for a string.
  return Blockly.Wiring.text_length.call(this);
};

Blockly.Wiring.lists_isEmpty = function() {
  // Testing a list for being empty is the same as for a string.
  return Blockly.Wiring.text_isEmpty.call(this);
};

Blockly.Wiring.lists_indexOf = function() {
  // Searching a list for a value is the same as search for a substring.
  return Blockly.Wiring.text_indexOf.call(this);
};

Blockly.Wiring.lists_getIndex = function() {
  // Indexing into a list is the same as indexing into a string.
  return Blockly.Wiring.text_charAt.call(this);
};

Blockly.Wiring.lists_setIndex = function() {
  // Set element at index.
  var argument0 = Blockly.Wiring.valueToCode(this, 'AT',
      Blockly.Wiring.ORDER_NONE) || '1';
  var argument1 = Blockly.Wiring.valueToCode(this, 'LIST',
      Blockly.Wiring.ORDER_MEMBER) || '[]';
  var argument2 = Blockly.Wiring.valueToCode(this, 'TO',
      Blockly.Wiring.ORDER_ASSIGNMENT) || 'null';
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
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Generating Wiring (C for Arduino) with logic blocks.
 * @author nickd@codeforamerica.org (Nick Doiron)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

Blockly.Wiring.logic_compare = function() {
  // Comparison operator.
  var mode = this.getTitleValue('OP');
  var operator = Blockly.Wiring.logic_compare.OPERATORS[mode];
  var order = (operator == '==' || operator == '!=') ?
      Blockly.Wiring.ORDER_EQUALITY : Blockly.Wiring.ORDER_RELATIONAL;
  var argument0 = Blockly.Wiring.valueToCode(this, 'A', order) || '0';
  var argument1 = Blockly.Wiring.valueToCode(this, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.Wiring.logic_compare.OPERATORS = {
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>='
};

Blockly.Wiring.logic_operation = function() {
  // Operations 'and', 'or'.
  var operator = (this.getTitleValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.Wiring.ORDER_LOGICAL_AND :
      Blockly.Wiring.ORDER_LOGICAL_OR;
  var argument0 = Blockly.Wiring.valueToCode(this, 'A', order) || 'false';
  var argument1 = Blockly.Wiring.valueToCode(this, 'B', order) || 'false';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.Wiring.logic_negate = function() {
  // Negation.
  var order = Blockly.Wiring.ORDER_LOGICAL_NOT;
  var argument0 = Blockly.Wiring.valueToCode(this, 'BOOL', order) ||
      'false';
  var code = '!' + argument0;
  return [code, order];
};

Blockly.Wiring.logic_boolean = function() {
  // Boolean values true and false.
  var code = (this.getTitleValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Blockly.Wiring.ORDER_ATOMIC];
};
/**
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Generating Wiring (C for Arduino) with text blocks.
 * @author nickd@codeforamerica.org (Nick Doiron)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

Blockly.Wiring.text = function() {
  // Text value.
  var code = Blockly.Wiring.quote_(this.getTitleText('TEXT'));
  return [code, Blockly.Wiring.ORDER_ATOMIC];
};

Blockly.Wiring.text_join = function() {
  // Create a string made up of any number of elements of any type.
  var code;
  if (this.itemCount_ == 0) {
    return ['\'\'', Blockly.Wiring.ORDER_ATOMIC];
  } else if (this.itemCount_ == 1) {
    var argument0 = Blockly.Wiring.valueToCode(this, 'ADD0',
        Blockly.Wiring.ORDER_NONE) || '\'\'';
    code = 'String(' + argument0 + ')';
    return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
  } else if (this.itemCount_ == 2) {
    var argument0 = Blockly.Wiring.valueToCode(this, 'ADD0',
        Blockly.Wiring.ORDER_NONE) || '\'\'';
    var argument1 = Blockly.Wiring.valueToCode(this, 'ADD1',
        Blockly.Wiring.ORDER_NONE) || '\'\'';
    code = 'String(' + argument0 + ') + String(' + argument1 + ')';
    return [code, Blockly.Wiring.ORDER_ADDITION];
  } else {
    code = new Array(this.itemCount_);
    for (var n = 0; n < this.itemCount_; n++) {
      code[n] = Blockly.Wiring.valueToCode(this, 'ADD' + n,
          Blockly.Wiring.ORDER_COMMA) || '\'\'';
    }
    code = '[' + code.join(',') + '].join(\'\')';
    return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
  }
};

Blockly.Wiring.text_length = function() {
  // String length.
  var argument0 = Blockly.Wiring.valueToCode(this, 'VALUE',
      Blockly.Wiring.ORDER_FUNCTION_CALL) || '\'\'';
  return [argument0 + '.length', Blockly.Wiring.ORDER_MEMBER];
};

Blockly.Wiring.text_isEmpty = function() {
  // Is the string null?
  var argument0 = Blockly.Wiring.valueToCode(this, 'VALUE',
      Blockly.Wiring.ORDER_MEMBER) || '\'\'';
  return ['!' + argument0 + '.length', Blockly.Wiring.ORDER_LOGICAL_NOT];
};

Blockly.Wiring.text_endString = function() {
  // Return a leading or trailing substring.
  var first = this.getTitleValue('END') == 'FIRST';
  var code;
  if (first) {
    var argument0 = Blockly.Wiring.valueToCode(this, 'NUM',
        Blockly.Wiring.ORDER_COMMA) || '1';
    var argument1 = Blockly.Wiring.valueToCode(this, 'TEXT',
        Blockly.Wiring.ORDER_MEMBER) || '\'\'';
    code = argument1 + '.substring(0, ' + argument0 + ')';
  } else {
    if (!Blockly.Wiring.definitions_['text_tailString']) {
      var functionName = Blockly.Wiring.variableDB_.getDistinctName(
          'text_tailString', Blockly.Generator.NAME_TYPE);
      Blockly.Wiring.text_endString.text_tailString = functionName;
      var func = [];
      func.push('function ' + functionName + '(n, myString) {');
      func.push('  // Return a trailing substring of n characters.');
      func.push('  return myString.substring(myString.length - n);');
      func.push('}');
      Blockly.Wiring.definitions_['text_tailString'] = func.join('\n');
    }
    var argument0 = Blockly.Wiring.valueToCode(this, 'NUM',
        Blockly.Wiring.ORDER_COMMA) || '1';
    var argument1 = Blockly.Wiring.valueToCode(this, 'TEXT',
        Blockly.Wiring.ORDER_COMMA) || '\'\'';
    code = Blockly.Wiring.text_endString.text_tailString +
        '(' + argument0 + ', ' + argument1 + ')';
  }
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.text_indexOf = function() {
  // Search the text for a substring.
  var operator = this.getTitleValue('END') == 'FIRST' ?
      'indexOf' : 'lastIndexOf';
  var argument0 = Blockly.Wiring.valueToCode(this, 'FIND',
      Blockly.Wiring.ORDER_NONE) || '\'\'';
  var argument1 = Blockly.Wiring.valueToCode(this, 'VALUE',
      Blockly.Wiring.ORDER_MEMBER) || '\'\'';
  var code = argument1 + '.' + operator + '(' + argument0 + ') + 1';
  return [code, Blockly.Wiring.ORDER_MEMBER];
};

Blockly.Wiring.text_charAt = function() {
  // Get letter at index.
  var argument0 = Blockly.Wiring.valueToCode(this, 'AT',
      Blockly.Wiring.ORDER_NONE) || '1';
  var argument1 = Blockly.Wiring.valueToCode(this, 'VALUE',
      Blockly.Wiring.ORDER_MEMBER) || '{ }';
  // Blockly uses one-based indicies.
  if (argument0.match(/^\d+$/)) {
    // If the index is a naked number, decrement it right now.
    argument0 = parseInt(argument0, 10) - 1;
  } else {
    // If the index is dynamic, decrement it in code.
    argument0 += ' - 1';
  }
  var code = argument1 + '[' + argument0 + ']';
  return [code, Blockly.Wiring.ORDER_MEMBER];
};

Blockly.Wiring.text_changeCase = function() {
  // Change capitalization.
  var mode = this.getTitleValue('CASE');
  var operator = Blockly.Wiring.text_changeCase.OPERATORS[mode];
  var code;
  if (operator) {
    // Upper and lower case are functions built into Wiring.
    var argument0 = Blockly.Wiring.valueToCode(this, 'TEXT',
        Blockly.Wiring.ORDER_MEMBER) || '\'\'';
    code = argument0 + operator;
  } else {
    if (!Blockly.Wiring.definitions_['text_toTitleCase']) {
      // Title case is not a native Wiring function.  Define one.
      var functionName = Blockly.Wiring.variableDB_.getDistinctName(
          'text_toTitleCase', Blockly.Generator.NAME_TYPE);
      Blockly.Wiring.text_changeCase.toTitleCase = functionName;
      var func = [];
      func.push('String ' + functionName + '(str) {');
      func.push('  return str.replace(/\\S+/g,');
      func.push('      String (txt) {return txt[0].toUpperCase() + ' +
                'txt.substr(1).toLowerCase();});');
      func.push('}');
      Blockly.Wiring.definitions_['text_toTitleCase'] = func.join('\n');
    }
    var argument0 = Blockly.Wiring.valueToCode(this, 'TEXT',
        Blockly.Wiring.ORDER_NONE) || '\'\'';
    code = Blockly.Wiring.text_changeCase.toTitleCase +
        '(' + argument0 + ')';
  }
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.text_changeCase.OPERATORS = {
  UPPERCASE: '.toUpperCase()',
  LOWERCASE: '.toLowerCase()',
  TITLECASE: null
};

Blockly.Wiring.text_trim = function() {
  // Trim spaces.
  var mode = this.getTitleValue('MODE');
  var operator = Blockly.Wiring.text_trim.OPERATORS[mode];
  var argument0 = Blockly.Wiring.valueToCode(this, 'TEXT',
      Blockly.Wiring.ORDER_MEMBER) || '\'\'';
  return [argument0 + operator, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.text_trim.OPERATORS = {
  LEFT: '.replace(/^\\s+/, \'\')',
  RIGHT: '.replace(/\\s+$/, \'\')',
  BOTH: '.replace(/^\\s+|\\s+$/g, \'\')'
};

Blockly.Wiring.text_print = function() {
  // Print statement.
  var argument0 = Blockly.Wiring.valueToCode(this, 'TEXT',
      Blockly.Wiring.ORDER_NONE) || '\'\'';
  return 'Serial.write(' + argument0 + ');\n';
};

// attempt CrowdBotBlock code
Blockly.Wiring.text_strobe = function(){
  var argument0 = Blockly.Wiring.valueToCode(this, 'NUM', Blockly.Wiring.ORDER_NONE) || '\'\'';
  return 'digitalWrite(' + (argument0*1) + ', HIGH);\ndelay(300);\ndigitalWrite(' + (argument0*1) + ', LOW);\ndelay(300);\n';
};
Blockly.Wiring.text_on = function(){
  var argument0 = Blockly.Wiring.valueToCode(this, 'NUM', Blockly.Wiring.ORDER_NONE) || '\'\'';
  return 'digitalWrite(' + (argument0*1) + ', HIGH);\n';
};
Blockly.Wiring.text_off = function(){
  var argument0 = Blockly.Wiring.valueToCode(this, 'NUM', Blockly.Wiring.ORDER_NONE) || '\'\'';
  return 'digitalWrite(' + (argument0*1) + ', LOW);\n';
};
Blockly.Wiring.servo_init = function(){
  var argument0 = Blockly.Wiring.valueToCode(this, 'NUM', Blockly.Wiring.ORDER_NONE) || '\'\'';
  return 'Servo servo' + (argument0*1) + ' = new Servo(' + (argument0*1) + ');\n';
};
Blockly.Wiring.servo_move = function(){
  var argument0 = Blockly.Wiring.valueToCode(this, 'NUM', Blockly.Wiring.ORDER_NONE) || '\'\'';
  var argument1 = Blockly.Wiring.valueToCode(this, 'NUM2', Blockly.Wiring.ORDER_NONE) || '\'\'';
  return 'servo' + (argument0*1) + '.move(' + (argument1*1) + ');\n';
};

Blockly.Wiring.drive_init = function(){
  return 'var leftMotor = 3;\npinMode(leftMotor,OUTPUT);\nvar rightMotor = 11;\npinMode(rightMotor,OUTPUT);\nvar leftDir = 12;var rightDir = 13;\npinMode(leftDir,OUTPUT);\npinMode(rightDir,OUTPUT);\n';
};
Blockly.Wiring.drive_fwd = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'digitalWrite(leftDir,HIGH);\ndigitalWrite(rightDir,HIGH);\nanalogWrite(leftMotor,225);\nanalogWrite(rightMotor,255);\ndelay(' + argument0 * 1000 + ');\nanalogWrite(leftMotor,0);\nanalogWrite(rightMotor,0);\n';
};
Blockly.Wiring.drive_rev = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'digitalWrite(leftDir,LOW);\ndigitalWrite(rightDir,LOW);\nanalogWrite(leftMotor,225);\nanalogWrite(rightMotor,255);\ndelay(' + argument0 * 1000 + ');\nanalogWrite(leftMotor,0);\nanalogWrite(rightMotor,0);\n';
};
Blockly.Wiring.drive_left = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'digitalWrite(leftDir,LOW);\ndigitalWrite(rightDir,HIGH);\nanalogWrite(leftMotor,225);\nanalogWrite(rightMotor,255);\ndelay(' + argument0 * 1000 + ');\nanalogWrite(leftMotor,0);\nanalogWrite(rightMotor,0);\n';
};
Blockly.Wiring.drive_right = function(){
  var argument0 = Blockly.JavaScript.valueToCode(this, 'NUM', Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return 'digitalWrite(leftDir,HIGH);\ndigitalWrite(rightDir,LOW);\nanalogWrite(leftMotor,225);\nanalogWrite(rightMotor,255);\ndelay(' + argument0 * 1000 + ');\nanalogWrite(leftMotor,0);\nanalogWrite(rightMotor,0);\n';
};
Blockly.Wiring.drive_stop = function(){
  return 'analogWrite(leftMotor,0);\nanalogWrite(rightMotor,0);\n';
};

// Wait callback
Blockly.Wiring.wait = function() {
  var argument0 = Blockly.Wiring.valueToCode(this, 'NUM', Blockly.Wiring.ORDER_NONE) || '\'\'';
  var branch0 = Blockly.Wiring.statementToCode(this, 'DO');
  return 'delay(' + (argument0*1) + ');\n';
};
// Button callbacks
Blockly.Wiring.button = function() {
  var argument0 = Blockly.Wiring.valueToCode(this, 'PIN', Blockly.Wiring.ORDER_NONE) || '\'\'';
  var branch0 = Blockly.Wiring.statementToCode(this, 'HIT');
  var branch1 = Blockly.Wiring.statementToCode(this, 'RELEASE');
  argument0 *= 1;
  return 'setMode(' + argument0 + ', INPUT);\nif(digitalRead(' + argument0 + ') == HIGH){\n' + branch0 + '\n }\n ';
};
// Sensor read
Blockly.Wiring.sensorinit = function(){
  var pin = Blockly.Wiring.valueToCode(this, 'PIN', Blockly.Wiring.ORDER_NONE) || '\'\'';
  pin *= 1;
  return 'setMode("A' + pin + '", INPUT);\nreturn analogRead(' + pin + ');\n';
};
Blockly.Wiring.sensorval = function(){
  var pin = Blockly.Wiring.valueToCode(this, 'PIN', Blockly.Wiring.ORDER_NONE) || '\'\'';
  pin *= 1;
  return ['(sensor' + pin + '_val)', Blockly.Wiring.ORDER_MEMBER];
};
// Robot wiring config - should be generalized for multiple robots
Blockly.Wiring.selectled = function(){
  var myled = this.getTitleValue('LED');
  var ledpin = 0;
  switch(myled){
    case "PURPLE":
      ledpin = 2;
      break;
    case "GREEN":
      ledpin = 4;
      break;
    case "BLUE":
      ledpin = 6;
      break;
    case "RED":
      ledpin = 10;
      break;
  }
  return [ledpin, Blockly.Wiring.ORDER_MEMBER];
};
Blockly.Wiring.multimeter = function(){
  return ['8', Blockly.Wiring.ORDER_MEMBER];
};
Blockly.Wiring.servopin = function(){
  return ['9', Blockly.Wiring.ORDER_MEMBER];
};
Blockly.Wiring.lightsensor = function(){
  return ['0', Blockly.Wiring.ORDER_MEMBER];
};
Blockly.Wiring.audioplug = function(){
  return ['4', Blockly.Wiring.ORDER_MEMBER];
};

Blockly.Wiring.text_prompt = function() {
  // Prompt function.
  var msg = Blockly.Wiring.quote_(this.getTitleValue('TEXT'));
  var code = 'window.prompt(' + msg + ')';
  var toNumber = this.getTitleValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = ' (float) ' + code;
  }
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};
/**
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Generating Wiring (C for Arduino) using variable blocks.
 * @author nickd@codeforamerica.org (Nick Doiron)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

Blockly.Wiring.variables_get = function() {
  // Variable getter.
  var code = Blockly.Wiring.variableDB_.getName(this.getTitleText('VAR'),
      Blockly.Variables.NAME_TYPE);
  return [code, Blockly.Wiring.ORDER_ATOMIC];
};

Blockly.Wiring.variables_set = function() {
  // Variable setter.
  var argument0 = Blockly.Wiring.valueToCode(this, 'VALUE',
      Blockly.Wiring.ORDER_ASSIGNMENT) || '0';
  var varName = Blockly.Wiring.variableDB_.getName(
      this.getTitleText('VAR'), Blockly.Variables.NAME_TYPE);
  return varName + ' = ' + argument0 + ';\n';
};
/**
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Generating Wiring (C for Arduino) with procedure blocks.
 * @author nickd@codeforamerica.org (Nick Doiron)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

Blockly.Wiring.procedures_defreturn = function() {
  // Define a procedure with a return value.
  var funcName = Blockly.Wiring.variableDB_.getName(
      this.getTitleText('NAME'), Blockly.Procedures.NAME_TYPE);
  var branch = Blockly.Wiring.statementToCode(this, 'STACK');
  var returnValue = Blockly.Wiring.valueToCode(this, 'RETURN',
      Blockly.Wiring.ORDER_NONE) || '';
  if (returnValue) {
    returnValue = '  return ' + returnValue + ';\n';
  }
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.Wiring.variableDB_.getName(this.arguments_[x],
        Blockly.Variables.NAME_TYPE);
  }
  var code = 'String ' + funcName + '(' + args.join(', ') + ') {\n' +
      branch + returnValue + '}\n';
  code = Blockly.Wiring.scrub_(this, code);
  Blockly.Wiring.definitions_[funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.Wiring.procedures_defnoreturn =
    Blockly.Wiring.procedures_defreturn;

Blockly.Wiring.procedures_callreturn = function() {
  // Call a procedure with a return value.
  var funcName = Blockly.Wiring.variableDB_.getName(
      this.getTitleText('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.Wiring.valueToCode(this, 'ARG' + x,
        Blockly.Wiring.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.procedures_callnoreturn = function() {
  // Call a procedure with no return value.
  var funcName = Blockly.Wiring.variableDB_.getName(
      this.getTitleText('NAME'), Blockly.Procedures.NAME_TYPE);
  var args = [];
  for (var x = 0; x < this.arguments_.length; x++) {
    args[x] = Blockly.Wiring.valueToCode(this, 'ARG' + x,
        Blockly.Wiring.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ');\n';
  return code;
};
/**
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Generating Wiring (C for Arduino) using math blocks.
 * @author nickd@codeforamerica.org (Nick Doiron)
 */

Blockly.Wiring = Blockly.Generator.get('Wiring');

Blockly.Wiring.math_number = function() {
  // Numeric value.
  var code = window.parseFloat(this.getTitleText('NUM'));
  return [code, Blockly.Wiring.ORDER_ATOMIC];
};

Blockly.Wiring.math_arithmetic = function() {
  // Basic arithmetic operators, and power.
  var mode = this.getTitleValue('OP');
  var tuple = Blockly.Wiring.math_arithmetic.OPERATORS[mode];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.Wiring.valueToCode(this, 'A', order) || '0';
  var argument1 = Blockly.Wiring.valueToCode(this, 'B', order) || '0';
  var code;
  if (!operator) {
    code = '(' + argument0 + ') ** (' + argument1 + ')';
    return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
  }
  code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.Wiring.math_arithmetic.OPERATORS = {
  ADD: [' + ', Blockly.Wiring.ORDER_ADDITION],
  MINUS: [' - ', Blockly.Wiring.ORDER_SUBTRACTION],
  MULTIPLY: [' * ', Blockly.Wiring.ORDER_MULTIPLICATION],
  DIVIDE: [' / ', Blockly.Wiring.ORDER_DIVISION],
  POWER: [null, Blockly.Wiring.ORDER_COMMA]
};

Blockly.Wiring.math_change = function() {
  // Add to a variable in place.
  var argument0 = Blockly.Wiring.valueToCode(this, 'DELTA',
      Blockly.Wiring.ORDER_ADDITION) || '0';
  var varName = Blockly.Wiring.variableDB_.getName(this.getTitleText('VAR'),
      Blockly.Variables.NAME_TYPE);
  return varName + ' = (typeof ' + varName + ' == \'number\' ? ' + varName +
      ' : 0) + ' + argument0 + ';\n';
};

Blockly.Wiring.math_single = function() {
  // Math operators with single operand.
  var operator = this.getTitleValue('OP');
  var code;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedents.
    var argument = Blockly.Wiring.valueToCode(this, 'NUM',
        Blockly.Wiring.ORDER_UNARY_NEGATION) || '0';
    if (argument.charAt(0) == '-') {
      // --3 is not legal in JS.
      argument = ' ' + argument;
    }
    code = '-' + argument;
    return [code, Blockly.Wiring.ORDER_UNARY_NEGATION];
  }
  var argNaked = Blockly.Wiring.valueToCode(this, 'NUM',
      Blockly.Wiring.ORDER_NONE) || '0';
  var argParen = Blockly.Wiring.valueToCode(this, 'NUM',
      Blockly.Wiring.ORDER_DIVISION) || '0';
  // First, handle cases which generate values that don't need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ABS':
      code = 'abs(' + argNaked + ')';
      break;
    case 'ROOT':
      code = 'sqrt(' + argNaked + ')';
      break;
    case 'LN':
      code = 'log(' + argNaked + ')';
      break;
    case 'EXP':
      code = 'exp(' + argNaked + ')';
      break;
    case '10POW':
      code = 'pow(10,' + argNaked + ')';
      break;
    case 'ROUND':
      code = 'round(' + argNaked + ')';
      break;
    case 'ROUNDUP':
      code = 'ceil(' + argNaked + ')';
      break;
    case 'ROUNDDOWN':
      code = 'floor(' + argNaked + ')';
      break;
    case 'SIN':
      code = 'sin(' + argParen + ' / 180 * PI)';
      break;
    case 'COS':
      code = 'cos(' + argParen + ' / 180 * PI)';
      break;
    case 'TAN':
      code = 'tan(' + argParen + ' / 180 * PI)';
      break;
  }
  if (code) {
    return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
  }
  // Second, handle cases which generate values that may need parentheses
  // wrapping the code.
  switch (operator) {
    case 'LOG10':
      code = 'log10(' + argNaked + ')';
      break;
    case 'ASIN':
      code = 'asin(' + argNaked + ') / PI * 180';
      break;
    case 'ACOS':
      code = 'acos(' + argNaked + ') / PI * 180';
      break;
    case 'ATAN':
      code = 'atan(' + argNaked + ') / PI * 180';
      break;
    default:
      throw 'Unknown math operator.';
  }
  return [code, Blockly.Wiring.ORDER_DIVISION];
};

// Rounding functions have a single operand.
Blockly.Wiring.math_round = Blockly.Wiring.math_single;
// Trigonometry functions have a single operand.
Blockly.Wiring.math_trig = Blockly.Wiring.math_single;

Blockly.Wiring.math_on_list = function() {
  // Math functions for lists.
  var func = this.getTitleValue('OP');
  var list, code;
  switch (func) {
    case 'SUM':
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_MEMBER) || '{ }';
      code = '(int(){ int sortlist[] = ' + list + ';\n      int sum = 0;\n      for(int i=0;i<sortlist.length;i++){\n        sum += sortlist[i];\n      }\n      return sum;\n})()\n';
      break;
    case 'MIN':
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_COMMA) || '{ }';
      code = '(int(){ int sortlist[] = ' + list + ';\n      int mymin = sortlist[0];\n      for(int i=1;i<sortlist.length;i++){\n        mymin = min(mymin, sortlist[i]);\n      }\n      return mymin;\n})()\n';
      break;
    case 'MAX':
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_COMMA) || '{ }';
      code = '(int(){ int sortlist[] = ' + list + ';\n      int mymax = sortlist[0];\n      for(int i=1;i<sortlist.length;i++){\n        mymax = max(mymax, sortlist[i]);\n      }\n      return mymax;\n})()\n';
      break;
    case 'AVERAGE':
      // math_median([null,null,1,3]) == 2.0.
      if (!Blockly.Wiring.definitions_['math_mean']) {
        var functionName = Blockly.Wiring.variableDB_.getDistinctName(
            'math_mean', Blockly.Generator.NAME_TYPE);
        Blockly.Wiring.math_on_list.math_mean = functionName;
        var func = [];
        func.push('int ' + functionName + '(myList) {');
        func.push('  return myList.reduce(float(x, y) {return x + y;}) / ' +
                  'myList.length;');
        func.push('}');
        Blockly.Wiring.definitions_['math_mean'] = func.join('\n');
      }
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_NONE) || '{ }';
      code = Blockly.Wiring.math_on_list.math_mean + '(' + list + ')';
      break;
    case 'MEDIAN':
      // math_median([null,null,1,3]) == 2.0.
      if (!Blockly.Wiring.definitions_['math_median']) {
        var functionName = Blockly.Wiring.variableDB_.getDistinctName(
            'math_median', Blockly.Generator.NAME_TYPE);
        Blockly.Wiring.math_on_list.math_median = functionName;
        var func = [];
        func.push('int ' + functionName + '(myList) {');
        func.push('  int localList[] = myList.filter(int (x) ' +
                  '{return typeof x == \'number\';});');
        func.push('  if (!localList.length) return null;');
        func.push('  localList.sort(int(a, b) {return b - a;});');
        func.push('  if (localList.length % 2 == 0) {');
        func.push('    return (localList[localList.length / 2 - 1] + ' +
                  'localList[localList.length / 2]) / 2;');
        func.push('  } else {');
        func.push('    return localList[(localList.length - 1) / 2];');
        func.push('  }');
        func.push('}');
        Blockly.Wiring.definitions_['math_median'] = func.join('\n');
      }
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_NONE) || '{ }';
      code = Blockly.Wiring.math_on_list.math_median + '(' + list + ')';
      break;
    case 'MODE':
      if (!Blockly.Wiring.definitions_['math_modes']) {
        var functionName = Blockly.Wiring.variableDB_.getDistinctName(
            'math_modes', Blockly.Generator.NAME_TYPE);
        Blockly.Wiring.math_on_list.math_modes = functionName;
        // As a list of numbers can contain more than one mode,
        // the returned result is provided as an array.
        // Mode of [3, 'x', 'x', 1, 1, 2, '3'] -> ['x', 1].
        var func = [];
        func.push('float ' + functionName + '(values) {');
        func.push('  int modes = { };');
        func.push('  int counts = { };');
        func.push('  int maxCount = 0;');
        func.push('  for (int i = 0; i < values.length; i++) {');
        func.push('    int value = values[i];');
        func.push('    boolean found = false;');
        func.push('    int thisCount;');
        func.push('    for (int j = 0; j < counts.length; j++) {');
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
        func.push('    maxCount = max(thisCount, maxCount);');
        func.push('  }');
        func.push('  for (int j = 0; j < counts.length; j++) {');
        func.push('    if (counts[j][1] == maxCount) {');
        func.push('        modes.push(counts[j][0]);');
        func.push('    }');
        func.push('  }');
        func.push('  return modes;');
        func.push('}');
        Blockly.Wiring.definitions_['math_modes'] = func.join('\n');
      }
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_NONE) || '{ }';
      code = Blockly.Wiring.math_on_list.math_modes + '(' + list + ')';
      break;
    case 'STD_DEV':
      if (!Blockly.Wiring.definitions_['math_standard_deviation']) {
        var functionName = Blockly.Wiring.variableDB_.getDistinctName(
            'math_standard_deviation', Blockly.Generator.NAME_TYPE);
        Blockly.Wiring.math_on_list.math_standard_deviation = functionName;
        var func = [];
        func.push('float ' + functionName + '(numbers) {');
        func.push('  int n = numbers.length;');
        func.push('  if (!n) return null;');
        func.push('  float mean = numbers.reduce(function(x, y) ' +
                  '{return x + y;}) / n;');
        func.push('  float variance = 0;');
        func.push('  for (int j = 0; j < n; j++) {');
        func.push('    variance += pow(numbers[j] - mean, 2);');
        func.push('  }');
        func.push('  variance = variance / n;');
        func.push('  standard_dev = sqrt(variance);');
        func.push('  return standard_dev;');
        func.push('}');
        Blockly.Wiring.definitions_['math_standard_deviation'] =
            func.join('\n');
      }
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_NONE) || '{ }';
      code = Blockly.Wiring.math_on_list.math_standard_deviation +
          '(' + list + ')';
      break;
    case 'RANDOM':
      if (!Blockly.Wiring.definitions_['math_random_item']) {
        var functionName = Blockly.Wiring.variableDB_.getDistinctName(
            'math_random_item', Blockly.Generator.NAME_TYPE);
        Blockly.Wiring.math_on_list.math_random_item = functionName;
        var func = [];
        func.push('int ' + functionName + '(list) {');
        func.push('  int x = floor(random(0, list.length));');
        func.push('  return list[x];');
        func.push('}');
        Blockly.Wiring.definitions_['math_random_item'] = func.join('\n');
      }
      list = Blockly.Wiring.valueToCode(this, 'LIST',
          Blockly.Wiring.ORDER_NONE) || '{ }';
      code = Blockly.Wiring.math_on_list.math_random_item +
          '(' + list + ')';
      break;
    default:
      throw 'Unknown operator.';
  }
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.math_constrain = function() {
  // Constrain a number between two limits.
  var argument0 = Blockly.Wiring.valueToCode(this, 'VALUE',
      Blockly.Wiring.ORDER_COMMA) || '0';
  var argument1 = Blockly.Wiring.valueToCode(this, 'LOW',
      Blockly.Wiring.ORDER_COMMA) || '0';
  var argument2 = Blockly.Wiring.valueToCode(this, 'HIGH',
      Blockly.Wiring.ORDER_COMMA) || '0';
  var code = 'min(max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.math_modulo = function() {
  // Remainder computation.
  var argument0 = Blockly.Wiring.valueToCode(this, 'DIVIDEND',
      Blockly.Wiring.ORDER_MODULUS) || '0';
  var argument1 = Blockly.Wiring.valueToCode(this, 'DIVISOR',
      Blockly.Wiring.ORDER_MODULUS) || '0';
  var code = argument0 + ' % ' + argument1;
  return [code, Blockly.Wiring.ORDER_MODULUS];
};

Blockly.Wiring.math_random_int = function() {
  // Random integer between [X] and [Y].
  var argument0 = Blockly.Wiring.valueToCode(this, 'FROM',
      Blockly.Wiring.ORDER_COMMA) || '0';
  var argument1 = Blockly.Wiring.valueToCode(this, 'TO',
      Blockly.Wiring.ORDER_COMMA) || '0';
  if (!Blockly.Wiring.definitions_['math_random_int']) {
    var functionName = Blockly.Wiring.variableDB_.getDistinctName(
        'math_random_int', Blockly.Generator.NAME_TYPE);
    Blockly.Wiring.math_random_int.random_function = functionName;
    var func = [];
    func.push('int ' + functionName + '(a, b) {');
    func.push('  if (a > b) {');
    func.push('    // Swap a and b to ensure a is smaller.');
    func.push('    int c = a;');
    func.push('    a = b;');
    func.push('    b = c;');
    func.push('  }');
    func.push('  return floor(random(0, (b - a + 1) + a));');
    func.push('}');
    Blockly.Wiring.definitions_['math_random_int'] = func.join('\n');
  }
  code = Blockly.Wiring.math_random_int.random_function +
      '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.Wiring.ORDER_FUNCTION_CALL];
};

Blockly.Wiring.math_random_float = function() {
  // Random fraction between 0 and 1.
  return ['random(0,1)', Blockly.Wiring.ORDER_FUNCTION_CALL];
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
    if (title.name) {
      var titleText = { 'text': title.getValue() };
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
    var commentText = { 'text': block.comment.getText() };
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
  //block.initSvg();

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

  //block.render();
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

/**
 * Class for a workspace.
 * @param {boolean} editable Is this workspace freely interactive?
 * @constructor
 */
Blockly.Workspace = function(editable) {
  this.editable = true;
  this.topBlocks_ = [];
  //Blockly.ConnectionDB.init(this);
};

Blockly.Workspace.prototype.dragMode = false;

// Add properties to control the current scrolling offset.
Blockly.Workspace.prototype.scrollX = 0;
Blockly.Workspace.prototype.scrollY = 0;

Blockly.Workspace.prototype.trashcan = null;
Blockly.Workspace.prototype.fireChangeEventPid_ = null;

/**
 * Create the trash can elements.
 * @return {!Element} The workspace's SVG group.
 */
Blockly.Workspace.prototype.createDom = function() {
  /*
  <g>
    [Trashcan may go here]
    <g></g>
    <g></g>
  </g>
  */
  //this.svgGroup_ = Blockly.createSvgElement('g', {}, null);
  //this.svgBlockCanvas_ = Blockly.createSvgElement('g', {}, this.svgGroup_);
  //this.svgBubbleCanvas_ = Blockly.createSvgElement('g', {}, this.svgGroup_);
  //this.fireChangeEvent();
  return {}; //this.svgGroup_;
};

/**
 * Destroy this workspace.
 * Unlink from all DOM elements to prevent memory leaks.
 */
Blockly.Workspace.prototype.destroy = function() {
  if (this.svgGroup_) {
    this.svgGroup_.parentNode.removeChild(this.svgGroup_);
    this.svgGroup_ = null;
  }
  this.svgBlockCanvas_ = null;
  this.svgBubbleCanvas_ = null;
  if (this.trashcan) {
    this.trashcan.destroy();
    this.trashcan = null;
  }
};

/**
 * Add a trashcan.
 * @param {!Function} getMetrics A function that returns workspace's metrics.
 */
Blockly.Workspace.prototype.addTrashcan = function(getMetrics) {
  if (Blockly.Trashcan && true) {
    //this.trashcan = new Blockly.Trashcan(getMetrics);
    //var svgTrashcan = this.trashcan.createDom();
    //this.svgGroup_.insertBefore(svgTrashcan, this.svgBlockCanvas_);
    //this.trashcan.init();
  }
};

/**
 * Get the SVG element that forms the drawing surface.
 * @return {!Element} SVG element.
 */
Blockly.Workspace.prototype.getCanvas = function() {
  return this.svgBlockCanvas_;
};

/**
 * Get the SVG element that forms the bubble surface.
 * @return {!Element} SVG element.
 */
Blockly.Workspace.prototype.getBubbleCanvas = function() {
  return this.svgBubbleCanvas_;
};

/**
 * Add a block to the list of top blocks.
 * @param {!Blockly.Block} block Block to remove.
 */
Blockly.Workspace.prototype.addTopBlock = function(block) {
  this.topBlocks_.push(block);
  this.fireChangeEvent();
};

/**
 * Remove a block from the list of top blocks.
 * @param {!Blockly.Block} block Block to remove.
 */
Blockly.Workspace.prototype.removeTopBlock = function(block) {
  var found = false;
  for (var child, x = 0; child = this.topBlocks_[x]; x++) {
    if (child == block) {
      this.topBlocks_.splice(x, 1);
      found = true;
      break;
    }
  }
  if (!found) {
    throw 'Block not present in workspace\'s list of top-most blocks.';
  }
  this.fireChangeEvent();
};

/**
 * Finds the top-level blocks and returns them.  Blocks are optionally sorted
 * by position; top to bottom.
 * @param {boolean} ordered Sort the list if true.
 * @return {!Array.<!Blockly.Block>} The top-level block objects.
 */
Blockly.Workspace.prototype.getTopBlocks = function(ordered) {
  // Copy the topBlocks_ list.
  var blocks = [].concat(this.topBlocks_);
  if (ordered && blocks.length > 1) {
    blocks.sort(function(a, b)
        {return a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y;});
  }
  return blocks;
};

/**
 * Find all blocks in workspace.  No particular order.
 * @return {!Array.<!Blockly.Block>} Array of blocks.
 */
Blockly.Workspace.prototype.getAllBlocks = function() {
  var blocks = this.getTopBlocks(false);
  for (var x = 0; x < blocks.length; x++) {
    blocks = blocks.concat(blocks[x].getChildren());
  }
  return blocks;
};

/**
 * Destroy all blocks in workspace.
 */
Blockly.Workspace.prototype.clear = function() {
  Blockly.hideChaff();
  while (this.topBlocks_.length) {
    this.topBlocks_[0].destroy();
  }
};

/**
 * Render all blocks in workspace.
 */
Blockly.Workspace.prototype.render = function() {
  var renderList = this.getAllBlocks();
  for (var x = 0, block; block = renderList[x]; x++) {
    if (!block.getChildren().length) {
      //block.render();
    }
  }
};

/**
 * Finds the block with the specified ID in this workspace.
 * @param {string} id ID of block to find.
 * @return {Blockly.Block} The matching block, or null if not found.
 */
Blockly.Workspace.prototype.getBlockById = function(id) {
  // If this O(n) function fails to scale well, maintain a hash table of IDs.
  var blocks = this.getAllBlocks();
  for (var x = 0, block; block = blocks[x]; x++) {
    if (block.id == id) {
      return block;
    }
  }
  return null;
};

/**
 * Turn the visual trace functionality on or off.
 * @param {boolean} armed True if the trace should be on.
 */
Blockly.Workspace.prototype.traceOn = function(armed) {
  this.traceOn_ = armed;
  if (this.traceWrapper_) {
    Blockly.unbindEvent_(this.traceWrapper_);
    this.traceWrapper_ = null;
  }
  if (armed) {
    this.traceWrapper_ = Blockly.bindEvent_(this.svgBlockCanvas_,
        'blocklySelectChange', this, function() {this.traceOn_ = false});
  }
};

/**
 * Highlight a block in the workspace.
 * @param {string} id ID of block to find.
 */
Blockly.Workspace.prototype.highlightBlock = function(id) {
  if (!this.traceOn_) {
    return;
  }
  var block = this.getBlockById(id);
  if (!block) {
    return;
  }
  // Temporary turn off the listener for selection changes, so that we don't
  // trip the monitor for detecting user activity.
  this.traceOn(false);
  // Select the current block.
  block.select();
  // Restore the monitor for user activity.
  this.traceOn(true);
};

/**
 * Fire a change event for this workspace.  Changes include new block, dropdown
 * edits, mutations, connections, etc.  Groups of simultaneous changes (e.g.
 * a tree of blocks being deleted) are merged into one event.
 * Applications may hook workspace changes by listening for
 * 'blocklyWorkspaceChange' on Blockly.mainWorkspace.getCanvas().
 */
Blockly.Workspace.prototype.fireChangeEvent = function() {
  if (this.fireChangeEventPid_) {
    clearTimeout(this.fireChangeEventPid_);
  }
  var canvas = this.svgBlockCanvas_;
  if (canvas) {
    this.fireChangeEventPid_ = setTimeout(function() {
        Blockly.fireUiEvent(canvas, 'blocklyWorkspaceChange');
      }, 0);
  }
};

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
 * @fileoverview The class representing one block.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class for one block.
 * @param {Element} workspace The workspace in which to render the block.
 * @param {?string} prototypeName Name of the language object containing
 *     type-specific functions for this block.
 * @constructor
 */
Blockly.Block = function(workspace, prototypeName) {
  this.id = "panda";
  this.titleRow = [];
  this.outputConnection = null;
  this.nextConnection = null;
  this.previousConnection = null;
  this.inputList = [];
  this.inputsInline = false;
  this.rendered = false;
  this.collapsed = false;
  this.disabled = false;
  this.editable = true;
  this.tooltip = '';
  this.contextMenu = true;

  this.parentBlock_ = null;
  this.childBlocks_ = [];

  this.isInFlyout = false;
  this.workspace = workspace;

  workspace.addTopBlock(this);

  // Copy the type-specific functions and data from the prototype.
  if (prototypeName) {
    this.type = prototypeName;
    var prototype = Blockly.Language[prototypeName];
    if (!prototype) {
      throw 'Error: "' + prototypeName + '" is an unknown language block.';
    }
    for (var name in prototype) {
      this[name] = prototype[name];
    }
  }
  // Call an initialization function, if it exists.
  if (typeof this.init == 'function') {
    this.init();
  }
  // Bind an onchange function, if it exists.
  //if (typeof this.onchange == 'function') {
    //Blockly.bindEvent_(workspace.getCanvas(), 'blocklyWorkspaceChange', this,
     //                  this.onchange);
  //}
};

/**
 * Pointer to SVG representation of the block.
 * @type {Blockly.BlockSvg}
 * @private
 */
Blockly.Block.prototype.svg_ = null;

/**
 * Block's mutator icon (if any).
 * @type {Blockly.Mutator}
 */
Blockly.Block.prototype.mutator = null;

/**
 * Block's comment icon (if any).
 * @type {Blockly.Comment}
 */
Blockly.Block.prototype.comment = null;

/**
 * Block's warning icon (if any).
 * @type {Blockly.Warning}
 */
Blockly.Block.prototype.warning = null;

/**
 * Create and initialize the SVG representation of the block.
 */
Blockly.Block.prototype.initSvg = function() {
  this.svg_ = new Blockly.BlockSvg(this);
  this.svg_.init();
  Blockly.bindEvent_(this.svg_.getRootNode(), 'mousedown', this,
                     this.onMouseDown_);
  this.workspace.getCanvas().appendChild(this.svg_.getRootNode());
};

/**
 * Return the root node of the SVG or null if none exists.
 * @return {Node} The root SVG node (probably a group).
 */
Blockly.Block.prototype.getSvgRoot = function() {
  return this.svg_ && this.svg_.getRootNode();
};

/**
 * Is the mouse dragging a block?
 * 0 - No drag operation.
 * 1 - Still inside the sticky DRAG_RADIUS.
 * 2 - Freely draggable.
 * @private
 */
Blockly.Block.dragMode_ = 0;

/**
 * Wrapper function called when a mouseUp occurs during a drag operation.
 * @type {Function}
 * @private
 */
Blockly.Block.onMouseUpWrapper_ = null;

/**
 * Wrapper function called when a mouseMove occurs during a drag operation.
 * @type {Function}
 * @private
 */
Blockly.Block.onMouseMoveWrapper_ = null;

/**
 * Stop binding to the global mouseup and mousemove events.
 * @param {!Event} e Mouse up event.
 * @private
 */
Blockly.Block.terminateDrag_ = function(e) {
  if (Blockly.Block.onMouseUpWrapper_) {
    Blockly.unbindEvent_(Blockly.Block.onMouseUpWrapper_);
    Blockly.Block.onMouseUpWrapper_ = null;
  }
  if (Blockly.Block.onMouseMoveWrapper_) {
    Blockly.unbindEvent_(Blockly.Block.onMouseMoveWrapper_);
    Blockly.Block.onMouseMoveWrapper_ = null;
  }
  if (Blockly.Block.dragMode_ != 0) {
    // Terminate a drag operation that started but never finished.
    // This should never happen, but sometimes a browser will miss a mouse-up.
    // Touch events often do this on Android.
    Blockly.Block.dragMode_ = 0;
    if (Blockly.selected) {
      var selected = Blockly.selected;
      // Update the connection locations.
      var xy = selected.getRelativeToSurfaceXY();
      var dx = xy.x - selected.startDragX;
      var dy = xy.y - selected.startDragY;
      selected.moveConnections_(dx, dy);
      delete selected.draggedBubbles_;
      //selected.setDragging_(false);
      //selected.render();
      setTimeout(function() {selected.bumpNeighbours_();},
                        Blockly.BUMP_DELAY);
      // Fire an event to allow scrollbars to resize.
      Blockly.fireUiEvent(window, 'resize');
      selected.workspace.fireChangeEvent();
    }
  }
};

/**
 * Select this block.  Highlight it visually.
 */
Blockly.Block.prototype.select = function() {
  if (Blockly.selected) {
    // Unselect any previously selected block.
    Blockly.selected.unselect();
  }
  Blockly.selected = this;
  this.svg_.addSelect();
  Blockly.fireUiEvent(this.workspace.getCanvas(), 'blocklySelectChange');
};

/**
 * Unselect this block.  Remove its highlighting.
 */
Blockly.Block.prototype.unselect = function() {
  Blockly.selected = null;
  this.svg_.removeSelect();
  Blockly.fireUiEvent(this.workspace.getCanvas(), 'blocklySelectChange');
};

/**
 * Destroy this block.
 * @param {boolean} gentle If gentle, then try to heal any gap by connecting
 *     the next statement with the previous statement.  Otherwise, destroy all
 *     children of this block.
 */
Blockly.Block.prototype.destroy = function(gentle) {
  if (this.outputConnection) {
    // Detach this block from the parent's tree.
    this.setParent(null);
  } else {
    var previousTarget = null;
    if (this.previousConnection && this.previousConnection.targetConnection) {
      // Remember the connection that any next statements need to connect to.
      previousTarget = this.previousConnection.targetConnection;
      // Detach this block from the parent's tree.
      this.setParent(null);
    }
    if (gentle && this.nextConnection && this.nextConnection.targetConnection) {
      // Disconnect the next statement.
      var nextTarget = this.nextConnection.targetConnection;
      var nextBlock = this.nextConnection.targetBlock();
      this.nextConnection.disconnect();
      nextBlock.setParent(null);

      if (previousTarget) {
        // Attach the next statement to the previous statement.
        previousTarget.connect(nextTarget);
      }
    }
  }

  //This block is now at the top of the workspace.
  // Remove this block from the workspace's list of top-most blocks.
  this.workspace.removeTopBlock(this);
  this.workspace = null;

  // Just deleting this block from the DOM would result in a memory leak as
  // well as corruption of the connection database.  Therefore we must
  // methodically step through the blocks and carefully disassemble them.

  // Switch off rerendering.
  this.rendered = false;

  if (Blockly.selected == this) {
    Blockly.selected = null;
    // If there's a drag in-progress, unlink the mouse events.
    Blockly.Block.terminateDrag_();
  }

  // First, destroy all my children.
  for (var x = this.childBlocks_.length - 1; x >= 0; x--) {
    this.childBlocks_[x].destroy(false);
  }
  // Then destroy myself.
  for (var x = 0; x < this.titleRow.length; x++) {
    this.titleRow[x].destroy();
  }
  if (this.mutator) {
    this.mutator.destroy();
  }
  if (this.comment) {
    this.comment.destroy();
  }
  if (this.warning) {
    this.warning.destroy();
  }
  // Destroy all inputs and their labels.
  for (var x = 0; x < this.inputList.length; x++) {
    var input = this.inputList[x];
    if (input.label) {
      input.label.destroy();
    }
    if (input.destroy) {
      input.destroy();
    }
  }
  this.inputList = [];
  // Destroy any remaining connections (next/previous/output).
  var connections = this.getConnections_(true);
  for (var x = 0; x < connections.length; x++) {
    var connection = connections[x];
    if (connection.targetConnection) {
      connection.disconnect();
    }
    connections[x].destroy();
  }
  // Destroy the SVG and break circular references.
  if (this.svg_) {
    this.svg_.destroy();
    this.svg_ = null;
  }
};

/**
 * Return the coordinates of the top-left corner of this block relative to the
 * drawing surface's origin (0,0).
 * @return {!Object} Object with .x and .y properties.
 */
Blockly.Block.prototype.getRelativeToSurfaceXY = function() {
  var x = 0;
  var y = 0;
  if (this.svg_) {
    var element = this.svg_.getRootNode();
    do {
      // Loop through this block and every parent.
      var xy = Blockly.getRelativeXY_(element);
      x += xy.x;
      y += xy.y;
      element = element.parentNode;
    } while (element && element != this.workspace.getCanvas());
  }
  return {x: x, y: y};
};

/**
 * Move a block by a relative offset.
 * @param {number} dx Horizontal offset.
 * @param {number} dy Vertical offset.
 */
Blockly.Block.prototype.moveBy = function(dx, dy) {
  var xy = this.getRelativeToSurfaceXY();
  this.svg_.getRootNode().setAttribute('transform',
      'translate(' + (xy.x + dx) + ', ' + (xy.y + dy) + ')');
  this.moveConnections_(dx, dy);
};

/**
 * Handle a mouse-down on an SVG block.
 * @param {!Event} e Mouse down event.
 * @private
 */
Blockly.Block.prototype.onMouseDown_ = function(e) {
  // Update Blockly's knowledge of its own location.
  Blockly.svgResize();

  Blockly.Block.terminateDrag_();
  this.select();
  Blockly.hideChaff(this.isInFlyout);
  if (Blockly.isRightButton(e)) {
    // Right-click.
    if (Blockly.ContextMenu) {
      this.showContextMenu_(e.clientX, e.clientY);
    }
  } else if (!true) {
    // Allow uneditable blocks to be selected and context menued, but not
    // dragged.  Let this event bubble up to document, so the workspace may be
    // dragged instead.
    return;
  } else {
    // Left-click (or middle click)
    Blockly.removeAllRanges();
    Blockly.setCursorHand_(true);
    // Look up the current translation and record it.
    var xy = this.getRelativeToSurfaceXY();
    this.startDragX = xy.x;
    this.startDragY = xy.y;
    // Record the current mouse position.
    this.startDragMouseX = e.clientX;
    this.startDragMouseY = e.clientY;
    Blockly.Block.dragMode_ = 1;
    Blockly.Block.onMouseUpWrapper_ = Blockly.bindEvent_(Blockly.svgDoc,
        'mouseup', this, this.onMouseUp_);
    Blockly.Block.onMouseMoveWrapper_ = Blockly.bindEvent_(Blockly.svgDoc,
        'mousemove', this, this.onMouseMove_);
    // Build a list of comments that need to be moved and where they started.
    this.draggedBubbles_ = [];
    var descendants = this.getDescendants();
    for (var x = 0, descendant; descendant = descendants[x]; x++) {
      if (descendant.mutator) {
        var data = descendant.mutator.getIconLocation();
        data.bubble = descendant.mutator;
        this.draggedBubbles_.push(data);
      }
      if (descendant.comment) {
        var data = descendant.comment.getIconLocation();
        data.bubble = descendant.comment;
        this.draggedBubbles_.push(data);
      }
      if (descendant.warning) {
        var data = descendant.warning.getIconLocation();
        data.bubble = descendant.warning;
        this.draggedBubbles_.push(data);
      }
    }
  }
  // This event has been handled.  No need to bubble up to the document.
  e.stopPropagation();
};

/**
 * Handle a mouse-up anywhere in the SVG pane.  Is only registered when a
 * block is clicked.  We can't use mouseUp on the block since a fast-moving
 * cursor can briefly escape the block before it catches up.
 * @param {!Event} e Mouse up event.
 * @private
 */
Blockly.Block.prototype.onMouseUp_ = function(e) {
  /*
  if (Blockly.Block.dragMode_ == 2) {
    if (Blockly.selected != this) {
      throw 'Dragging no object?';
    }
    this.setDragging_(false);
    // Update the connection locations.
    var xy = this.getRelativeToSurfaceXY();
    var dx = xy.x - this.startDragX;
    var dy = xy.y - this.startDragY;
    this.moveConnections_(dx, dy);
  }
  */
  Blockly.Block.terminateDrag_();
  if (Blockly.selected && Blockly.highlightedConnection_) {
    Blockly.playAudio('click');
    // Connect two blocks together.
    Blockly.localConnection_.connect(Blockly.highlightedConnection_);
    if (this.workspace.trashcan && this.workspace.trashcan.isOpen) {
      // Don't throw an object in the trash can if it just got connected.
      Blockly.Trashcan.close(this.workspace.trashcan);
    }
  } else if (this.workspace.trashcan && this.workspace.trashcan.isOpen) {
    Blockly.playAudio('delete');
    var trashcan = this.workspace.trashcan;
    var closure = function() {
      Blockly.Trashcan.close(trashcan);
    };
    setTimeout(closure, 100);
    Blockly.selected.destroy(false);
    // Dropping a block on the trash can will usually cause the workspace to
    // resize to contain the newly positioned block.  Force a second resize now
    // that the block has been deleted.
    Blockly.fireUiEvent(window, 'resize');
  }
  if (Blockly.highlightedConnection_) {
    Blockly.highlightedConnection_.unhighlight();
    Blockly.highlightedConnection_ = null;
  }
};

/**
 * Load the block's help page in a new window.
 * @private
 */
Blockly.Block.prototype.showHelp_ = function() {
  var url = (typeof this.helpUrl == 'function') ? this.helpUrl() : this.helpUrl;
  if (url) {
    open(url);
  }
};

/**
 * Duplicate this block and its children.
 * @private
 */
Blockly.Block.prototype.duplicate_ = function() {
  // Create a duplicate via XML.
  var xml = Blockly.Xml.blockToDom_(this);
  var newBlock = Blockly.Xml.domToBlock_(this.workspace, xml);
  // Move the duplicate next to the old block.
  var xy = this.getRelativeToSurfaceXY();
  if (Blockly.RTL) {
    xy.x -= Blockly.SNAP_RADIUS;
  } else {
    xy.x += Blockly.SNAP_RADIUS;
  }
  xy.y += Blockly.SNAP_RADIUS * 2;
  newBlock.moveBy(xy.x, xy.y);
  // When a block in a stack of statements is duplicated, all blocks below the
  // original block are also duplicated.  Maybe this is desired, maybe not.
  // For now, delete these extra blocks.
  if (newBlock.nextConnection && newBlock.nextConnection.targetConnection) {
    newBlock.nextConnection.targetBlock().destroy();
  }
};

/**
 * Show the context menu for this block.
 * @param {number} x X-coordinate of mouse click.
 * @param {number} y Y-coordinate of mouse click.
 * @private
 */
Blockly.Block.prototype.showContextMenu_ = function(x, y) {
  if (!this.contextMenu) {
    return;
  }
  // Save the current block in a variable for use in closures.
  var block = this;
  var options = [];

  if (true) {
    // Option to duplicate this block.
    var duplicateOption = {
      text: Blockly.MSG_DUPLICATE_BLOCK,
      enabled: true,
      callback: function() {
        block.duplicate_();
      }
    };
    options.push(duplicateOption);

    if (Blockly.Comment && !this.collapsed) {
      // Option to add/remove a comment.
      var commentOption = {enabled: true};
      if (this.comment) {
        commentOption.text = Blockly.MSG_REMOVE_COMMENT;
        commentOption.callback = function() {
          block.setCommentText(null);
        };
      } else {
        commentOption.text = Blockly.MSG_ADD_COMMENT;
        commentOption.callback = function() {
          block.setCommentText('');
        };
      }
      options.push(commentOption);
    }

    // Option to make block inline.
    if (!this.collapsed) {
      for (var i = 0; i < this.inputList.length; i++) {
        if (this.inputList[i].type == Blockly.INPUT_VALUE) {
          // Only display this option if there is a value input on the block.
          var inlineOption = {enabled: true};
          inlineOption.text = this.inputsInline ? Blockly.MSG_EXTERNAL_INPUTS :
                                                  Blockly.MSG_INLINE_INPUTS;
          inlineOption.callback = function() {
            block.setInputsInline(!block.inputsInline);
          };
          options.push(inlineOption);
          break;
        }
      }
    }

    // Option to collapse/expand block.
    if (this.collapsed) {
      var expandOption = {enabled: true};
      expandOption.text = Blockly.MSG_EXPAND_BLOCK;
      expandOption.callback = function() {
        block.setCollapsed(false);
      };
      options.push(expandOption);
    } else if (this.inputList.length) {
      // Only display this option if there are inputs on the block.
      var collapseOption = {enabled: true};
      collapseOption.text = Blockly.MSG_COLLAPSE_BLOCK;
      collapseOption.callback = function() {
        block.setCollapsed(true);
      };
      options.push(collapseOption);
    }

    // Option to disable/enable block.
    var disableOption = {
      text: this.disabled ?
          Blockly.MSG_ENABLE_BLOCK : Blockly.MSG_DISABLE_BLOCK,
      enabled: !this.getInheritedDisabled(),
      callback: function() {
        block.setDisabled(!block.disabled);
      }
    };
    options.push(disableOption);

    // Option to delete this block.
    // Count the number of blocks that are nested in this block.
    var descendantCount = this.getDescendants().length;
    if (block.nextConnection && block.nextConnection.targetConnection) {
      // Blocks in the current stack would survive this block's deletion.
      descendantCount -= this.nextConnection.targetBlock().
          getDescendants().length;
    }
    var deleteOption = {
      text: descendantCount == 1 ? Blockly.MSG_DELETE_BLOCK :
          Blockly.MSG_DELETE_X_BLOCKS.replace('%1', descendantCount),
      enabled: true,
      callback: function() {
        Blockly.playAudio('delete');
        block.destroy(true);
      }
    };
    options.push(deleteOption);
  }

  // Option to get help.
  var url = (typeof this.helpUrl == 'function') ? this.helpUrl() : this.helpUrl;
  var helpOption = {enabled: !!url};
  helpOption.text = Blockly.MSG_HELP;
  helpOption.callback = function() {
    block.showHelp_();
  };
  options.push(helpOption);
  
  // Allow the block to add or modify options.
  if (this.customContextMenu) {
    this.customContextMenu(options);
  }

  Blockly.ContextMenu.show(x, y, options);
};

/**
 * Returns all connections originating from this block.
 * @param {boolean} all If true, return all connections even hidden ones.
 *     Otherwise return those that are visible.
 * @return {!Array.<!Blockly.Connection>} Array of connections.
 * @private
 */
Blockly.Block.prototype.getConnections_ = function(all) {
  var myConnections = [];
  if (all || this.rendered) {
    if (this.outputConnection) {
      myConnections.push(this.outputConnection);
    }
    if (this.nextConnection) {
      myConnections.push(this.nextConnection);
    }
    if (this.previousConnection) {
      myConnections.push(this.previousConnection);
    }
    if (all || !this.collapsed) {
      for (var x = 0, input; input = this.inputList[x]; x++) {
        if (input.type != Blockly.LOCAL_VARIABLE &&
            input.type != Blockly.DUMMY_INPUT) {
          myConnections.push(input);
        }
      }
    }
  }
  return myConnections;
};

/**
 * Move the connections for this block and all blocks attached under it.
 * Also update any attached bubbles.
 * @param {number} dx Horizontal offset from current location.
 * @param {number} dy Vertical offset from current location.
 * @private
 */
Blockly.Block.prototype.moveConnections_ = function(dx, dy) {
  if (!this.rendered) {
    // Rendering is required to lay out the blocks.
    // This is probably an invisible block attached to a collapsed block.
    return;
  }
  var myConnections = this.getConnections_(false);
  for (var x = 0; x < myConnections.length; x++) {
    myConnections[x].moveBy(dx, dy);
  }
  if (this.mutator) {
    this.mutator.computeIconLocation();
  }
  if (this.comment) {
    this.comment.computeIconLocation();
  }
  if (this.warning) {
    this.warning.computeIconLocation();
  }

  // Recurse through all blocks attached under this one.
  for (var x = 0; x < this.childBlocks_.length; x++) {
    this.childBlocks_[x].moveConnections_(dx, dy);
  }
};

/**
 * Recursively adds or removes the dragging class to this node and its children.
 * @param {boolean} adding True if adding, false if removing.
 * @private
 */
Blockly.Block.prototype.setDragging_ = function(adding) {
  if (adding) {
    this.svg_.addDragging();
  } else {
    this.svg_.removeDragging();
  }
  // Recurse through all blocks attached under this one.
  for (var x = 0; x < this.childBlocks_.length; x++) {
    this.childBlocks_[x].setDragging_(adding);
  }
};

/**
 * Drag this block to follow the mouse.
 * @param {!Event} e Mouse move event.
 * @private
 */
Blockly.Block.prototype.onMouseMove_ = function(e) {
  if (e.type == 'mousemove' && e.x == 1 && e.y == 0 && e.button == 0) {
    /* HACK:
     The current versions of Chrome for Android (18.0) has a bug where finger-
     swipes trigger a rogue 'mousemove' event with invalid x/y coordinates.
     Ignore events with this signature.  This may result in a one-pixel blind
     spot in other browsers, but this shouldn't be noticable.
    */
    e.stopPropagation();
    return;
  }
  Blockly.removeAllRanges();
  var dx = e.clientX - this.startDragMouseX;
  var dy = e.clientY - this.startDragMouseY;
  if (Blockly.Block.dragMode_ == 1) {
    // Still dragging within the sticky DRAG_RADIUS.
    var dr = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    if (dr > Blockly.DRAG_RADIUS) {
      // Switch to unrestricted dragging.
      Blockly.Block.dragMode_ = 2;
      // Push this block to the very top of the stack.
      this.setParent(null);
      this.setDragging_(true);
    }
  }
  if (Blockly.Block.dragMode_ == 2) {
    // Unrestricted dragging.
    var x = this.startDragX + dx;
    var y = this.startDragY + dy;
    this.svg_.getRootNode().setAttribute('transform',
                                     'translate(' + x + ', ' + y + ')');
    // Drag all the nested comments.
    for (var x = 0; x < this.draggedBubbles_.length; x++) {
      var commentData = this.draggedBubbles_[x];
      commentData.bubble.setIconLocation(commentData.x + dx,
                                         commentData.y + dy);
    }

    // Check to see if any of this block's connections are within range of
    // another block's connection.
    var myConnections = this.getConnections_(false);
    var closestConnection = null;
    var localConnection = null;
    var radiusConnection = Blockly.SNAP_RADIUS;
    for (var i = 0; i < myConnections.length; i++) {
      var myConnection = myConnections[i];
      var neighbour = myConnection.closest(radiusConnection, dx, dy);
      if (neighbour.connection) {
        closestConnection = neighbour.connection;
        localConnection = myConnection;
        radiusConnection = neighbour.radius;
      }
    }

    // Remove connection highlighting if needed.
    if (Blockly.highlightedConnection_ &&
        Blockly.highlightedConnection_ != closestConnection) {
      Blockly.highlightedConnection_.unhighlight();
      Blockly.highlightedConnection_ = null;
      Blockly.localConnection_ = null;
    }
    // Add connection highlighting if needed.
    if (closestConnection &&
        closestConnection != Blockly.highlightedConnection_) {
      closestConnection.highlight();
      Blockly.highlightedConnection_ = closestConnection;
      Blockly.localConnection_ = localConnection;
    }
    // Flip the trash can lid if needed.
    this.workspace.trashcan && this.workspace.trashcan.onMouseMove(e);
  }
  // This event has been handled.  No need to bubble up to the document.
  e.stopPropagation();
};

/**
 * Bump unconnected blocks out of alignment.  Two blocks which aren't actually
 * connected should not coincidentally line up on screen.
 * @private
 */
Blockly.Block.prototype.bumpNeighbours_ = function() {
  var rootBlock = this.getRootBlock();
  // Loop though every connection on this block.
  var myConnections = this.getConnections_(false);
  for (var x = 0; x < myConnections.length; x++) {
    var connection = myConnections[x];
    // Spider down from this block bumping all sub-blocks.
    if (connection.targetConnection &&
        (connection.type == Blockly.INPUT_VALUE ||
         connection.type == Blockly.NEXT_STATEMENT)) {
      connection.targetBlock().bumpNeighbours_();
    }

    var neighbours = connection.neighbours_(Blockly.SNAP_RADIUS);
    for (var y = 0; y < neighbours.length; y++) {
      var otherConnection = neighbours[y];
      // If both connections are connected, that's probably fine.  But if
      // either one of them is unconnected, then there could be confusion.
      if (!connection.targetConnection || !otherConnection.targetConnection) {
        // Only bump blocks if they are from different tree structures.
        if (otherConnection.sourceBlock_.getRootBlock() != rootBlock) {
          otherConnection.bumpAwayFrom_(connection);
        }
      }
    }
  }
};

/**
 * Return the parent block or null if this block is at the top level.
 * @return {Blockly.Block} The block that holds the current block.
 */
Blockly.Block.prototype.getParent = function() {
  // Look at the DOM to see if we are nested in another block.
  return this.parentBlock_;
};

/**
 * Return the parent block that surrounds the current block, or null if this
 * block has no surrounding block.  A parent block might just be the previous
 * statement, whereas the surrounding block is an if statement, while loop, etc.
 * @return {Blockly.Block} The block that surrounds the current block.
 */
Blockly.Block.prototype.getSurroundParent = function() {
  var block = this;
  while (true) {
    do {
      var prevBlock = block;
      block = block.getParent();
      if (!block) {
        // Ran off the top.
        return null;
      }
    } while (block.nextConnection &&
             block.nextConnection.targetBlock() == prevBlock);
    // This block is an enclosing parent, not just a statement in a stack.
    return block;
  }
};

/**
 * Return the top-most block in this block's tree.
 * This will return itself if this block is at the top level.
 * @return {!Blockly.Block} The root block.
 */
Blockly.Block.prototype.getRootBlock = function() {
  var rootBlock;
  var block = this;
  do {
    rootBlock = block;
    block = rootBlock.parentBlock_;
  } while (block);
  return rootBlock;
};

/**
 * Find all the blocks that are directly nested inside this one.
 * Includes value and block inputs, as well as any following statement.
 * Excludes any connection on an output tab or any preceding statement.
 * @return {!Array.<!Blockly.Block>} Array of blocks.
 */
Blockly.Block.prototype.getChildren = function() {
  return this.childBlocks_;
};

/**
 * Set parent of this block to be a new block or null.
 * @param {Blockly.Block} newParent New parent block.
 */
Blockly.Block.prototype.setParent = function(newParent) {
  if (this.parentBlock_) {
    // Remove this block from the old parent's child list.
    var children = this.parentBlock_.childBlocks_;
    for (var child, x = 0; child = children[x]; x++) {
      if (child == this) {
        children.splice(x, 1);
        break;
      }
    }
    // Move this block up the DOM.  Keep track of x/y translations.
    var xy = this.getRelativeToSurfaceXY();
    this.workspace.getCanvas().appendChild(this.svg_.getRootNode());
    this.svg_.getRootNode().setAttribute('transform',
        'translate(' + xy.x + ', ' + xy.y + ')');

    // Disconnect from superior blocks.
    this.parentBlock_ = null;
    if (this.previousConnection && this.previousConnection.targetConnection) {
      this.previousConnection.disconnect();
    }
    if (this.outputConnection && this.outputConnection.targetConnection) {
      this.outputConnection.disconnect();
    }
    // This block hasn't actually moved on-screen, so there's no need to update
    // its connection locations.
  } else {
    // Remove this block from the workspace's list of top-most blocks.
    this.workspace.removeTopBlock(this);
  }

  this.parentBlock_ = newParent;
  if (newParent) {
    // Add this block to the new parent's child list.
    newParent.childBlocks_.push(this);

    var oldXY = this.getRelativeToSurfaceXY();
    if (newParent.svg_ && this.svg_) {
      newParent.svg_.getRootNode().appendChild(this.svg_.getRootNode());
    }
    var newXY = this.getRelativeToSurfaceXY();
    // Move the connections to match the child's new position.
    this.moveConnections_(newXY.x - oldXY.x, newXY.y - oldXY.y);
  } else {
    this.workspace.addTopBlock(this);
  }
};

/**
 * Find all the blocks that are directly or indirectly nested inside this one.
 * Includes this block in the list.
 * Includes value and block inputs, as well as any following statements.
 * Excludes any connection on an output tab or any preceding statements.
 * @return {!Array.<!Blockly.Block>} Flattened array of blocks.
 */
Blockly.Block.prototype.getDescendants = function() {
  var blocks = [this];
  for (var child, x = 0; child = this.childBlocks_[x]; x++) {
    blocks = blocks.concat(child.getDescendants());
  }
  return blocks;
};

/**
 * Get the colour of a block.
 * @return {string} HSV hue value.
 */
Blockly.Block.prototype.getColour = function() {
  return this.colourHue_;
};

/**
 * Change the colour of a block.
 * @param {number} colourHue HSV hue value.
 */
Blockly.Block.prototype.setColour = function(colourHue) {
  this.colourHue_ = colourHue;
  if (this.svg_) {
    this.svg_.updateColour();
  }
  if (this.mutator) {
    this.mutator.updateColour();
  }
  if (this.comment) {
    this.comment.updateColour();
  }
  if (this.warning) {
    this.warning.updateColour();
  }
  if (this.rendered) {
    //this.render();
  }
};

/**
 * Add an item to the end of the title row.
 * @param {*} title Something to add as a title.
 * @param {string} opt_name Language-neutral identifier which may used to find
 *     this title again.  Should be unique to this block.
 * @return {!Blockly.Field} The title object created.
 */
Blockly.Block.prototype.appendTitle = function(title, opt_name) {
  // Generate a FieldLabel when given a plain text title.
  if (typeof title == 'string') {
    title = new Blockly.FieldLabel(title);
  }
  title.name = opt_name;

  // Add the title to the title row.
  this.titleRow.push(title);

  if (this.svg_) {
    title.init(this);
  }
  if (this.rendered) {
    //this.render();
    // Adding a title will cause the block to change shape.
    this.bumpNeighbours_();
  }
  return title;
};

/**
 * Returns the named title or label from a block.
 * @param {string} name The name of the title.
 * @return {*} Named title, or null if title does not exist.
 * @private
 */
Blockly.Block.prototype.getTitle_ = function(name) {
  for (var x = 0, title; title = this.titleRow[x]; x++) {
    if (title.name === name) {
      return title;
    }
  }
  for (var x = 0, input; input = this.inputList[x]; x++) {
    if (input.label && input.label.name === name) {
      return input.label;
    }
  }
  return null;
};

/**
 * Returns the human-readable text from the title of a block.
 * @param {string} name The name of the title.
 * @return {!string} Text from the title or null if title does not exist.
 */
Blockly.Block.prototype.getTitleText = function(name) {
  var title = this.getTitle_(name);
  if (title) {
    return title.getText();
  }
  return null;
};

/**
 * Returns the language-neutral value from the title of a block.
 * @param {string} name The name of the title.
 * @return {!string} Value from the title or null if title does not exist.
 */
Blockly.Block.prototype.getTitleValue = function(name) {
  var title = this.getTitle_(name);
  if (title) {
    return title.getValue();
  }
  return null;
};

/**
 * Change the title text for a block (e.g. 'choose' or 'remove list item').
 * @param {string} newText Text to be the new title.
 * @param {string} name The name of the title.
 */
Blockly.Block.prototype.setTitleText = function(newText, name) {
  var title = this.getTitle_(name);
  if (title) {
    title.setText(newText);
  } else {
    throw 'Title "' + name + '" not found.';
  }
};

/**
 * Change the title value for a block (e.g. 'CHOOSE' or 'REMOVE').
 * @param {string} newValue Value to be the new title.
 * @param {string} name The name of the title.
 */
Blockly.Block.prototype.setTitleValue = function(newValue, name) {
  var title = this.getTitle_(name);
  if (title) {
    title.setValue(newValue);
  } else {
    throw 'Title "' + name + '" not found.';
  }
};

/**
 * Change the tooltip text for a block.
 * @param {string|!Element} newTip Text for tooltip or a parent element to
 *     link to for its tooltip.
 */
Blockly.Block.prototype.setTooltip = function(newTip) {
  this.tooltip = newTip;
};

/**
 * Set whether this block can chain onto the bottom of another block.
 * @param {boolean} newBoolean True if there can be a previous statement.
 */
Blockly.Block.prototype.setPreviousStatement = function(newBoolean) {
  if (this.previousConnection) {
    if (this.previousConnection.targetConnection) {
      throw 'Must disconnect previous statement before removing connection.';
    }
    this.previousConnection.destroy();
    this.previousConnection = null;
  }
  if (newBoolean) {
    if (this.outputConnection) {
      throw 'Remove output connection prior to adding previous connection.';
    }
    this.previousConnection =
        new Blockly.Connection(this, Blockly.PREVIOUS_STATEMENT, null);
  }
  if (this.rendered) {
    //this.render();
    this.bumpNeighbours_();
  }
};

/**
 * Set whether another block can chain onto the bottom of this block.
 * @param {boolean} newBoolean True if there can be a next statement.
 */
Blockly.Block.prototype.setNextStatement = function(newBoolean) {
  if (this.nextConnection) {
    if (this.nextConnection.targetConnection) {
      throw 'Must disconnect next statement before removing connection.';
    }
    this.nextConnection.destroy();
    this.nextConnection = null;
  }
  if (newBoolean) {
    this.nextConnection =
        new Blockly.Connection(this, Blockly.NEXT_STATEMENT, null);
  }
  if (this.rendered) {
    //this.render();
    this.bumpNeighbours_();
  }
};

/**
 * Set whether this block returns a value.
 * @param {boolean} newBoolean True if there is an output.
 * @param {Object} check Returned type or list of returned types.
 *     Null if any type could be returned (e.g. variable get).
 */
Blockly.Block.prototype.setOutput = function(newBoolean, check) {
  if (this.outputConnection) {
    if (this.outputConnection.targetConnection) {
      throw 'Must disconnect output value before removing connection.';
    }
    this.outputConnection.destroy();
    this.outputConnection = null;
  }
  if (newBoolean) {
    if (this.previousConnection) {
      throw 'Remove previous connection prior to adding output connection.';
    }
    this.outputConnection =
        new Blockly.Connection(this, Blockly.OUTPUT_VALUE, check);
  }
  if (this.rendered) {
    //this.render();
    this.bumpNeighbours_();
  }
};

/**
 * Set whether value inputs are arranged horizontally or vertically.
 * @param {boolean} newBoolean True if inputs are horizontal.
 */
Blockly.Block.prototype.setInputsInline = function(newBoolean) {
  this.inputsInline = newBoolean;
  if (this.rendered) {
    //this.render();
    this.bumpNeighbours_();
  }
};

/**
 * Set whether the block is disabled or not.
 * @param {boolean} disabled True if disabled.
 */
Blockly.Block.prototype.setDisabled = function(disabled) {
  if (this.disabled == disabled) {
    return;
  }
  this.disabled = disabled;
  this.svg_.updateDisabled();
  this.workspace.fireChangeEvent();
};

/**
 * Get whether the block is disabled or not due to parents.
 * The block's own disabled property is not considered.
 * @return {boolean} True if disabled.
 */
Blockly.Block.prototype.getInheritedDisabled = function() {
  var block = this;
  while (true) {
    var block = block.getSurroundParent();
    if (!block) {
      // Ran off the top.
      return false;
    } else if (block.disabled) {
      return true;
    }
  }
};

/**
 * Set whether the block is collapsed or not.
 * @param {boolean} collapsed True if collapsed.
 */
Blockly.Block.prototype.setCollapsed = function(collapsed) {
  if (this.collapsed == collapsed) {
    return;
  }
  this.collapsed = collapsed;
  // Show/hide the inputs.
  var display = collapsed ? 'none' : 'block';
  var renderList = [];
  for (var x = 0, input; input = this.inputList[x]; x++) {
    if (input.label) {
      var labelElement = input.label.getRootElement ?
          input.label.getRootElement() : input.label;
      //labelElement.style.display = display;
    }
    if (input.targetBlock) {
      // This is a connection.
      if (collapsed) {
        input.hideAll();
      } else {
        renderList = renderList.concat(input.unhideAll());
      }
      var child = input.targetBlock();
      if (child) {
        //child.svg_.getRootNode().style.display = display;
        if (collapsed) {
          child.rendered = false;
        }
      }
    } else if (input.getText) {
      // This is a local variable.
      input.setVisible(!collapsed);
    }
  }

  if (collapsed && this.mutator) {
    this.mutator.setPinned(false);
  }
  if (collapsed && this.comment) {
    this.comment.setPinned(false);
  }
  if (collapsed && this.warning) {
    this.warning.setPinned(false);
  }

  if (renderList.length == 0) {
    // No child blocks, just render this block.
    renderList[0] = this;
  }
  if (this.rendered) {
    for (var x = 0, block; block = renderList[x]; x++) {
      //block.render();
    }
    this.bumpNeighbours_();
  }
};

/**
 * Add a value input, statement input or local variable to this block.
 * @param {string|Array} label Printed next to the input (e.g. 'x' or 'do').
 *     If the label is an editable field, this argument should be a tuple with
 *     the field and its name.
 * @param {number} type Either Blockly.INPUT_VALUE or Blockly.NEXT_STATEMENT or
 *     Blockly.LOCAL_VARIABLE, or Blockly.DUMMY_INPUT.
 * @param {string} name Language-neutral identifier which may used to find this
 *     input again.  Should be unique to this block.
 * @param {Object} opt_check Acceptable value type, or list of value types.
 *     Null or undefined means all values are acceptable.
 * @return {!Object} The input object created.
 */
Blockly.Block.prototype.appendInput = function(label, type, name, opt_check) {
  // Create descriptive text element.
  var textElement = null;
  if (label) {
    var labelElement = label;
    var labelName = null;
    if (label instanceof Array) {
      // Editable label with name.
      labelElement = label[0];
      labelName = label[1];
    }
    if (typeof labelElement == 'string') {
      // Text label.
      labelElement = new Blockly.FieldLabel(labelElement);
    }
    textElement = labelElement;
    textElement.name = labelName;
    //if (this.svg_) {
    //  textElement.init(this);
    //}
  }
  var input;
  if (type == Blockly.DUMMY_INPUT) {
    // Dummy input is used to show a label.
    input = {};
    input.type = type;
  } else if (type == Blockly.LOCAL_VARIABLE) {
    input.type = Blockly.LOCAL_VARIABLE;
  } else {
    input = new Blockly.Connection(this, type, opt_check);
  }
  input.label = textElement;
  input.name = name;
  // Append input to list.
  this.inputList.push(input);
  if (this.rendered) {
    //this.render();
    // Adding an input will cause the block to change shape.
    this.bumpNeighbours_();
  }
  return input;
};

/**
 * Remove an input from this block.
 * @param {string} name The name of the input.
 */
Blockly.Block.prototype.removeInput = function(name) {
  for (var x = 0, input; input = this.inputList[x]; x++) {
    if (input.name == name) {
      if (input.targetConnection) {
        // Disconnect any attached block.
        input.targetBlock().setParent(null);
      }
      var field = input.label;
      if (field) {
        field.destroy();
      }
      if (input.destroy) {
        input.destroy();
      }
      this.inputList.splice(x, 1);
      if (this.rendered) {
        //this.render();
        // Removing an input will cause the block to change shape.
        this.bumpNeighbours_();
      }
      return;
    }
  }
  throw 'Input "' + name + '" not found.';
};

/**
 * Fetches the named input object.
 * @param {string} name The name of the input.
 * @return {Object} The input object, or null of the input does not exist.
 */
Blockly.Block.prototype.getInput = function(name) {
  for (var x = 0, input; input = this.inputList[x]; x++) {
    if (input.name == name) {
      return input;
    }
  }
  // This input does not exist.
  return null;
};

/**
 * Fetches the block attached to the named input.
 * @param {string} name The name of the input.
 * @return {Blockly.Block} The attached value block, or null if the input is
 *     either disconnected or if the input does not exist.
 */
Blockly.Block.prototype.getInputTargetBlock = function(name) {
  var input = this.getInput(name);
  return input && input.targetBlock();
};

/**
 * Gets the variable name attached to the named variable input.
 * @param {string} name The name of the input.
 * @return {string} The variable name, or null if the input does not exist.
 */
Blockly.Block.prototype.getInputVariable = function(name) {
  var input = this.getInput(name);
  return input && input.getText();
};

/**
 * Sets the variable name attached to the named variable input.
 * @param {string} name The name of the input.
 * @param {string} text The new variable name.
 */
Blockly.Block.prototype.setInputVariable = function(name, text) {
  var input = this.getInput(name);
  if (!input) {
    throw 'Input does not exist.';
  }
  input.setText(text);
};

/**
 * Give this block a mutator dialog.
 * @param {Blockly.Mutator} mutator A mutator dialog instance or null to remove.
 */
Blockly.Block.prototype.setMutator = function(mutator) {
  if (this.mutator && this.mutator !== mutator) {
    this.mutator.destroy();
  }
  if (mutator) {
    mutator.block_ = this;
    this.mutator = mutator;
    if (this.svg_) {
      mutator.createIcon();
    }
  }
};

/**
 * Returns the comment on this block (or '' if none).
 * @return {string} Block's comment.
 */
Blockly.Block.prototype.getCommentText = function() {
  if (this.comment) {
    var comment = this.comment.getText();
    // Trim off trailing whitespace.
    return comment.replace(/\s+$/, '').replace(/ +\n/g, '\n');
  }
  return '';
};

/**
 * Set this block's comment text.
 * @param {?string} text The text, or null to delete.
 */
Blockly.Block.prototype.setCommentText = function(text) {
  if (!Blockly.Comment) {
    throw 'Comments not supported.';
  }
  var changedState = false;
  if (typeof text == 'string') {
    if (!this.comment) {
      this.comment = new Blockly.Comment(this);
      changedState = true;
    }
    this.comment.setText(text);
  } else {
    if (this.comment) {
      this.comment.destroy();
      changedState = true;
    }
  }
  if (this.rendered) {
    //this.render();
    if (changedState) {
      // Adding or removing a comment icon will cause the block to change shape.
      this.bumpNeighbours_();
    }
  }
};

/**
 * Set this block's warning text.
 * @param {?string} text The text, or null to delete.
 */
Blockly.Block.prototype.setWarningText = function(text) {
  if (!Blockly.Warning) {
    throw 'Warnings not supported.';
  }
  var changedState = false;
  if (typeof text == 'string') {
    if (!this.warning) {
      this.warning = new Blockly.Warning(this);
      changedState = true;
    }
    this.warning.setText(text);
  } else {
    if (this.warning) {
      this.warning.destroy();
      changedState = true;
    }
  }
  if (this.rendered) {
    //this.render();
    if (changedState) {
      // Adding or removing a warning icon will cause the block to change shape.
      this.bumpNeighbours_();
    }
  }
};

/**
 * Render the block.
 * Lays out and reflows a block based on its contents and settings.
 */
Blockly.Block.prototype.render = function() {
  //this.svg_.render();
};

/**
 * Class for an editable field.
 * @param {?string} text The initial content of the field.
 * @constructor
 */
Blockly.Field = function(text) {
  if (text === null) {
    // This is a Field instance to be used in inheritance.
    return;
  }
  this.sourceBlock_ = null;
  // Build the DOM.
  //this.group_ = Blockly.createSvgElement('g', {}, null);
  //this.borderRect_ = Blockly.createSvgElement('rect',
  //    {rx: 4, ry: 4}, this.group_);
  //this.textElement_ = Blockly.createSvgElement('text',
  //    {'class': 'blocklyText'}, this.group_);
  if (this.CURSOR) {
    // Different field types show different cursor hints.
    //this.group_.style.cursor = this.CURSOR;
  }
  this.setText(text);
};

/**
 * Non-breaking space.
 */
Blockly.Field.NBSP = '\u00A0';

/**
 * Editable fields are saved by the XML renderer, non-editable fields are not.
 */
Blockly.Field.prototype.EDITABLE = true;

/**
 * Install this field on a block.
 * @param {!Blockly.Block} block The block containing this field.
 */
Blockly.Field.prototype.init = function(block) {
  if (this.sourceBlock_) {
    throw 'Field has already been initialized once.';
  }
  this.sourceBlock_ = block;
  this.group_.setAttribute('class',
      block.editable ? 'blocklyEditableText' : 'blocklyNonEditableText');
  block.getSvgRoot().appendChild(this.group_);
  if (block.editable) {
    this.mouseUpWrapper_ =
        Blockly.bindEvent_(this.group_, 'mouseup', this, this.onMouseUp_);
  }
};

/**
 * Destroy all DOM objects belonging to this editable field.
 */
Blockly.Field.prototype.destroy = function() {
  if (this.mouseUpWrapper_) {
    Blockly.unbindEvent_(this.mouseUpWrapper_);
    this.mouseUpWrapper_ = null;
  }
  this.sourceBlock_ = null;
  this.group_.parentNode.removeChild(this.group_);
  this.group_ = null;
  this.textElement_ = null;
  this.borderRect_ = null;
};

/**
 * Sets whether this editable field is visible or not.
 * @param {boolean} visible True if visible.
 */
Blockly.Field.prototype.setVisible = function(visible) {
  //this.getRootElement().style.display = visible ? 'block' : 'none';
};

/**
 * Gets the group element for this editable field.
 * Used for measuring the size and for positioning.
 * @return {!Element} The group element.
 */
Blockly.Field.prototype.getRootElement = function() {
  return this.group_;
};

/**
 * Draws the border in the correct location.
 * Returns the resulting bounding box.
 * @return {Object} Object containing width/height/x/y properties.
 */
Blockly.Field.prototype.render = function() {
  try {
    var bBox = this.textElement_.getBBox();
  } catch (e) {
    // Firefox has trouble with hidden elements (Bug 528969).
    return null;
  }
  if (bBox.height == 0) {
    bBox.height = 18;
  }
  var width = bBox.width + Blockly.BlockSvg.SEP_SPACE_X;
  var height = bBox.height;
  var left = bBox.x - Blockly.BlockSvg.SEP_SPACE_X / 2;
  var top = bBox.y;
  this.borderRect_.setAttribute('width', width);
  this.borderRect_.setAttribute('height', height);
  this.borderRect_.setAttribute('x', left);
  this.borderRect_.setAttribute('y', top);
  return bBox;
};

/**
 * Returns the width of the title.
 * @return {number} Width.
 */
Blockly.Field.prototype.width = function() {
  var bBox = null; //this.render();
  if (!bBox) {
    // Firefox has trouble with hidden elements (Bug 528969).
    return 0;
  }
  if (bBox.width == -Infinity) {
    // Opera has trouble with bounding boxes around empty objects.
    return 0;
  }
  return bBox.width;
};

/**
 * Get the text from this field.
 * @return {string} Current text.
 */
Blockly.Field.prototype.getText = function() {
  return this.text_;
};

/**
 * Set the text in this field.  Trigger a rerender of the source block.
 * @param {string} text New text.
 */
Blockly.Field.prototype.setText = function(text) {
  this.text_ = text;
  // Empty the text element.
  //Blockly.removeChildren_(this.textElement_);
  // Replace whitespace with non-breaking spaces so the text doesn't collapse.
  text = text.replace(/\s/g, Blockly.Field.NBSP);
  if (!text) {
    // Prevent the field from disappearing if empty.
    text = Blockly.Field.NBSP;
  }
  var textNode = {'text': text };
  //this.textElement_.appendChild(textNode);

  if (this.sourceBlock_ && this.sourceBlock_.rendered) {
    //this.sourceBlock_.render();
    this.sourceBlock_.bumpNeighbours_();
    this.sourceBlock_.workspace.fireChangeEvent();
  }
};

/**
 * By default there is no difference between the human-readable text and
 * the language-neutral values.  Subclasses (such as dropdown) may define this.
 * @return {string} Current text.
 */
Blockly.Field.prototype.getValue = function() {
  return this.getText();
};

/**
 * By default there is no difference between the human-readable text and
 * the language-neutral values.  Subclasses (such as dropdown) may define this.
 * @param {string} text New text.
 */
Blockly.Field.prototype.setValue = function(text) {
  this.setText(text);
};

/**
 * Handle a mouse up event on an editable field.
 * @param {!Event} e Mouse up event.
 * @private
 */
Blockly.Field.prototype.onMouseUp_ = function(e) {
  if (Blockly.isRightButton(e)) {
    // Right-click.
    return;
  } else if (Blockly.Block.dragMode_ == 2) {
    // Drag operation is concluding.  Don't open the editor.
    return;
  }
  // Non-abstract sub-classes must define a showEditor_ method.
  this.showEditor_();
};

/**
 * Change the tooltip text for this field.
 * @param {string|!Element} newTip Text for tooltip or a parent element to
 *     link to for its tooltip.
 */
Blockly.Field.prototype.setTooltip = function(newTip) {
  // Non-abstract sub-classes may wish to implement this.  See FieldLabel.
};


/**
 * Class for a non-editable field.
 * @param {string} text The initial content of the field.
 * @constructor
 */
Blockly.FieldLabel = function(text) {
  this.sourceBlock_ = null;
  // Build the DOM.
  this.textElement_ = { 'text': '' };
  this.setText(text);
};

// Text is a subclass of Field.
Blockly.FieldLabel.prototype = new Blockly.Field(null);

/**
 * Editable fields are saved by the XML renderer, non-editable fields are not.
 */
Blockly.FieldLabel.prototype.EDITABLE = false;

/**
 * Install this text on a block.
 * @param {!Blockly.Block} block The block containing this text.
 */
Blockly.FieldLabel.prototype.init = function(block) {
  if (this.sourceBlock_) {
    throw 'Text has already been initialized once.';
  }
  this.sourceBlock_ = block;
  block.getSvgRoot().appendChild(this.textElement_);

  // Configure the field to be transparent with respect to tooltips.
  this.textElement_.tooltip = this.sourceBlock_;
  Blockly.Tooltip && Blockly.Tooltip.bindMouseEvents(this.textElement_);
};

/**
 * Destroy all DOM objects belonging to this text.
 */
Blockly.FieldLabel.prototype.destroy = function() {
  this.textElement_.parentNode.removeChild(this.textElement_);
  this.textElement_ = null;
};

/**
 * Gets the group element for this field.
 * Used for measuring the size and for positioning.
 * @return {!Element} The group element.
 */
Blockly.FieldLabel.prototype.getRootElement = function() {
  return this.textElement_;
};

/**
 * Returns the resulting bounding box.
 * @return {Object} Object containing width/height/x/y properties.
 */
Blockly.FieldLabel.prototype.render = function() {
  try {
    var bBox = this.textElement_.getBBox();
  } catch (e) {
    // Firefox has trouble with hidden elements (Bug 528969).
    return null;
  }
  if (bBox.height == 0) {
    bBox.height = 18;
  }
  return bBox;
};

/**
 * Change the tooltip text for this field.
 * @param {string|!Element} newTip Text for tooltip or a parent element to
 *     link to for its tooltip.
 */
Blockly.FieldLabel.prototype.setTooltip = function(newTip) {
  this.textElement_.tooltip = newTip;
};

/**
 * Class for a connection between blocks.
 * @param {!Blockly.Block} source The block establishing this connection.
 * @param {number} type The type of the connection.
 * @param {string} opt_check Compatible value type or list of value types.
 *     Null if all types are compatible.
 * @constructor
 */
Blockly.Connection = function(source, type, opt_check) {
  this.sourceBlock_ = source;
  this.targetConnection = null;
  this.type = type;
  if (opt_check) {
    // Ensure that check is in an array.
    if (!(opt_check instanceof Array)) {
      opt_check = [opt_check];
    }
    this.check_ = opt_check;
  } else {
    this.check_ = null;
  }
  this.x_ = 0;
  this.y_ = 0;
  this.inDB_ = false;
  // Shortcut for the databases for this connection's workspace.
  this.dbList_ = this.sourceBlock_.workspace.connectionDBList;
};

/**
 * Sever all links to this connection (not including from the source object).
 */
Blockly.Connection.prototype.destroy = function() {
  if (this.targetConnection) {
    throw 'Disconnect connection before destroying it.';
  }
  if (this.inDB_) {
    this.dbList_[this.type].removeConnection_(this);
  }
  this.inDB_ = false;
  if (Blockly.highlightedConnection_ == this) {
    Blockly.highlightedConnection_ = null;
  }
  if (Blockly.localConnection_ == this) {
    Blockly.localConnection_ = null;
  }
};

/**
 * Connect this connection to another connection.
 * @param {!Blockly.Connection} otherConnection Connection to connect to.
 */
Blockly.Connection.prototype.connect = function(otherConnection) {
  if (this.sourceBlock_ == otherConnection.sourceBlock_) {
    throw 'Attempted to connect a block to itself.';
  }
  if (this.sourceBlock_.workspace !== otherConnection.sourceBlock_.workspace) {
    throw 'Blocks are on different workspaces.';
  }
  if (Blockly.OPPOSITE_TYPE[this.type] != otherConnection.type) {
    throw 'Attempt to connect incompatible types.';
  }
  if (this.type == Blockly.INPUT_VALUE || this.type == Blockly.OUTPUT_VALUE) {
    if (this.targetConnection) {
      // Can't make a value connection if male block is already connected.
      throw 'Source connection already connected (value).';
    } else if (otherConnection.targetConnection) {
      // If female block is already connected, disconnect and bump the male.
      var orphanBlock = otherConnection.targetBlock();
      orphanBlock.setParent(null);
      // Attempt to reattach the orphan at the end of the newly inserted
      // block.  Since this block may be a row, walk down to the end.
      function singleInput(block) {
        var input = false;
        for (var x = 0; x < block.inputList.length; x++) {
          if (block.inputList[x].type == Blockly.INPUT_VALUE &&
              orphanBlock.outputConnection.checkType_(block.inputList[x])) {
            if (input) {
              return null;  // More than one input.
            }
            input = block.inputList[x];
          }
        }
        return input;
      };
      var newBlock = this.sourceBlock_;
      var connection;
      while (connection = singleInput(newBlock)) {  // '=' is intentional.
        if (connection.targetBlock()) {
          newBlock = connection.targetBlock();
        } else {
          connection.connect(orphanBlock.outputConnection);
          orphanBlock = null;
          break;
        }
      }
      if (orphanBlock) {
        // Unable to reattach orphan.  Bump it off to the side.
        setTimeout(function() {
              orphanBlock.outputConnection.bumpAwayFrom_(otherConnection);
            }, Blockly.BUMP_DELAY);
      }
    }
  } else {
    if (this.targetConnection) {
      throw 'Source connection already connected (block).';
    } else if (otherConnection.targetConnection) {
      // Statement blocks may be inserted into the middle of a stack.
      if (this.type != Blockly.PREVIOUS_STATEMENT) {
        throw 'Can only do a mid-stack connection with the top of a block.';
      }
      // Split the stack.
      var orphanBlock = otherConnection.targetBlock();
      orphanBlock.setParent(null);
      // Attempt to reattach the orphan at the bottom of the newly inserted
      // block.  Since this block may be a stack, walk down to the end.
      var newBlock = this.sourceBlock_;
      while (newBlock.nextConnection) {
        if (newBlock.nextConnection.targetConnection) {
          newBlock = newBlock.nextConnection.targetBlock();
        } else {
          newBlock.nextConnection.connect(orphanBlock.previousConnection);
          orphanBlock = null;
          break;
        }
      }
      if (orphanBlock) {
        // Unable to reattach orphan.  Bump it off to the side.
        setTimeout(function() {
              orphanBlock.previousConnection.bumpAwayFrom_(otherConnection);
            }, Blockly.BUMP_DELAY);
      }
    }
  }

  // Determine which block is superior (higher in the source stack)
  var parentBlock, childBlock;
  if (this.type == Blockly.INPUT_VALUE || this.type == Blockly.NEXT_STATEMENT) {
    // Superior block.
    parentBlock = this.sourceBlock_;
    childBlock = otherConnection.sourceBlock_;
  } else {
    // Inferior block.
    parentBlock = otherConnection.sourceBlock_;
    childBlock = this.sourceBlock_;
  }

  // Establish the connections.
  this.targetConnection = otherConnection;
  otherConnection.targetConnection = this;

  // Demote the inferior block so that one is a child of the superior one.
  childBlock.setParent(parentBlock);

  // Rendering a node will move its connected children into position.
  if (parentBlock.rendered) {
    parentBlock.svg_.updateDisabled();
    //parentBlock.render();
  }
  if (childBlock.rendered) {
    childBlock.svg_.updateDisabled();
  }
};

/**
 * Disconnect this connection.
 */
Blockly.Connection.prototype.disconnect = function() {
  var otherConnection = this.targetConnection;
  if (!otherConnection) {
    throw 'Source connection not connected.';
  } else if (otherConnection.targetConnection != this) {
    throw 'Target connection not connected to source connection.';
  }
  otherConnection.targetConnection = null;
  this.targetConnection = null;

  // Rerender the parent so that it may reflow.
  var parentBlock, childBlock;
  if (this.type == Blockly.INPUT_VALUE || this.type == Blockly.NEXT_STATEMENT) {
    // Superior block.
    parentBlock = this.sourceBlock_;
    childBlock = otherConnection.sourceBlock_;
  } else {
    // Inferior block.
    parentBlock = otherConnection.sourceBlock_;
    childBlock = this.sourceBlock_;
  }
  if (parentBlock.rendered) {
    //parentBlock.render();
  }
  if (childBlock.rendered) {
    childBlock.svg_.updateDisabled();
  }
};

/**
 * Returns the block that this connection connects to.
 * @return {Blockly.Block} The connected block or null if none is connected.
 */
Blockly.Connection.prototype.targetBlock = function() {
  if (this.targetConnection) {
    return this.targetConnection.sourceBlock_;
  }
  return null;
};

/**
 * Move the block(s) belonging to the connection to a point where they don't
 * visually interfere with the specified connection.
 * @param {!Blockly.Connection} staticConnection The connection to move away
 *     from.
 * @private
 */
Blockly.Connection.prototype.bumpAwayFrom_ = function(staticConnection) {
  if (Blockly.Block.dragMode_ != 0) {
    // Don't move blocks around while the user is doing the same.
    return;
  }
  // Move the root block.
  var rootBlock = this.sourceBlock_.getRootBlock();
  var reverse = false;
  if (!rootBlock.editable) {
    // Can't bump an uneditable block away.
    // Check to see if the other block is editable.
    rootBlock = staticConnection.sourceBlock_.getRootBlock();
    if (!rootBlock.editable) {
      return;
    }
    // Swap the connections and move the 'static' connection instead.
    staticConnection = this;
    reverse = true;
  }
  // Raise it to the top for extra visibility.
  rootBlock.getSvgRoot().parentNode.appendChild(rootBlock.getSvgRoot());
  var dx = (staticConnection.x_ + Blockly.SNAP_RADIUS) - this.x_;
  var dy = (staticConnection.y_ + Blockly.SNAP_RADIUS * 2) - this.y_;
  if (reverse) {
    // When reversing a bump due to an uneditable block, bump up.
    dy = -dy;
  }
  if (Blockly.RTL) {
    dx = -dx;
  }
  rootBlock.moveBy(dx, dy);
};

/**
 * Change the connection's coordinates.
 * @param {number} x New absolute x coordinate.
 * @param {number} y New absolute y coordinate.
 */
Blockly.Connection.prototype.moveTo = function(x, y) {
  // Remove it from its old location in the database (if already present)
  if (this.inDB_) {
    this.dbList_[this.type].removeConnection_(this);
  }
  this.x_ = x;
  this.y_ = y;
  // Insert it into its new location in the database.
  this.dbList_[this.type].addConnection_(this);
};

/**
 * Change the connection's coordinates.
 * @param {number} dx Change to x coordinate.
 * @param {number} dy Change to y coordinate.
 */
Blockly.Connection.prototype.moveBy = function(dx, dy) {
  this.moveTo(this.x_ + dx, this.y_ + dy);
};

/**
 * Add highlighting around this connection.
 */
Blockly.Connection.prototype.highlight = function() {
  var steps;
  if (this.type == Blockly.INPUT_VALUE || this.type == Blockly.OUTPUT_VALUE) {
    var tabWidth = Blockly.RTL ? -Blockly.BlockSvg.TAB_WIDTH :
                                 Blockly.BlockSvg.TAB_WIDTH;
    steps = 'm 0,0 v 5 c 0,10 ' + -tabWidth + ',-8 ' + -tabWidth + ',7.5 s ' +
            tabWidth + ',-2.5 ' + tabWidth + ',7.5 v 5';
  } else {
    if (Blockly.RTL) {
      steps = 'm 20,0 h -5 l -6,4 -3,0 -6,-4 h -5';
    } else {
      steps = 'm -20,0 h 5 l 6,4 3,0 6,-4 h 5';
    }
  }
  var xy = this.sourceBlock_.getRelativeToSurfaceXY();
  var x = this.x_ - xy.x;
  var y = this.y_ - xy.y;
  //Blockly.Connection.highlightedPath_ = Blockly.createSvgElement('path',
  //    {'class': 'blocklyHighlightedConnectionPath',
  //     d: steps,
  //     transform: 'translate(' + x + ', ' + y + ')'},
  //    this.sourceBlock_.getSvgRoot());
};

/**
 * Remove the highlighting around this connection.
 */
Blockly.Connection.prototype.unhighlight = function() {
  var path = Blockly.Connection.highlightedPath_;
  path.parentNode.removeChild(path);
  delete Blockly.Connection.highlightedPath_;
};

/**
 * Move the blocks on either side of this connection right next to each other.
 * @private
 */
Blockly.Connection.prototype.tighten_ = function() {
  var dx = Math.round(this.targetConnection.x_ - this.x_);
  var dy = Math.round(this.targetConnection.y_ - this.y_);
  if (dx != 0 || dy != 0) {
    var block = this.targetBlock();
    var xy = Blockly.getRelativeXY_(block.getSvgRoot());
    block.getSvgRoot().setAttribute('transform',
        'translate(' + (xy.x - dx) + ', ' + (xy.y - dy) + ')');
    block.moveConnections_(-dx, -dy);
  }
};

/**
 * Find the closest compatible connection to this connection.
 * @param {number} maxLimit The maximum radius to another connection.
 * @param {number} dx Horizontal offset between this connection's location
 *     in the database and the current location (as a result of dragging).
 * @param {number} dy Vertical offset between this connection's location
 *     in the database and the current location (as a result of dragging).
 * @return {!Object} Contains two properties: 'connection' which is either
 *     another connection or null, and 'radius' which is the distance.
 */
Blockly.Connection.prototype.closest = function(maxLimit, dx, dy) {
  if (this.targetConnection) {
    // Don't offer to connect to a connection that's already connected.
    return {connection: null, radius: maxLimit};
  }
  // Determine the opposite type of connection.
  var oppositeType = Blockly.OPPOSITE_TYPE[this.type];
  var db = this.dbList_[oppositeType];

  // Since this connection is probably being dragged, add the delta.
  var currentX = this.x_ + dx;
  var currentY = this.y_ + dy;

  // Binary search to find the closest y location.
  var pointerMin = 0;
  var pointerMax = db.length - 2;
  var pointerMid = pointerMax;
  while (pointerMin < pointerMid) {
    if (db[pointerMid].y_ < currentY) {
      pointerMin = pointerMid;
    } else {
      pointerMax = pointerMid;
    }
    pointerMid = Math.floor((pointerMin + pointerMax) / 2);
  }

  // Walk forward and back on the y axis looking for the closest x,y point.
  pointerMin = pointerMid;
  pointerMax = pointerMid;
  var closestConnection = null;
  var sourceBlock = this.sourceBlock_;
  var thisConnection = this;
  if (db.length) {
    while (pointerMin >= 0 && checkConnection_(pointerMin)) {
      pointerMin--;
    }
    do {
      pointerMax++;
    } while (pointerMax < db.length && checkConnection_(pointerMax));
  }

  /**
   * Computes if the current connection is within the allowed radius of another
   * connection.
   * This function is a closure and has access to outside variables.
   * @param {number} yIndex The other connection's index in the database.
   * @return {boolean} True if the search needs to continue: either the current
   *     connection's vertical distance from the other connection is less than
   *     the allowed radius, or if the connection is not compatible.
   */
  function checkConnection_(yIndex) {
    var connection = db[yIndex];
    if (connection.type == Blockly.OUTPUT_VALUE ||
        connection.type == Blockly.PREVIOUS_STATEMENT) {
      // Don't offer to connect an already connected left (male) value plug to
      // an available right (female) value plug.  Don't offer to connect the
      // bottom of a statement block to one that's already connected.
      if (connection.targetConnection) {
        return true;
      }
    }
    // Offering to connect the top of a statement block to an already connected
    // connection is ok, we'll just insert it into the stack.
    // Offering to connect the left (male) of a value block to an already
    // connected value pair is ok, we'll splice it in.

    // Do type checking.
    if (!thisConnection.checkType_(connection)) {
      return true;
    }

    // Don't let blocks try to connect to themselves or ones they nest.
    var targetSourceBlock = connection.sourceBlock_;
    do {
      if (sourceBlock == targetSourceBlock) {
        return true;
      }
      targetSourceBlock = targetSourceBlock.getParent();
    } while (targetSourceBlock);

    var dx = currentX - db[yIndex].x_;
    var dy = currentY - db[yIndex].y_;
    var r = Math.sqrt(dx * dx + dy * dy);
    if (r <= maxLimit) {
      closestConnection = db[yIndex];
      maxLimit = r;
    }
    return dy < maxLimit;
  }
  return {connection: closestConnection, radius: maxLimit};
};

/**
 * Is this connection compatible with another connection with respect to the
 * value type system.  E.g. square_root("Hello") is not compatible.
 * @param {!Blockly.Connection} otherConnection Connection to compare against.
 * @return {boolean} True if the connections share a type.
 * @private
 */
Blockly.Connection.prototype.checkType_ = function(otherConnection) {
  if (!this.check_ || !otherConnection.check_) {
    // One or both sides are promiscuous enough that anything will fit.
    return true;
  }
  // Find any intersection in the check lists.
  for (var x = 0; x < this.check_.length; x++) {
    if (otherConnection.check_.indexOf(this.check_[x]) != -1) {
      return true;
    }
  }
  // No intersection.
  return false;
};

/**
 * Find all nearby compatible connections to this connection.
 * Type checking does not apply, since this function is used for bumping.
 * @param {number} maxLimit The maximum radius to another connection.
 * @return {!Array.<Blockly.Connection>} List of connections.
 * @private
 */
Blockly.Connection.prototype.neighbours_ = function(maxLimit) {
  // Determine the opposite type of connection.
  var oppositeType = Blockly.OPPOSITE_TYPE[this.type];
  var db = this.dbList_[oppositeType];

  var currentX = this.x_;
  var currentY = this.y_;

  // Binary search to find the closest y location.
  var pointerMin = 0;
  var pointerMax = db.length - 2;
  var pointerMid = pointerMax;
  while (pointerMin < pointerMid) {
    if (db[pointerMid].y_ < currentY) {
      pointerMin = pointerMid;
    } else {
      pointerMax = pointerMid;
    }
    pointerMid = Math.floor((pointerMin + pointerMax) / 2);
  }

  // Walk forward and back on the y axis looking for the closest x,y point.
  pointerMin = pointerMid;
  pointerMax = pointerMid;
  var neighbours = [];
  var sourceBlock = this.sourceBlock_;
  if (db.length) {
    while (pointerMin >= 0 && checkConnection_(pointerMin)) {
      pointerMin--;
    }
    do {
      pointerMax++;
    } while (pointerMax < db.length && checkConnection_(pointerMax));
  }

  /**
   * Computes if the current connection is within the allowed radius of another
   * connection.
   * This function is a closure and has access to outside variables.
   * @param {number} yIndex The other connection's index in the database.
   * @return {boolean} True if the current connection's vertical distance from
   *     the other connection is less than the allowed radius.
   */
  function checkConnection_(yIndex) {
    var dx = currentX - db[yIndex].x_;
    var dy = currentY - db[yIndex].y_;
    var r = Math.sqrt(dx * dx + dy * dy);
    if (r <= maxLimit) {
      neighbours.push(db[yIndex]);
    }
    return dy < maxLimit;
  }
  return neighbours;
};

/**
 * Hide this connection, as well as all down-stream connections on any block
 * attached to this connection.  This happens when a block is collapsed.
 * Also hides down-stream comments.
 */
Blockly.Connection.prototype.hideAll = function() {
  if (this.inDB_) {
    this.dbList_[this.type].removeConnection_(this);
  }
  if (this.targetConnection) {
    var blocks = this.targetBlock().getDescendants();
    for (var b = 0; b < blocks.length; b++) {
      var block = blocks[b];
      // Hide all connections of all children.
      var connections = block.getConnections_(true);
      for (var c = 0; c < connections.length; c++) {
        var connection = connections[c];
        if (connection.inDB_) {
          this.dbList_[connection.type].removeConnection_(connection);
        }
      }
      // Hide all comments of all children.
      if (block.comment) {
        block.comment.setVisible_(false);
      }
    }
  }
};

/**
 * Unhide this connection, as well as all down-stream connections on any block
 * attached to this connection.  This happens when a block is expanded.
 * Also unhides down-stream comments.
 * @return {!Array.<Blockly.Block>} List of blocks to render.
 */
Blockly.Connection.prototype.unhideAll = function() {
  if (!this.inDB_) {
    this.dbList_[this.type].addConnection_(this);
  }
  // All blocks that need unhiding must be unhidden before any rendering takes
  // place, since rendering requires knowing the dimensions of lower blocks.
  // Also, since rendering a block renders all its parents, we only need to
  // render the leaf nodes.
  var renderList = [];
  if (this.type != Blockly.INPUT_VALUE && this.type != Blockly.NEXT_STATEMENT) {
    // Only spider down.
    return renderList;
  }
  var block = this.targetBlock();
  if (block) {
    var connections;
    if (block.collapsed) {
      // This block should only be partially revealed since it is collapsed.
      connections = [];
      block.outputConnection && connections.push(block.outputConnection);
      block.nextConnection && connections.push(block.nextConnection);
      block.previousConnection && connections.push(block.previousConnection);
    } else {
      // Show all connections of this block.
      connections = block.getConnections_(true);
    }
    for (var c = 0; c < connections.length; c++) {
      renderList = renderList.concat(connections[c].unhideAll());
    }
    if (renderList.length == 0) {
      // Leaf block.
      renderList[0] = block;
    }
    // Show any pinned comments.
    if (block.comment && block.comment.isPinned()) {
        block.comment.setVisible_(true);
    }
  }
  return renderList;
};


/**
 * Database of connections.
 * Connections are stored in order of their vertical component.  This way
 * connections in an area may be looked up quickly using a binary search.
 * @constructor
 */
Blockly.ConnectionDB = function() {
};

Blockly.ConnectionDB.prototype = new Array();

/**
 * Add a connection to the database.  Must not already exist in DB.
 * @param {!Blockly.Connection} connection The connection to be added.
 * @private
 */
Blockly.ConnectionDB.prototype.addConnection_ = function(connection) {
  if (connection.inDB_) {
    throw 'Connection already in database.';
  }
  // Insert connection using binary search.
  var pointerMin = 0;
  var pointerMax = this.length;
  while (pointerMin < pointerMax) {
    var pointerMid = Math.floor((pointerMin + pointerMax) / 2);
    if (this[pointerMid].y_ < connection.y_) {
      pointerMin = pointerMid + 1;
    } else if (this[pointerMid].y_ > connection.y_) {
      pointerMax = pointerMid;
    } else {
      pointerMin = pointerMid;
      break;
    }
  }
  this.splice(pointerMin, 0, connection);
  connection.inDB_ = true;
};

/**
 * Remove a connection from the database.  Must already exist in DB.
 * @param {!Blockly.Connection} connection The connection to be removed.
 * @private
 */
Blockly.ConnectionDB.prototype.removeConnection_ = function(connection) {
  if (!connection.inDB_) {
    throw 'Connection not in database.';
  }
  connection.inDB_ = false;
  // Find the connection using a binary search.
  var pointerMin = 0;
  var pointerMax = this.length - 2;
  var pointerMid = pointerMax;
  while (pointerMin < pointerMid) {
    if (this[pointerMid].y_ < connection.y_) {
      pointerMin = pointerMid;
    } else {
      pointerMax = pointerMid;
    }
    pointerMid = Math.floor((pointerMin + pointerMax) / 2);
  }

  // Walk forward and back on the y axis looking for the connection.
  // When found, splice it out of the array.
  pointerMin = pointerMid;
  pointerMax = pointerMid;
  while (pointerMin >= 0 && this[pointerMin].y_ == connection.y_) {
    if (this[pointerMin] == connection) {
      this.splice(pointerMin, 1);
      return;
    }
    pointerMin--;
  }
  do {
    if (this[pointerMax] == connection) {
      this.splice(pointerMax, 1);
      return;
    }
    pointerMax++;
  } while (pointerMax < this.length &&
           this[pointerMax].y_ == connection.y_);
  throw 'Unable to find connection in connectionDB.';
};

/**
 * Initialize a set of connection DBs for a specified workspace.
 * @param {!Element} workspace SVG root element.
 */
Blockly.ConnectionDB.init = function(workspace) {
  // Create four databases, one for each connection type.
  var dbList = [];
  dbList[Blockly.INPUT_VALUE] = new Blockly.ConnectionDB();
  dbList[Blockly.OUTPUT_VALUE] = new Blockly.ConnectionDB();
  dbList[Blockly.NEXT_STATEMENT] = new Blockly.ConnectionDB();
  dbList[Blockly.PREVIOUS_STATEMENT] = new Blockly.ConnectionDB();
  workspace.connectionDBList = dbList;
};

/**
 * Class for an editable text field.
 * @param {string} text The initial content of the field.
 * @param {Function} opt_validationFunc An optional function that is called
 *     to validate any constraints on what the user entered.  Takes the new
 *     text as an argument and returns the accepted text or null to abort
 *     the change.
 * @constructor
 */
Blockly.FieldTextInput = function(text, opt_validationFunc) {
  // Call parent's constructor.
  Blockly.Field.call(this, text);
  this.validationFunc_ = opt_validationFunc;
};

// FieldTextInput is a subclass of Field.
Blockly.FieldTextInput.prototype = new Blockly.Field(null);

/**
 * Set the text in this field.
 * @param {string} text New text.
 */
Blockly.FieldTextInput.prototype.setText = function(text) {
  if (this.validationFunc_) {
    var validated = this.validationFunc_(text);
    // If the new text is invalid, validation returns null.
    // In this case we still want to display the illegal result.
    if (validated !== null) {
      text = validated;
    }
  }
  Blockly.Field.prototype.setText.call(this, text);
};

/**
 * Create and inject the editable text field's elements into the workspace.
 * @param {!Element} workspaceSvg The canvas for the relevant workspace.
 * @private
 */
Blockly.FieldTextInput.injectDom_ = function(workspaceSvg) {
  /*
  <foreignObject class="blocklyHidden" height="22">
    <body xmlns="http://www.w3.org/1999/xhtml" class="blocklyMinimalBody">
      <input class="blocklyHtmlInput" xmlns="http://www.w3.org/1999/xhtml"/>
    </body>
  </foreignObject>
  */
  //var foreignObject = Blockly.createSvgElement('foreignObject',
  //    {height: 22}, workspaceSvg);
  //Blockly.FieldTextInput.svgForeignObject_ = foreignObject;
  // Can't use 'Blockly.createSvgElement' since this is not in the SVG NS.
  //var body = Blockly.svgDoc.createElement('body');
  //body.className = 'blocklyMinimalBody';
  //var input = Blockly.svgDoc.createElement('input');
  //input.className = 'blocklyHtmlInput';
  //input.style.border = 'none';
  //input.style.outline = 'none';
  Blockly.FieldTextInput.htmlInput_ = input;
  //body.appendChild(input);
  //foreignObject.appendChild(body);
};

/**
 * Destroy the editable text field's elements.
 * @private
 */
Blockly.FieldTextInput.destroyDom_ = function() {
  var node = Blockly.FieldTextInput.svgForeignObject_;
  node.parentNode.removeChild(node);
  Blockly.FieldTextInput.svgForeignObject_ = null;
  Blockly.FieldTextInput.htmlInput_ = null;
};

/**
 * Mouse cursor style when over the hotspot that initiates the editor.
 */
Blockly.FieldTextInput.prototype.CURSOR = 'text';

/**
 * Show the inline free-text editor on top of the text.
 * @private
 */
Blockly.FieldTextInput.prototype.showEditor_ = function() {
  if (false) {
    /* HACK:
     The current version of Opera (11.61) does not support foreignObject
     content.  Instead of presenting an inline editor, use a modal prompt.
     If Opera starts supporting foreignObjects, then delete this entire hack.
    */
    var newValue = prompt(Blockly.MSG_CHANGE_VALUE_TITLE, this.text_);
    if (this.validationFunc_) {
      newValue = this.validationFunc_(newValue);
    }
    if (newValue !== null) {
      this.setText(newValue);
    }
    return;
  }
  var workspaceSvg = this.sourceBlock_.workspace.getCanvas();
  Blockly.FieldTextInput.injectDom_(workspaceSvg);
  var htmlInput = Blockly.FieldTextInput.htmlInput_;
  htmlInput.value = htmlInput.defaultValue = this.text_;
  htmlInput.oldValue_ = null;
  var htmlInputFrame = Blockly.FieldTextInput.svgForeignObject_;
  var xy = Blockly.getAbsoluteXY_(this.borderRect_);
  var baseXy = Blockly.getAbsoluteXY_(workspaceSvg);
  xy.x -= baseXy.x;
  xy.y -= baseXy.y;
  if (!Blockly.RTL) {
    htmlInputFrame.setAttribute('x', xy.x + 1);
  }
  var isGecko = false;
  if (isGecko) {
    htmlInputFrame.setAttribute('y', xy.y - 1);
  } else {
    htmlInputFrame.setAttribute('y', xy.y - 3);
  }
  htmlInput.focus();
  htmlInput.select();
  // Bind to blur -- close the editor on loss of focus.
  htmlInput.onBlurWrapper_ =
      Blockly.bindEvent_(htmlInput, 'blur', this, this.onHtmlInputBlur_);
  // Bind to keyup -- trap Enter and Esc; resize after every keystroke.
  htmlInput.onKeyUpWrapper_ =
      Blockly.bindEvent_(htmlInput, 'keyup', this,
                         this.onHtmlInputKeyUp_);
  // Bind to keyPress -- repeatedly resize when holding down a key.
  htmlInput.onKeyPressWrapper_ =
      Blockly.bindEvent_(htmlInput, 'keypress', this, this.resizeEditor_);
  this.resizeEditor_();
  this.validate_();
};

/**
 * Handle a blur event on an editor.
 * @param {!Event} e Blur event.
 * @private
 */
Blockly.FieldTextInput.prototype.onHtmlInputBlur_ = function(e) {
  this.closeEditor_(true);
};

/**
 * Handle a key up event on an editor.
 * @param {!Event} e Key up event.
 * @private
 */
Blockly.FieldTextInput.prototype.onHtmlInputKeyUp_ = function(e) {
  if (e.keyCode == 13) {
    // Enter
    this.closeEditor_(true);
  } else if (e.keyCode == 27) {
    // Esc
    this.closeEditor_(false);
  } else {
    this.resizeEditor_();
    this.validate_();
  }
};

/**
 * Check to see if the contents of the editor validates.
 * Style the editor accordingly.
 * @private
 */
Blockly.FieldTextInput.prototype.validate_ = function() {
  var valid = true;
  var htmlInput = Blockly.FieldTextInput.htmlInput_;
  if (this.validationFunc_) {
    valid = this.validationFunc_(htmlInput.value);
  }
  if (valid) {
    Blockly.removeClass_(htmlInput, 'blocklyInvalidInput');
  } else {
    Blockly.addClass_(htmlInput, 'blocklyInvalidInput');
  }
};

/**
 * Resize the editor and the underlying block to fit the text.
 * @private
 */
Blockly.FieldTextInput.prototype.resizeEditor_ = function() {
  var htmlInput = Blockly.FieldTextInput.htmlInput_;
  var text = htmlInput.value;
  if (text === htmlInput.oldValue_) {
    // There has been no change.
    return;
  }
  htmlInput.oldValue_ = text;
  this.setText(text);
  var bBox = this.group_.getBBox();
  //var htmlInputFrame = Blockly.FieldTextInput.svgForeignObject_;
  //htmlInputFrame.setAttribute('width', bBox.width);
  //htmlInput.style.width = (bBox.width - 2) + 'px';
  if (Blockly.RTL) {
    // In RTL mode the left edge moves, whereas the right edge is fixed.
    //var xy = Blockly.getAbsoluteXY_(this.group_);
    //htmlInputFrame.setAttribute('x', xy.x - 4);
  }
};

/**
 * Close the editor and optionally save the results.
 * @param {boolean} save True if the result should be saved.
 * @private
 */
Blockly.FieldTextInput.prototype.closeEditor_ = function(save) {
  var htmlInput = Blockly.FieldTextInput.htmlInput_;
  Blockly.unbindEvent_(htmlInput.onBlurWrapper_);
  Blockly.unbindEvent_(htmlInput.onKeyUpWrapper_);
  Blockly.unbindEvent_(htmlInput.onKeyPressWrapper_);

  var text;
  if (save) {
    // Save the edit (if it validates).
    text = htmlInput.value;
    if (this.validationFunc_) {
      text = this.validationFunc_(text);
      if (text === null) {
        // Invalid edit.
        text = htmlInput.defaultValue;
      }
    }
  } else {
    // Canceling edit.
    text = htmlInput.defaultValue;
  }
  this.setText(text);
  Blockly.FieldTextInput.destroyDom_();
  //this.sourceBlock_.render();
};

/**
 * Class for an editable dropdown field.
 * @param {(!Array.<string>|!Function)} menuGenerator An array of options
 *     for a dropdown list, or a function which generates these options.
 * @param {Function} opt_changeHandler A function that is executed when a new
 *     option is selected.
 * @constructor
 */
Blockly.FieldDropdown = function(menuGenerator, opt_changeHandler) {
  this.menuGenerator_ = menuGenerator;
  this.changeHandler_ = opt_changeHandler;
  var firstText = this.getOptions_()[0][0];
  // Call parent's constructor.
  Blockly.Field.call(this, firstText);
};

// FieldDropdown is a subclass of Field.
Blockly.FieldDropdown.prototype = new Blockly.Field(null);

/**
 * Create the dropdown field's elements.  Only needs to be called once.
 * @return {!Element} The field's SVG group.
 */
Blockly.FieldDropdown.createDom = function() {
  /*
  <g class="blocklyHidden">
    <rect class="blocklyDropdownMenuShadow" x="0" y="1" rx="2" ry="2"/>
    <rect x="-2" y="-1" rx="2" ry="2"/>
    <g class="blocklyDropdownMenuOptions">
    </g>
  </g>
  */
  var svgGroup = Blockly.createSvgElement('g', {'class': 'blocklyHidden'},
                                          null);
  Blockly.FieldDropdown.svgGroup_ = svgGroup;
  Blockly.FieldDropdown.svgShadow_ = Blockly.createSvgElement('rect',
      {'class': 'blocklyDropdownMenuShadow',
      x: 0, y: 1, rx: 2, ry: 2}, svgGroup);
  Blockly.FieldDropdown.svgBackground_ = Blockly.createSvgElement('rect',
      {x: -2, y: -1, rx: 2, ry: 2,
      filter: 'url(#blocklyEmboss)'}, svgGroup);
  Blockly.FieldDropdown.svgOptions_ = Blockly.createSvgElement('g',
      {'class': 'blocklyDropdownMenuOptions'}, svgGroup);
  return svgGroup;
};

/**
 * Corner radius of the dropdown background.
 */
Blockly.FieldDropdown.CORNER_RADIUS = 2;

/**
 * Mouse cursor style when over the hotspot that initiates the editor.
 */
Blockly.FieldDropdown.prototype.CURSOR = 'default';

/**
 * Create a dropdown menu under the text.
 * @private
 */
Blockly.FieldDropdown.prototype.showEditor_ = function() {
  var svgGroup = Blockly.FieldDropdown.svgGroup_;
  var svgOptions = Blockly.FieldDropdown.svgOptions_;
  var svgBackground = Blockly.FieldDropdown.svgBackground_;
  var svgShadow = Blockly.FieldDropdown.svgShadow_;
  // Erase all existing options.
  Blockly.removeChildren_(svgOptions);
  // The menu must be made visible early since otherwise BBox and
  // getComputedTextLength will return 0.
  svgGroup.style.display = 'block';

  function callbackFactory(text) {
    return function(e) {
      if (this.changeHandler_) {
        this.changeHandler_(text);
      } else {
        this.setText(text);
      }
      // This mouse click has been handled, don't bubble up to document.
      e.stopPropagation();
    };
  }

  var maxWidth = 0;
  var resizeList = [];
  var checkElement = null;
  var options = this.getOptions_();
  for (var x = 0; x < options.length; x++) {
    var text = options[x][0];  // Human-readable text.
    var value = options[x][1]; // Language-neutral value.
    var gElement = Blockly.ContextMenu.optionToDom(text);
    var rectElement = gElement.firstChild;
    var textElement = gElement.lastChild;
    svgOptions.appendChild(gElement);
    // Add a checkmark next to the current item.
    if (!checkElement && text == this.text_) {
      checkElement = Blockly.createSvgElement('text',
          {'class': 'blocklyMenuText', y: 15}, null);
      // Insert the checkmark between the rect and text, thus preserving the
      // ability to reference them as firstChild and lastChild respectively.
      gElement.insertBefore(checkElement, textElement);
      checkElement.appendChild(Blockly.svgDoc.createTextNode('\u2713'));
    }

    gElement.setAttribute('transform',
        'translate(0, ' + (x * Blockly.ContextMenu.Y_HEIGHT) + ')');
    resizeList.push(rectElement);
    Blockly.bindEvent_(gElement, 'mousedown', null, Blockly.noEvent);
    Blockly.bindEvent_(gElement, 'mouseup', this, callbackFactory(text));
    Blockly.bindEvent_(gElement, 'mouseup', null,
                       Blockly.FieldDropdown.hideMenu);
    // Compute the length of the longest text length.
    maxWidth = Math.max(maxWidth, textElement.getComputedTextLength());
  }
  // Run a second pass to resize all options to the required width.
  maxWidth += Blockly.ContextMenu.X_PADDING * 2;
  for (var x = 0; x < resizeList.length; x++) {
    resizeList[x].setAttribute('width', maxWidth);
  }
  if (Blockly.RTL) {
    // Right-align the text.
    for (var x = 0, gElement; gElement = svgOptions.childNodes[x]; x++) {
      var textElement = gElement.lastChild;
      textElement.setAttribute('x', maxWidth -
          textElement.getComputedTextLength() - Blockly.ContextMenu.X_PADDING);
    }
  }
  if (checkElement) {
    if (Blockly.RTL) {
      // Research indicates that RTL checkmarks are supposed to be drawn the
      // same in the same direction as LTR checkmarks.  It's only the alignment
      // that needs to change.
      checkElement.setAttribute('x',
          maxWidth - 5 - checkElement.getComputedTextLength());
    } else {
      checkElement.setAttribute('x', 5);
    }
  }
  var width = maxWidth + Blockly.FieldDropdown.CORNER_RADIUS * 2;
  var height = options.length * Blockly.ContextMenu.Y_HEIGHT +
               Blockly.FieldDropdown.CORNER_RADIUS + 1;
  svgShadow.setAttribute('width', width);
  svgShadow.setAttribute('height', height);
  svgBackground.setAttribute('width', width);
  svgBackground.setAttribute('height', height);
  var hexColour = Blockly.makeColour(this.sourceBlock_.getColour());
  svgBackground.setAttribute('fill', hexColour);
  // Position the dropdown to line up with the field.
  var xy = Blockly.getAbsoluteXY_(this.borderRect_);
  var borderBBox = this.borderRect_.getBBox();
  var x;
  if (Blockly.RTL) {
    x = xy.x - maxWidth + Blockly.ContextMenu.X_PADDING + borderBBox.width -
        Blockly.BlockSvg.SEP_SPACE_X / 2;
  } else {
    x = xy.x - Blockly.ContextMenu.X_PADDING + Blockly.BlockSvg.SEP_SPACE_X / 2;
  }
  svgGroup.setAttribute('transform',
      'translate(' + x + ', ' + (xy.y + borderBBox.height) + ')');
};

/**
 * Return a list of the options for this dropdown.
 * @return {!Array.<!Array.<string>>} Array of option tuples:
 *     (human-readable text, language-neutral name).
 * @private
 */
Blockly.FieldDropdown.prototype.getOptions_ = function() {
  if (typeof this.menuGenerator_ == 'function') {
    return this.menuGenerator_.call(this);
  }
  return this.menuGenerator_;
};

/**
 * Get the language-neutral value from this dropdown menu.
 * @return {string} Current text.
 */
Blockly.FieldDropdown.prototype.getValue = function() {
  var selectedText = this.text_;
  var options = this.getOptions_();
  for (var x = 0; x < options.length; x++) {
    // Options are tuples of human-readable text and language-neutral values.
    if (options[x][0] == selectedText) {
      return options[x][1];
    }
  }
  throw '"' + selectedText + '" not valid in dropdown.';
};

/**
 * Set the language-neutral value for this dropdown menu.
 * @param {string} newValue New value to set.
 */
Blockly.FieldDropdown.prototype.setValue = function(newValue) {
  var options = this.getOptions_();
  for (var x = 0; x < options.length; x++) {
    // Options are tuples of human-readable text and language-neutral values.
    if (options[x][1] == newValue) {
      this.setText(options[x][0]);
      return;
    }
  }
  // Value not found.  Add it, maybe it will become valid once set
  // (like variable names).
  this.setText(newValue);
};

/**
 * Hide the dropdown menu.
 */
Blockly.FieldDropdown.hideMenu = function() {
  Blockly.FieldDropdown.svgGroup_.style.display = 'none';
};

exports.Blockly = Blockly;