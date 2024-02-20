let audioContext;
let device;

let snake;
let rez = 60;
let food;
let w;
let h;

function setup() {
  let canvas = createCanvas(960, 960);
  w = floor(width / rez);
  h = floor(height / rez);
  snake = new Snake();
  foodLocation();

  // Add an event listener for click events
  canvas.elt.addEventListener("click", startAudioContext);

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume().then(() => {
    console.log('Playback resumed successfully');
  });
  loadRNBO();
  
  canvas.mouseClicked(startAudioContext);
  
  // Prevent default scrolling behavior on touch move
  canvas.touchMoved(function() {
    return false;
  });

  // Prevent the default behavior of touchmove events
  document.ontouchmove = function(event) {
    event.preventDefault();
  }

  window.addEventListener('touchmove', function (event) {
    event.preventDefault();
  }, { passive: false });


  // Stop automatic drawing
  noLoop();
}

function foodLocation() {
  let x = floor(random(w));
  let y = floor(random(h));
  food = createVector(x, y);
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    snake.setDir(-1, 0);
  } else if (keyCode === RIGHT_ARROW) {
    snake.setDir(1, 0);
  } else if (keyCode === DOWN_ARROW) {
    snake.setDir(0, 1);
  } else if (keyCode === UP_ARROW) {
    snake.setDir(0, -1);
  } else if (key == ' ') {
    snake.grow();
  }
}

let flashYellowDot = false;

async function loadRNBO() {
  const { createDevice } = RNBO;
  await audioContext.resume();
  const rawPatcher = await fetch('snake.export.json');
  const patcher = await rawPatcher.json();
  device = await createDevice({ context: audioContext, patcher });
  device.node.connect(audioContext.destination);
  orbit = device.parametersById.get('orbit');


  // Subscribe to out3 messages
  device.messageEvent.subscribe((ev) => {
    if (ev.tag === "out3") {
      console.log("Received a message from the third outlet");
      
      // Toggle the yellow dot flash
      flashYellowDot = !flashYellowDot;

      // Trigger draw function
      redraw(); // Using redraw() function from p5.js which redraws the canvas once
    }
  });
}

window.addEventListener("keydown", startAudioContext);

function startAudioContext() {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
    // Remove the event listeners so they don't call this function again
    window.removeEventListener("keydown", startAudioContext);
    canvas.elt.removeEventListener("click", startAudioContext);
  }
}

function draw() {
  scale(rez);
  background(220);
  if (snake.eat(food)) {
    foodLocation();
  }
  snake.update();
  snake.show();

  if (snake.endGame()) {
    print("END GAME");
    background(255, 0, 0);
    noLoop();
  }

  // Draw the apple as a navy blue square with a light blue circle
  noStroke();
  fill(8, 32, 54); // Navy blue
  rect(food.x, food.y, 1, 1);

  strokeWeight(0.09); // Adjust this to get the desired thickness at the current scale
  stroke(91, 131, 230); // Light blue
  noFill();
  ellipse(food.x + 0.5, food.y + 0.5, 0.65, 0.65);

  // Draw a flashing yellow dot in the middle
  // Draw a flashing yellow dot in the middle
if (flashYellowDot) {
  fill(237, 237, 90); // Yellow
  noStroke();
  ellipse(food.x + 0.5, food.y + 0.5, 0.33, 0.33);
}

}

let tempoColor = false;

class Snake {
  constructor() {
    this.body = [];
    this.body[0] = createVector(floor(w / 2), floor(h / 2));
    this.applesEaten = 0;
    this.tempoChanged = false;
    this.color = [8, 32, 54];  // RGB color for the snake, initially black
    this.xdir = 0;
    this.ydir = 0;
    this.len = 0;
  }

  async setDir(x, y) {
    // Check if the direction is different from the current one
    if (x != this.xdir || y != this.ydir) {
      this.xdir = x;
      this.ydir = y;
    }
  }

  async update() {
    let head = this.body[this.body.length - 1].copy();
    this.body.shift();

    // Move the head
    head.x += this.xdir;
    head.y += this.ydir;


    this.body.push(head);
  }


  grow() {
    let head = this.body[this.body.length - 1].copy();
    this.len++;
    this.body.push(head);

  }
  

  endGame() {
    if (this.body.length === 0) {
      return false; // Or whatever default value you deem appropriate
    }
    
    let x = this.body[this.body.length - 1].x;
    let y = this.body[this.body.length - 1].y;
    if (x > w - 1 || x < 0 || y > h - 1 || y < 0) {
      return true;
    }
    for (let i = 0; i < this.body.length - 1; i++) {
      let part = this.body[i];
      if (part.x == x && part.y == y) {
        return true;
      }
    }
    return false;
  }

  eat(pos) {
    let x = this.body[this.body.length - 1].x;
    let y = this.body[this.body.length - 1].y;

    if (x == pos.x && y == pos.y) {
      this.grow();
      this.applesEaten++;

      const { TimeNow, MessageEvent } = RNBO;

      // Send a message to 'in1'
      const event1 = new MessageEvent(TimeNow, 'in1', [1]);
      device.scheduleEvent(event1);

      // 33% chance to change the tempo and direction if not already changed
      if (!this.tempoChanged && Math.random() <= 0.55) {
        const tempoParam = device.parametersById.get("tempo");
        tempoParam.value = 300;

        const directionParam = device.parametersById.get("direction");
        directionParam.value = 1;

        this.tempoChanged = true;
        tempoColor = true;
      }

      // After 4-8 apples are eaten, reset the tempo and direction
      if (this.tempoChanged && this.applesEaten >= 4 && Math.random() <= 0.5) { //50% chance to reset after 4 apples
        const tempoParam = device.parametersById.get("tempo");
        tempoParam.value = 120;

        const directionParam = device.parametersById.get("direction");
        directionParam.value = 0;

        this.tempoChanged = false;
        this.applesEaten = 0;  // Reset the apple counter
        tempoColor = false;
      }

      return true;
    }

    return false;
  }
  
  show() {
    for (let i = 0; i < this.body.length; i++) {
      if (i == this.body.length - 1) { // if this is the head of the snake
        fill(8, 32, 54); // Navy blue
        noStroke(); // remove any border
        rect(this.body[i].x, this.body[i].y, 1, 1);

        // Draw a smaller diagonal cross on the head of the snake
        stroke(tempoColor ? 237 : 91, tempoColor ? 237 : 131, tempoColor ? 90 : 230); // Color changes based on tempoColor variable
        strokeWeight(0.09); // Adjust this to get the desired thickness at the current scale
        line(this.body[i].x + 0.25, this.body[i].y + 0.25, this.body[i].x + 0.75, this.body[i].y + 0.75); // Diagonal line from top-left to bottom-right
        line(this.body[i].x + 0.75, this.body[i].y + 0.25, this.body[i].x + 0.25, this.body[i].y + 0.75); // Diagonal line from top-right to bottom-left
      } else { // if this is not the head of the snake
        fill(this.color);
        noStroke();
        rect(this.body[i].x, this.body[i].y, 1, 1);
      }
    }
  }
}