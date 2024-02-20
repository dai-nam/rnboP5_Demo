

//Globals
let mycircle;
let circles = [];




//-------------------------rnbo-----------------------------



let context;
let device;

async function loadRnbo( ){

  // Create AudioContext
let WAContext = window.AudioContext || window.webkitAudioContext;
context = new WAContext();

//const { createDevice } = require("@rnbo/js");

    let rawPatcher = await fetch("export/mysynth.export.json");
    let patcher = await rawPatcher.json();

    /*
    if (!window.RNBO) {
      // Load RNBO script dynamically
      // Note that you can skip this by knowing the RNBO version of your patch
      // beforehand and just include it using a <script> tag
      await loadRNBOScript(patcher.desc.meta.rnboversion);
  }
  */
  

    device = await RNBO.createDevice({ context, patcher });
    device.node.connect(context.destination);

 // const outputNode = context.createGain();
  //outputNode.connect(context.destination);
 // device.node.connect(outputNode);


  //print all rnbo param Parameters
  device.parameters.forEach(parameter => {
  console.log(parameter.id);
  console.log(parameter.name);


  //receive input
const handleSuccess = (stream) => {
  const source = context.createMediaStreamSource(stream);
  source.connect(device.node);
}
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(handleSuccess);
});


};

// We can't await an asynchronous function at the top level, so we create an asynchronous
// function setup, and then call it without waiting for the result.
loadRnbo();


//Sending and Receiving Messages
//const { TimeNow, MessageEvent } = require("@rnbo/js");

// -----------------------p5--------------------------




function setup() {
    createCanvas(800, 800);
}


function draw() {
    background(255, 0 , 0);

    for(let circ of circles) {
      circ.show();
      circ.update();
    }        
}


function mousePressed() {
        context.resume();   //an AudioContext must be resumed before it will start processing audio. It's only possible to resume an AudioContext from a user-initiated event, like clicking on a button or pressing a key

        if(mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height)
        {
          return;
        }

        var x = mouseX;
        var y = mouseY;
        circles.push(new Circle(x, y));
        console.log(x + ", " + y);

        rnbotrigger(x, y);
}

function rnbotrigger(x, y)
{
  var scaledX = map(x, 0, width, 0, 100);
  const event1 = new RNBO.MessageEvent(RNBO.TimeNow, "in1", [scaledX]);
  device.scheduleEvent(event1);

  var scaledY = map(y, 0, height, 0.0, 100.0);
  const event2 = new RNBO.MessageEvent(RNBO.TimeNow, "in2", [scaledY]);
  device.scheduleEvent(event2);

  device.messageEvent.subscribe((ev) => {
    console.log(`Received message ${ev.tag}: ${ev.payload}`);

    //if (ev.tag === "out2") console.log("Message from RNBO: "+ev.payload);
});

}


class Circle
{
  constructor(x, y)
  {
    this.x = x;
    this.y = y;
    this.r = 0;
    this.a = 255;
  }
  
  show()
  {
    noStroke();
    fill(0, 0, 255, this.a);
    ellipse(this.x, this.y, this.r, this.r);
  }
  
  update()
  {
    this.r += 4;
    this.a -= 10;
    
    if(this.a <= 0)
    {
          const index = circles.findIndex(e => e === this);
          if (index !== -1) {
           circles.splice(index, 1);
    }
  }
  }
}



