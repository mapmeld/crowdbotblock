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
