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
