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
