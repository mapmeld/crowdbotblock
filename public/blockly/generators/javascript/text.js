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
/*
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
*/
// Sensor read
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
  var code = 'window.prompt(' + msg + ')';
  var toNumber = this.getTitleValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'window.parseFloat(' + code + ')';
  }
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};
