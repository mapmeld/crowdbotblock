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
