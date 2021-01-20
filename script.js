// sketch.js
// aka the client side:
// - use handpose to track hand skeleton
// - send to server via socket.io
// - update display wivth other users' hands from server

// First of all, shut glitch up about p5's global namespace pollution using this magic comment:
/* global describe p5 setup draw P2D WEBGL ARROW CROSS HAND MOVE TEXT WAIT HALF_PI PI QUARTER_PI TAU TWO_PI DEGREES RADIANS DEG_TO_RAD RAD_TO_DEG CORNER CORNERS RADIUS RIGHT LEFT CENTER TOP BOTTOM BASELINE POINTS LINES LINE_STRIP LINE_LOOP TRIANGLES TRIANGLE_FAN TRIANGLE_STRIP QUADS QUAD_STRIP TESS CLOSE OPEN CHORD PIE PROJECT SQUARE ROUND BEVEL MITER RGB HSB HSL AUTO ALT BACKSPACE CONTROL DELETE DOWN_ARROW ENTER ESCAPE LEFT_ARROW OPTION RETURN RIGHT_ARROW SHIFT TAB UP_ARROW BLEND REMOVE ADD DARKEST LIGHTEST DIFFERENCE SUBTRACT EXCLUSION MULTIPLY SCREEN REPLACE OVERLAY HARD_LIGHT SOFT_LIGHT DODGE BURN THRESHOLD GRAY OPAQUE INVERT POSTERIZE DILATE ERODE BLUR NORMAL ITALIC BOLD BOLDITALIC LINEAR QUADRATIC BEZIER CURVE STROKE FILL TEXTURE IMMEDIATE IMAGE NEAREST REPEAT CLAMP MIRROR LANDSCAPE PORTRAIT GRID AXES frameCount deltaTime focused cursor frameRate getFrameRate setFrameRate noCursor displayWidth displayHeight windowWidth windowHeight width height fullscreen pixelDensity displayDensity getURL getURLPath getURLParams pushStyle popStyle popMatrix pushMatrix registerPromisePreload camera perspective ortho frustum createCamera setCamera setAttributes createCanvas resizeCanvas noCanvas createGraphics blendMode noLoop loop push pop redraw applyMatrix resetMatrix rotate rotateX rotateY rotateZ scale shearX shearY translate arc ellipse circle line point quad rect square triangle ellipseMode noSmooth rectMode smooth strokeCap strokeJoin strokeWeight bezier bezierDetail bezierPoint bezierTangent curve curveDetail curveTightness curvePoint curveTangent beginContour beginShape bezierVertex curveVertex endContour endShape quadraticVertex vertex alpha blue brightness color green hue lerpColor lightness red saturation background clear colorMode fill noFill noStroke stroke erase noErase createStringDict createNumberDict storeItem getItem clearStorage removeItem select selectAll removeElements createDiv createP createSpan createImg createA createSlider createButton createCheckbox createSelect createRadio createColorPicker createInput createFileInput createVideo createAudio VIDEO AUDIO createCapture createElement deviceOrientation accelerationX accelerationY accelerationZ pAccelerationX pAccelerationY pAccelerationZ rotationX rotationY rotationZ pRotationX pRotationY pRotationZ pRotateDirectionX pRotateDirectionY pRotateDirectionZ turnAxis setMoveThreshold setShakeThreshold isKeyPressed keyIsPressed key keyCode keyIsDown movedX movedY mouseX mouseY pmouseX pmouseY winMouseX winMouseY pwinMouseX pwinMouseY mouseButton mouseIsPressed requestPointerLock exitPointerLock touches createImage saveCanvas saveGif saveFrames loadImage image tint noTint imageMode pixels blend copy filter get loadPixels set updatePixels loadJSON loadStrings loadTable loadXML loadBytes httpGet httpPost httpDo createWriter save saveJSON saveJSONObject saveJSONArray saveStrings saveTable writeFile downloadFile abs ceil constrain dist exp floor lerp log mag map max min norm pow round sq sqrt fract createVector noise noiseDetail noiseSeed randomSeed random randomGaussian acos asin atan atan2 cos sin tan degrees radians angleMode textAlign textLeading textSize textStyle textWidth textAscent textDescent loadFont text textFont append arrayCopy concat reverse shorten shuffle sort splice subset float int str boolean byte char unchar hex unhex join match matchAll nf nfc nfp nfs split splitTokens trim day hour minute millis month second year plane box sphere cylinder cone ellipsoid torus orbitControl debugMode noDebugMode ambientLight specularColor directionalLight pointLight lights lightFalloff spotLight noLights loadModel model loadShader createShader shader resetShader normalMaterial texture textureMode textureWrap ambientMaterial emissiveMaterial specularMaterial shininess remove canvas drawingContext*/
// Also socket.io, tensorflow and handpose's:
/* global describe handpose tf io*/
// now any other lint errors will be your own problem

var socket = io(); // socket is the variable that will hold all our socket.io functionality - see: https://socket.io/docs/emit-cheatsheet/ for cheatsheet

var handposeModel = null; // this will be loaded with the handpose model
// WARNING: do NOT call it 'model', because p5 already has something called 'model'

