const onvif = require('node-onvif');
const fs = require('fs');
let Max = null;

try{
    Max = require('max-api');
    Max.addHandlers({
        move_x: (val,timeout) =>{
            let params = {
                'speed': {
                    x: val,
                    y: 0,
                    z: 0
                },
                'timeout': 5
            };
            if (cam1) ptzMoveCommand(cam1, params, timeout);
        },
        move_y: (val,timeout)=>{
            let params = {
                'speed': {
                    x: 0,
                    y: val,
                    z: 0
                },
                'timeout': 5
            };
            if (cam1) ptzMoveCommand(cam1, params, timeout);
        },
        zoom: (val,timeout)=>{
            let params = {
                'speed': {
                    x: 0,
                    y: 0,
                    z: val
                },
                'timeout': 5
            };
            if (cam1) ptzMoveCommand(cam1, params, timeout);
        },
        snap: ()=> takeSnapshot(cam1)
    });
} catch(error){}

console.log('Starting the camera discovery process.');
console.log('This will take a few seconds...');

let caminfo = {
    xaddr: 'http://192.168.10.10:80/onvif/device_service',
    user : 'admin',
    pass : 'hello'
};

// Find the ONVIF network cameras.
// It will take about 3 seconds.
let devices = [];
let cam1 = null;

onvif.startProbe().then((device_info_list) => {
  console.log(device_info_list.length + ' devices were found.');
  // Show the device name and the URL of the end point.
  // Push each device into an array
  device_info_list.forEach((info) => {
    devices = [];
    console.log('- ' + info.urn);
    console.log('  - ' + info.name);
    console.log('  - ' + info.xaddrs[0]);
    devices.push({
        'urn': info.urn,
        'name': info.name,
        'xaddr': info.xaddrs[0]
    });
  });
  if (device_info_list.length>0){
    // If found, initialize the first camera as an OnvifDevice object
    caminfo.xaddr = devices[0].xaddr;
    cam1 = new onvif.OnvifDevice(caminfo);
    cam1.init().then((info) => {
    // Show the detailed information of the device.
    console.log(JSON.stringify(info, null, '  '));
    outputStream(cam1.getUdpStreamUrl());
    //setInterval(()=> randMoves(cam1), 1500);

    }).catch((error) => {
        console.error(error);
    });
  }
}).catch((error) => {
  console.error(error);
});

function randMoves(device) {
    let params = {};
    if (Math.random()>0.5){
        params = {
            'speed': {
                x: Math.random()-0.5,
                y: 0,
                z: 0
            },
            'timeout': 2
        };
    } else {
        params = {
            'speed': {
                x: 0,
                y: Math.random()-0.5,
                z: 0
            },
            'timeout': 2
        };
    };
    device.ptzMove(params).catch((error)=> console.log(error));
}

function ptzMoveCommand(device, params, time){
    device.ptzMove(params).then(() => {
        // Stop to the PTZ after given time in milliseconds
        setTimeout(() => {
          device.ptzStop().then(() => {
          }).catch((error) => {
            console.error(error);
          });
        }, time);
      }).catch((error) => {
        console.error(error);
      });
}

function outputStream(url){
    try{
        Max.outlet("stream",url);
    }
    catch(error){
        console.log("get the stream here: "+url );
    }
}

function takeSnapshot(device){
    device.fetchSnapshot().then((res) => {
        // Determine the file extention
        let ext = 'bin';
        let mime_pair = res.headers['content-type'].split('/');
        if(mime_pair[0] === 'image') {
          ext = mime_pair[1];
        }
        // Save the data to a file
        let fname = 'snapshot.' + ext;
        fs.writeFileSync(fname, res.body, {encoding: 'binary'});
        try {
            Max.outlet("snapshot_ready");
        } catch(error) {};
      }).catch((error) => {
        console.error(error);
      });
}