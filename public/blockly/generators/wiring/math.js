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
