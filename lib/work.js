importScripts("../lib/libffmpeg_265.js");
onmessage = function (e) {
  decode_seq(e.data[0], e.data[1]);
  console.warn(e.data[0], e.data[1]);
};

function decode_seq(file_list, file_idx) {
  if (!file_list || file_idx >= file_list.length) return;
  var file = file_list[file_idx];

  var videoSize = 0;
  let oldStamp = new Date().getTime();
  var videoCallback = Module.addFunction(function (
    addr_y,
    addr_u,
    addr_v,
    stride_y,
    stride_u,
    stride_v,
    width,
    height,
    pts
  ) {
    let size =
      width * height + (width / 2) * (height / 2) + (width / 2) * (height / 2);
    let data = new Uint8Array(size);
    let pos = 0;
    for (let i = 0; i < height; i++) {
      let src1 = addr_y + i * stride_y;
      let tmp1 = HEAPU8.subarray(src1, src1 + width);
      tmp1 = new Uint8Array(tmp1);
      data.set(tmp1, pos);
      pos += tmp1.length;
    }
    for (let i = 0; i < height / 2; i++) {
      let src = addr_u + i * stride_u;
      let tmp = HEAPU8.subarray(src, src + width / 2);
      tmp = new Uint8Array(tmp);
      data.set(tmp, pos);
      pos += tmp.length;
      // console.log("u c%", "color: yellow", pos);
    }
    for (let i = 0; i < height / 2; i++) {
      let src = addr_v + i * stride_v;
      let tmp = HEAPU8.subarray(src, src + width / 2);
      tmp = new Uint8Array(tmp);
      data.set(tmp, pos);
      pos += tmp.length;
      // console.log("v c%", "color: green", pos);
    }
    var obj = {
      video: data,
      params: {
        yjm: totalSize / 1024,
        yjmM: totalSize / 1024 / 1024,
        dqcs: readerIndex,
        dqdx: decoder_chunk_size / 1024,
        jmhs: (new Date().getTime() - oldStamp) / 1000,
      },
      width,
      height,
    };

    postMessage(obj);
  });
  var LOG_LEVEL_WASM = 1;
  var decoder_type = 1;
  var ret = Module._openDecoder(decoder_type, videoCallback, LOG_LEVEL_WASM);
  if (ret == 0) {
    console.log("openDecoder success");
  } else {
    console.error("openDecoder failed with error", ret);
    return;
  }

  var readerIndex = 0;
  // 字节。这个值太小可能会导致播放出现花屏情况，需根据情况设置
  var CHUNK_SIZE = 1024 * 4 * 10;
  var i_stream_size = 0;
  var filePos = 0;
  var totalSize = 0;
  var pts = 0;
  var decoder_chunk_size = 0;
  do {
    var reader = new FileReader();
    // 本次解码耗时
    reader.onload = function () {
      var typedArray = new Uint8Array(this.result); //this.result 为 ArrayBuffer
      decoder_chunk_size = typedArray.length;
      var cacheBuffer = Module._malloc(decoder_chunk_size);
      Module.HEAPU8.set(typedArray, cacheBuffer);
      totalSize += decoder_chunk_size;
      let currentStamp = new Date().getTime();
      console.log(
        "[" + ++readerIndex + "] Read len = ",
        decoder_chunk_size + ", Total size = " + totalSize
      );
      Module._decodeData(cacheBuffer, decoder_chunk_size, pts++);
      if (cacheBuffer != null) {
        Module._free(cacheBuffer);
        cacheBuffer = null;
      }
      if (decoder_chunk_size < CHUNK_SIZE) {
        console.log("Flush frame data");
        Module._flushDecoder();
        Module._closeDecoder();
      }
    };
    i_stream_size = read_file_slice(reader, file, filePos, CHUNK_SIZE);
    // console.error(CHUNK_SIZE, i_stream_size);
    filePos += i_stream_size;
  } while (i_stream_size > 0);
}
//从地址 start_addr 开始读取 size 大小的数据
function read_file_slice(reader, file, start_addr, size) {
  var file_size = file.size;
  var file_slice;

  if (start_addr > file_size - 1) {
    return 0;
  } else if (start_addr + size > file_size - 1) {
    file_slice = blob_slice(file, start_addr, file_size);
    reader.readAsArrayBuffer(file_slice);
    return file_size - start_addr;
  } else {
    file_slice = blob_slice(file, start_addr, start_addr + size);
    reader.readAsArrayBuffer(file_slice);
    return size;
  }
}
function blob_slice(blob, start_addr, end_addr) {
  if (blob.slice) {
    return blob.slice(start_addr, end_addr);
  }
  // compatible firefox
  if (blob.mozSlice) {
    return blob.mozSlice(start_addr, end_addr);
  }
  // compatible webkit
  if (blob.webkitSlice) {
    return blob.webkitSlice(start_addr, end_addr);
  }
  return null;
}
