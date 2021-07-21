const resizeImg = require('resize-image-buffer');

const bufferToBase64 = photo => {
  return  `data:image/jpeg;base64,${Buffer.from(photo).toString('base64')}`;
}

const base64ToHex = photo => {
  return `0x${Buffer.from(item, 'base64').toString('hex')}`;
}

 const resizeImage = (image, width, height) => {
    return resizeImg(image, {
      width: width, 
      height: height,
    })
}




module.exports.bufferToBase64 = bufferToBase64;
module.exports.base64ToHex = base64ToHex;
module.exports.resizeImage = resizeImage;