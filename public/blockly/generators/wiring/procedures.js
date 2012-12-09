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
