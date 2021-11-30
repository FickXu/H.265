var webglPlayer, canvas, yLength, uvLength;

// ele
let yjm = document.getElementById("yjm");
let yjmM = document.getElementById("yjmM");
let dqcs = document.getElementById("dqcs");
let dqjmdx = document.getElementById("dqjmdx");
let dqjmhs = document.getElementById("dqjmhs");
let jmhs = document.getElementById("jmhs");
let ml = document.getElementById("ml");
var myWork = new Worker("../lib/work.js");
// myWork.postMessage({ a: 100 });
myWork.onmessage = (e) => {
  // console.warn("work", e.data);
  yjm.innerHTML = e.data.params.yjm;
  yjmM.innerHTML = e.data.params.yjmM;
  dqcs.innerHTML = e.data.params.dqcs;
  dqjmdx.innerHTML = e.data.params.dqjmdx;
  dqjmhs.innerHTML = e.data.params.dqjmhs;
  jmhs.innerHTML = e.data.params.jmhs;
  ml.innerHTML = (e.data.params.yjm * 8) / e.data.params.jmhs;
  displayVideoFrame(e.data);
};
function fileLoad() {
  console.log("axios=========");
  axios
    .get("http://127.0.0.1/h265/10s+.265", {
      responseType: "blob",
    })
    .then(function (response) {
      // handle success
      console.log(response);
      myWork.postMessage([response.data, 0]);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function () {
      // always executed
    });
}
function handleVideoFiles(files) {
  var file_list = files;
  var file_idx = 0;
  // decode_seq(file_list, file_idx);

  console.warn("file_list", file_list, file_idx);
  myWork.postMessage([file_list, file_idx]);
}

function displayVideoFrame(obj) {
  var data = new Uint8Array(obj.video);
  var width = obj.width;
  var height = obj.height;
  var yLength = width * height;
  var uvLength = (width / 2) * (height / 2);
  if (!webglPlayer) {
    const canvasId = "playCanvas";
    canvas = document.getElementById(canvasId);
    webglPlayer = new WebGLPlayer(canvas, {
      preserveDrawingBuffer: false,
    });
  }
  webglPlayer.renderFrame(data, width, height, yLength, uvLength);
}
