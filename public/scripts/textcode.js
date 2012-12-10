function init(){
  $("dostream").checked = true;
  $("dosend").checked = false;
  var myCodeMirror = CodeMirror( document.body, {
    value: "void setup(){\n}\nvoid init(){\n}",
    mode: "clike"
  });
}
function writeSample(){
  var sketch = "";
  switch($("samples").value){
    case "blink":
      sketch = "/*\\n  Blink Test\\n  Turns blue and yellow LEDs on and off, repeatedly.\\n  pin 2 is blue\\n  pin 4 is green\\n  activating 2 and 4 together makes aqua-green\\n  pin 6 is yellow\\n  pin 8 is purple\\n  pin 13 is orange indicator on Arduino\\n */\\nvoid setup() {\\n  /* at start, prepare LED pins */\\n  pinMode(2, OUTPUT);\\n  pinMode(4, OUTPUT);\\n  pinMode(6, OUTPUT);\\n  pinMode(8, OUTPUT);\\n  pinMode(13, OUTPUT);\\n}\\nvoid loop() {\\n  /* program a light show here! */\\n  digitalWrite(2, HIGH);\\n  digitalWrite(6, HIGH);\\n  digitalWrite(8,LOW);\\n  /* wait 3 seconds with those settings */\\n  delay(3000);\\n  digitalWrite(2, LOW);\\n  digitalWrite(6, LOW);\\n  digitalWrite(8,HIGH);\\n  /* wait 2 seconds with those settings */\\n  delay(2000);\\n  /* loop() repeats */\\n}";
      break;
    case "sensor":
      sketch = "/* Sensor Test\\n  Turns purple LED on whenever sensor detects the red LED\\n  pin 10 is red\\n  digital pin 8 is purple\\n  analog 3 is light sensor\\n*/\\nint onIn = 1;\\nint lightSense;\\nvoid setup(){\\n  pinMode(8, OUTPUT);\\n  pinMode(10, OUTPUT);\\n}\\nvoid loop(){\\n  // cycle the target light\\n  // target light is on 0.5 seconds out of 2\\n  onIn = onIn + 1;\\n  if(onIn % 5 == 0){\\n    digitalWrite(10, HIGH);\\n    onIn = 1;\\n  }\\n  else{\\n    digitalWrite(10, LOW);\\n  }\\n  lightSense = analogRead(3);\\n  if(lightSense > 70){\\n    // target light detected! purple LED on!\\n    digitalWrite(8, HIGH);\\n  }\\n  else{\\n    // target light off! purple LED off!\\n    digitalWrite(8, LOW);\\n  }\\n  delay(500);\\n}";
      break;
    case "hello":
      sketch = "/* Stream Test\\nCrowdBot data stream test\\nsays \\"hello\\" then random numbers */\\nvoid setup(){\\n  Serial.begin(9600);\\n  Serial.println(\\"hello\\");\\n  // read unconnected analog pin 0 for randomizing noise\\n  randomSeed( analogRead(0) );\\n}\\nvoid loop(){\\n  Serial.println( random(1, 101) );\\n  delay(1000);\\n}";
      break;
    case "random":
      sketch = "/* Random Blink\\n  blinks blue, green, and purple for random intervals */\\nvoid setup(){\\n  // prepare blink lights\\n  pinMode(2, OUTPUT);\\n  pinMode(4, OUTPUT);\\n  pinMode(6, OUTPUT);\\n  // read unconnected analog pin 0 for randomizing noise\\n  randomSeed( analogRead(0) );\\n}\\nvoid loop(){\\n  digitalWrite(2, HIGH);\\n  delay( random(750, 2001) );\\n  digitalWrite(2, LOW);\\n  digitalWrite(4, HIGH);\\n  delay( random(750, 2001) );\\n  digitalWrite(4, LOW);\\n  digitalWrite(6, HIGH);\\n  delay( random(750, 2001) );\\n  digitalWrite(6, LOW);\\n  delay( random(750, 1001) );\\n}";
      break;
    case "streamer":
      sketch = "/* Data Streamer\\n  streams light sensor value to CrowdBot\\n  target light is red LED with variable analog value */\\nint lightSense;\\nint lightCycle = 1;\\nvoid setup(){\\n  pinMode(10, OUTPUT);\\n  Serial.begin(9600);\\n  randomSeed( analogRead(0) );\\n}\\nvoid loop(){\\n  // set the light LED to a random value every 4 seconds\\n  if(lightCycle % 5 == 0){\\n    lightCycle = 1;\\n    analogWrite(10, random(20,250) );\\n  }\\n  else{\\n    lightCycle = lightCycle + 1;\\n  }\\n  // read the light sensor every second\\n  lightSense = analogRead(3);\\n  Serial.println( lightSense );\\n  delay(1000);\\n}";
      break;
    case "servo":
      sketch = "/* Motor Test */\\n#include <Servo.h>\\nServo myservo;\\nvoid setup(){\\n  myservo.attach(9);\\n  randomSeed( analogRead(0) );\\n}\\nvoid loop(){\\n  myservo.write( random(0, 180) );\\n  delay(5000);\\n}";
      break;
    case "current":
      var s = document.createElement("script");
      s.src = "/crowdbot/out?get=current&jsonp=update";
      s.type = "text/javascript";
      document.body.appendChild(s);
      return;
      break;
  }
  $("sketchplace").value = sketch;
}
function update(currentSketch){
  while(currentSketch.indexOf("|~|") > -1){
    currentSketch = currentSketch.replace("|~|","\\n");
    currentSketch = currentSketch.replace("\\n\\n","\\n");
  }
  $("sketchplace").value = currentSketch;
}
function $(id){
  return document.getElementById(id);
}