var videoDataLoaded = false; // is webcam capture ready?

var statusText = "Loading handpose model...";

var myHands = []; // hands detected in this browser
// currently handpose only supports single hand, so this will be either empty or singleton

var capture; // webcam capture, managed by p5.js

var serverData = {}; // stores other users's hands from the server

// Load the MediaPipe handpose model assets.
handpose.load().then(function(_model) {
  //console.log("model initialized.");
  handposeModel = _model;
});



// tell the server we're ready!
socket.emit("client-start");

// update our data everytime the server sends us an update
socket.on("server-update", function(data) {
  serverData = data;
  //console.log("server data:", serverData);
});

//setInterval(test, 1000)

// function test() {
//   // serverData[client[0]]

//   const clients = Object.keys(serverData)
//   const hands = Object.values(serverData)
//   hands.forEach((h, i) => {
//     // console.log(h)
//     const hand  = h.hands[0]
//     const clientId = clients[i]
//     if (hand)
//       console.log(`hand ${clientId} at x: ${hand.landmarks[9][0]} y: ${hand.landmarks[9][1]}`)
//   })
// }

function setup() {
  createCanvas(600, 400);
  capture = createCapture(VIDEO);
  

  // this is to make sure the capture is loaded before asking handpose to take a look
  // otherwise handpose will be very unhappy
  capture.elt.onloadeddata = function() {
    //console.log("video initialized");
    videoDataLoaded = true;
  };

  capture.hide();
}

// draw a hand object returned by handpose
function drawHands(hands) {
  // Each hand object contains a `landmarks` property,
  // which is an array of 21 3-D landmarks.
  for (var i = 0; i < hands.length; i++) {
    var landmarks = hands[i].landmarks;

    for (var j = 0; j < landmarks.length; j++) {
      var [x, y, z] = landmarks[j]; // coordinate in 3D space

      ellipse(x, y, 10, 10);
    }
  }
}

// hash to a unique color for each user ID
function uuid2color(uuid) {
  var col = 1;
  for (var i = 0; i < uuid.length; i++) {
    var cc = uuid.charCodeAt(i);
    col = (col * cc) % 0xffffff;
  }
  return [(col >> 16) & 0xff, (col >> 8) & 0xff, col & 0xff];
}

function draw() {
  if (handposeModel && videoDataLoaded) {
    // model and video both loaded,

    handposeModel.estimateHands(capture.elt, true).then(function(_hands) {
      // we're handling an async promise
      // best to avoid drawing something here! it might produce weird results due to racing

      myHands = _hands; // update the global myHands object with the detected hands
      if (!myHands.length) {
        // haven't found any hands
        statusText = "Show some hands!";
      } else {
        // when hand is present say Hello
        statusText = "Hello";
      }

      // tell the server about our updates!
      socket.emit("client-update", { hands: myHands });
    });
  }

  background(200);

  // now draw all the other users' hands (& drawings) from the server
  for (var userId in serverData) {
    if (userId == socket.id) {
      // red keypoints for me
      fill(255, 0, 0);
    } else {
      // unique color computed from user id
      fill(...uuid2color(userId).map(x => x * 0.5));
    }
    
    drawHands(serverData[userId].hands, true);
    
  }

 
                   

                  //this is where you need to write the code for interactions -- unfortunately I didnt manage to get them working
                  //const clients = Object.keys(serverData);
                  //    const hands = Object.values(serverData);
                  //   hands.forEach((h) => {
                  //     // console.log(h)
                  //     const hand = h.hands[0];
                  //     //const clients = [i];
                  //     if (hand)
                  //       console.log(`hand ${serverData.id} at x: ${hand.landmarks[9][0]} y: ${hand.landmarks[9][1]}`)
                  //       //console.log(hand.landmarks[9][0]);

                  //     for (var i = 0; i <= serverData.length; i++) {
                  //       if (serverData.id == socket.id) {
                  //         continue;
                  //       }

                  //       if (i < 2 && serverData.length > 1) {
                  //         if (serverData[0].hand != null && serverData[1].hand != null) {
                  //           let holdingHands = dist(
                  //             serverData[0].hand.landmarks[9][0],
                  //             serverData[0].hand.landmarks[9][1],
                  //             serverData[1].hand.landmarks[9][0],
                  //             serverData[1].hand.landmarks[9][1]
                  //           );

                  //           if (holdingHands < 50) {
                  //             //10
                  //             console.log("hands are touching");
                  //             // noFill();
                  //             // stroke("red");
                  //             // strokeWeight(4);
                  //             // heart();
                  //           }
                  //         }
                  //       }
                  //     }
                  //   });

  push();
  
  fill(255, 0, 0);
  noStroke();
  textSize(30);
  text(statusText, 5, 25);
  pop();
  
  
}
//}

// function heart() {
//   beginShape();
//   vertex(200, 350);
//   bezierVertex(200, 250, 350, 200, 350, 150);
//   bezierVertex(350, 100, 250, 50, 200, 140);
//   bezierVertex(150, 50, 50, 100, 50, 150);
//   bezierVertex(50, 200, 200, 250, 200, 350);

//   endShape();
// }
